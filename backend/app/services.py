"""Case/entity persistence helpers, simple risk scoring and CSV parsing."""
from __future__ import annotations

import csv
import io
import json
import re
from datetime import date as date_type
from typing import Any

from sqlmodel import Session, select

from .models import Case, CaseEntityLink, Entity, Evidence, Relationship
from .schemas import CaseCreate, EntityCreate, RelationshipCreate

RISK_KEYWORDS = {
    "hawala": 25, "launder": 25, "narcotic": 25, "trafficking": 30, "terror": 35,
    "shell": 15, "forged": 15, "fraud": 15, "smuggl": 20, "extortion": 20,
    "cyber": 10, "theft": 10, "ransom": 20, "weapon": 25,
}

ENTITY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Phone Number", re.compile(r"\+?\d{1,3}[-\s]?\d{4,5}[-\s]?\d{5,6}")),
    ("Bank Account", re.compile(r"\bAC-\d{6,}\b")),
    ("Vehicle", re.compile(r"\b[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}\b")),
]


def slugify_case_id(session: Session, proposed: str | None) -> str:
    if proposed:
        return proposed
    count = len(session.exec(select(Case)).all())
    candidate = f"CN-{3000 + count + 1}"
    while session.get(Case, candidate):
        count += 1
        candidate = f"CN-{3000 + count + 1}"
    return candidate


def entity_id_for(name: str) -> str:
    return "ENT-" + re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")[:48]


def guess_entity_type(value: str) -> str:
    for kind, pattern in ENTITY_PATTERNS:
        if pattern.fullmatch(value.strip()) or pattern.search(value.strip()):
            return kind
    lowered = value.lower()
    if any(w in lowered for w in ("pvt", "ltd", "llp", "inc", "garage", "traders", "exim")):
        return "Organization"
    if any(w in lowered for w in ("road", "street", "sector", "nagar", "beach", "area", ",")):
        return "Location"
    return "Person"


def score_case(payload: CaseCreate) -> int:
    text = f"{payload.title} {payload.description} {payload.crime_type}".lower()
    score = 25
    for keyword, weight in RISK_KEYWORDS.items():
        if keyword in text:
            score += weight
    score += min(len(payload.entities) * 3, 20)
    score += min(len(payload.transactions) * 4, 20)
    return max(1, min(99, score))


def score_entity(payload: EntityCreate, connections: int = 0) -> int:
    text = f"{payload.name} {payload.notes}".lower()
    score = 20 + min(connections * 6, 30) + min(len(payload.suspicious_activities) * 8, 24)
    for keyword, weight in RISK_KEYWORDS.items():
        if keyword in text:
            score += weight
    return max(1, min(99, score))


def upsert_entity(session: Session, payload: EntityCreate) -> Entity:
    entity_id = payload.id or entity_id_for(payload.name)
    entity = session.get(Entity, entity_id)
    if entity is None:
        entity = Entity(id=entity_id, name=payload.name)
        session.add(entity)
    entity.name = payload.name or entity.name
    entity.type = payload.type or guess_entity_type(payload.name)
    entity.aliases = payload.aliases or entity.aliases
    entity.first_seen = payload.first_seen or entity.first_seen
    entity.last_seen = payload.last_seen or entity.last_seen
    entity.notes = payload.notes or entity.notes
    entity.suspicious_activities = payload.suspicious_activities or entity.suspicious_activities
    entity.risk_factors = payload.risk_factors or entity.risk_factors
    entity.risk_score = payload.risk_score if payload.risk_score is not None else score_entity(payload)
    session.flush()
    for case_id in payload.cases:
        link_case_entity(session, case_id, entity.id)
    return entity


def link_case_entity(session: Session, case_id: str, entity_id: str, role: str | None = None) -> None:
    existing = session.get(CaseEntityLink, (case_id, entity_id))
    if existing is None:
        session.add(CaseEntityLink(case_id=case_id, entity_id=entity_id, role=role))


# ------------------------------------------------- entity resolution + graph
def resolve_entity(session: Session, name: str, kind: str | None = None) -> Entity | None:
    """Find an existing entity by id, exact name or alias before creating a new one."""
    cleaned = (name or "").strip()
    if not cleaned:
        return None
    direct = session.get(Entity, cleaned) or session.get(Entity, entity_id_for(cleaned))
    if direct:
        return direct
    by_name = session.exec(select(Entity).where(Entity.name == cleaned)).first()
    if by_name:
        return by_name
    lowered = cleaned.lower()
    for candidate in session.exec(select(Entity)).all():
        aliases = [a.lower() for a in (candidate.aliases or [])]
        if lowered in aliases:
            return candidate
    return upsert_entity(session, EntityCreate(name=cleaned, type=kind or guess_entity_type(cleaned)))


def relation_between(a: Entity, b: Entity) -> tuple[str, str]:
    """Infer the relationship type and a human readable detail for two entities."""
    types = {a.type, b.type}
    if "Location" in types:
        return "LOCATED_AT", f"{a.name} and {b.name} appear at the same location in a shared case"
    if "Phone Number" in types:
        return "CALLED", f"Communication link between {a.name} and {b.name}"
    if "Bank Account" in types:
        return "TRANSFERRED_MONEY_TO", f"Financial link between {a.name} and {b.name}"
    if "Organization" in types:
        return "INVOLVED_IN", f"{a.name} is connected to {b.name} through a case"
    if a.type == "Person" and b.type == "Person":
        return "KNOWS", f"{a.name} and {b.name} co-occur in the same case"
    return "ASSOCIATED_WITH", f"{a.name} is associated with {b.name}"


MAX_AUTO_LINKS = 60


def build_case_graph(session: Session, case: Case, entities: list[Entity]) -> int:
    """Create relationship edges between every entity resolved from one case."""
    created = 0
    for i, a in enumerate(entities):
        for b in entities[i + 1 :]:
            if a.id == b.id or created >= MAX_AUTO_LINKS:
                continue
            rel_type, detail = relation_between(a, b)
            create_relationship(
                session,
                RelationshipCreate(
                    source_id=a.id,
                    target_id=b.id,
                    type=rel_type,
                    detail=f"{detail} ({case.id})",
                    case_id=case.id,
                ),
            )
            created += 1

    for txn in case.transactions or []:
        src = resolve_entity(session, str(txn.get("from") or txn.get("from_") or ""))
        dst = resolve_entity(session, str(txn.get("to") or ""))
        if not src or not dst or src.id == dst.id:
            continue
        link_case_entity(session, case.id, src.id)
        link_case_entity(session, case.id, dst.id)
        create_relationship(
            session,
            RelationshipCreate(
                source_id=src.id,
                target_id=dst.id,
                type="TRANSFERRED_MONEY_TO",
                detail=f"{txn.get('amount', '')} {txn.get('flag', '')}".strip() or f"Transfer in {case.id}",
                case_id=case.id,
            ),
        )
        created += 1
    session.flush()
    return created


def connection_count(session: Session, entity_id: str) -> int:
    return len(
        session.exec(
            select(Relationship).where(
                (Relationship.source_id == entity_id) | (Relationship.target_id == entity_id)
            )
        ).all()
    )


def recompute_entity_risk(session: Session, entity: Entity) -> Entity:
    """Recalculate an explainable risk score from graph position and case load."""
    connections = connection_count(session, entity.id)
    cases = session.exec(
        select(CaseEntityLink).where(CaseEntityLink.entity_id == entity.id)
    ).all()
    case_scores = [c.risk_score for c in (session.get(Case, l.case_id) for l in cases) if c]
    network_weight = min(connections * 6, 30)
    case_weight = min(len(cases) * 8, 24)
    activity_weight = min(len(entity.suspicious_activities or []) * 6, 18)
    severity_weight = int(max(case_scores) * 0.3) if case_scores else 0
    keyword_weight = 0
    text = f"{entity.name} {entity.notes}".lower()
    for keyword, weight in RISK_KEYWORDS.items():
        if keyword in text:
            keyword_weight += weight

    score = 15 + network_weight + case_weight + activity_weight + severity_weight + keyword_weight
    entity.risk_score = max(1, min(99, score))
    entity.risk_factors = [
        f for f in [
            {"factor": "Network centrality", "weight": network_weight,
             "detail": f"Linked to {connections} other entities in the network graph."},
            {"factor": "Case involvement", "weight": case_weight,
             "detail": f"Appears in {len(cases)} investigated case(s)."},
            {"factor": "Case severity", "weight": severity_weight,
             "detail": f"Highest linked case risk score is {max(case_scores) if case_scores else 0}."},
            {"factor": "Suspicious activity", "weight": activity_weight,
             "detail": f"{len(entity.suspicious_activities or [])} flagged behaviour(s) on record."},
            {"factor": "Criminal keyword signals", "weight": keyword_weight,
             "detail": "Risk keywords detected in the entity profile."},
        ] if f["weight"] > 0
    ]
    session.flush()
    return entity


def recompute_all_risk(session: Session) -> int:
    entities = session.exec(select(Entity)).all()
    for entity in entities:
        recompute_entity_risk(session, entity)
    return len(entities)


def create_case(session: Session, payload: CaseCreate) -> Case:
    case_id = slugify_case_id(session, payload.id)
    case = session.get(Case, case_id)
    if case is None:
        case = Case(id=case_id, title=payload.title)
        session.add(case)
    case.title = payload.title
    case.crime_type = payload.crime_type
    case.location = payload.location
    case.date = payload.date or date_type.today()
    case.status = payload.status
    case.description = payload.description
    case.transactions = payload.transactions
    case.insights = [i.model_dump(by_alias=False) for i in payload.insights]
    case.risk_score = payload.risk_score if payload.risk_score is not None else score_case(payload)
    session.flush()

    names = list(dict.fromkeys([*payload.entities, *payload.persons, *payload.locations]))
    if payload.location and payload.location not in names:
        names.append(payload.location)
    person_set = set(payload.persons)
    location_set = set(payload.locations) | ({payload.location} if payload.location else set())
    linked: list[Entity] = []
    for name in names:
        if not name.strip():
            continue
        kind = "Person" if name in person_set else "Location" if name in location_set else guess_entity_type(name)
        entity = resolve_entity(session, name, kind)
        if entity is None:
            continue
        link_case_entity(session, case.id, entity.id, role=kind)
        linked.append(entity)

    build_case_graph(session, case, linked)
    for entity in linked:
        recompute_entity_risk(session, entity)
    return case


def create_relationship(session: Session, payload: RelationshipCreate) -> Relationship:
    existing = session.exec(
        select(Relationship).where(
            Relationship.source_id == payload.source_id,
            Relationship.target_id == payload.target_id,
            Relationship.type == payload.type,
        )
    ).first()
    if existing:
        existing.detail = payload.detail or existing.detail
        existing.weight = payload.weight
        return existing
    rel = Relationship(**payload.model_dump())
    session.add(rel)
    session.flush()
    return rel



def case_to_read(session: Session, case: Case) -> dict[str, Any]:
    links = session.exec(select(CaseEntityLink).where(CaseEntityLink.case_id == case.id)).all()
    entities = [session.get(Entity, link.entity_id) for link in links]
    entities = [e for e in entities if e]
    return {
        "id": case.id,
        "title": case.title,
        "crimeType": case.crime_type,
        "location": case.location,
        "date": case.date.isoformat() if hasattr(case.date, "isoformat") else str(case.date),
        "status": case.status,
        "riskScore": case.risk_score,
        "description": case.description,
        "entities": [e.name for e in entities],
        "persons": [e.name for e in entities if e.type == "Person"],
        "locations": [e.name for e in entities if e.type == "Location"],
        "transactions": case.transactions or [],
        "insights": case.insights or [],
        "evidence": [
            {
                "id": ev.id,
                "caseId": ev.case_id,
                "filename": ev.filename,
                "contentType": ev.content_type,
                "size": ev.size,
                "kind": ev.kind,
                "description": ev.description,
                "uploadedBy": ev.uploaded_by,
                "uploadedAt": ev.uploaded_at.isoformat(),
                "downloadUrl": f"/evidence/{ev.id}/download",
            }
            for ev in session.exec(
                select(Evidence).where(Evidence.case_id == case.id)
            ).all()
        ],
    }


def entity_to_read(session: Session, entity: Entity) -> dict[str, Any]:
    links = session.exec(select(CaseEntityLink).where(CaseEntityLink.entity_id == entity.id)).all()
    rels = session.exec(
        select(Relationship).where(
            (Relationship.source_id == entity.id) | (Relationship.target_id == entity.id)
        )
    ).all()
    relationships = []
    for rel in rels:
        other_id = rel.target_id if rel.source_id == entity.id else rel.source_id
        other = session.get(Entity, other_id)
        relationships.append(
            {"target": other.name if other else other_id, "type": rel.type, "detail": rel.detail}
        )
    return {
        "id": entity.id,
        "name": entity.name,
        "type": entity.type,
        "riskScore": entity.risk_score,
        "aliases": entity.aliases or [],
        "firstSeen": entity.first_seen,
        "lastSeen": entity.last_seen,
        "notes": entity.notes,
        "suspiciousActivities": entity.suspicious_activities or [],
        "riskFactors": entity.risk_factors or [],
        "cases": [link.case_id for link in links],
        "connections": len(rels),
        "relationships": relationships,
    }


def _split(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in re.split(r"[;|]", value) if part.strip()]


def parse_csv(text: str, kind: str) -> list[dict[str, Any]]:
    """Parse a CSV export of cases, entities or relationships into API payloads."""
    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict[str, Any]] = []
    for raw in reader:
        row = { (k or "").strip(): (v.strip() if isinstance(v, str) else v) for k, v in raw.items() }
        if kind == "cases":
            rows.append({
                "id": row.get("id") or None,
                "title": row.get("title", ""),
                "crimeType": row.get("crimeType") or row.get("crime_type", "Unclassified"),
                "location": row.get("location", ""),
                "date": row.get("date") or None,
                "status": row.get("status") or "Open",
                "riskScore": int(row["riskScore"]) if row.get("riskScore") else None,
                "description": row.get("description", ""),
                "entities": _split(row.get("entities")),
                "persons": _split(row.get("persons")),
                "locations": _split(row.get("locations")),
            })
        elif kind == "entities":
            rows.append({
                "id": row.get("id") or None,
                "name": row.get("name", ""),
                "type": row.get("type") or guess_entity_type(row.get("name", "")),
                "riskScore": int(row["riskScore"]) if row.get("riskScore") else None,
                "aliases": _split(row.get("aliases")),
                "firstSeen": row.get("firstSeen") or None,
                "lastSeen": row.get("lastSeen") or None,
                "notes": row.get("notes", ""),
                "suspiciousActivities": _split(row.get("suspiciousActivities")),
                "cases": _split(row.get("cases")),
            })
        else:
            rows.append({
                "sourceId": row.get("sourceId") or row.get("source", ""),
                "targetId": row.get("targetId") or row.get("target", ""),
                "type": row.get("type") or "ASSOCIATED_WITH",
                "detail": row.get("detail", ""),
                "caseId": row.get("caseId") or None,
            })
    return rows


def parse_upload(text: str, kind: str) -> list[dict[str, Any]]:
    stripped = text.strip()
    if stripped.startswith("[") or stripped.startswith("{"):
        data = json.loads(stripped)
        if isinstance(data, dict):
            data = data.get(kind, [])
        return list(data)
    return parse_csv(stripped, kind)
