"""Real graph-analytics models: centrality, anomaly detection and pattern mining.

Everything here runs over the live SQLite data (cases, entities, relationships)
so the frontend charts are computed, never hard-coded.
"""
from __future__ import annotations

import statistics
from collections import Counter, defaultdict, deque
from datetime import date as date_type, timedelta
from typing import Any

from sqlmodel import Session, select

from .models import Case, CaseEntityLink, Entity, Relationship


# --------------------------------------------------------------- graph build
def build_adjacency(rels: list[Relationship]) -> dict[str, set[str]]:
    adj: dict[str, set[str]] = defaultdict(set)
    for rel in rels:
        if rel.source_id == rel.target_id:
            continue
        adj[rel.source_id].add(rel.target_id)
        adj[rel.target_id].add(rel.source_id)
    return adj


def pagerank(adj: dict[str, set[str]], damping: float = 0.85, iterations: int = 40) -> dict[str, float]:
    nodes = list(adj.keys())
    if not nodes:
        return {}
    n = len(nodes)
    rank = {node: 1.0 / n for node in nodes}
    for _ in range(iterations):
        new_rank = {node: (1 - damping) / n for node in nodes}
        for node in nodes:
            neighbours = adj[node]
            if not neighbours:
                # dangling node: spread evenly
                share = damping * rank[node] / n
                for other in nodes:
                    new_rank[other] += share
                continue
            share = damping * rank[node] / len(neighbours)
            for neighbour in neighbours:
                new_rank[neighbour] = new_rank.get(neighbour, 0.0) + share
        rank = new_rank
    total = sum(rank.values()) or 1.0
    return {k: v / total for k, v in rank.items()}


def betweenness_centrality(adj: dict[str, set[str]]) -> dict[str, float]:
    """Brandes' algorithm for unweighted graphs, normalised to 0..1."""
    nodes = list(adj.keys())
    centrality = {node: 0.0 for node in nodes}
    for source in nodes:
        stack: list[str] = []
        preds: dict[str, list[str]] = {node: [] for node in nodes}
        sigma = {node: 0.0 for node in nodes}
        dist = {node: -1 for node in nodes}
        sigma[source] = 1.0
        dist[source] = 0
        queue = deque([source])
        while queue:
            v = queue.popleft()
            stack.append(v)
            for w in adj[v]:
                if dist[w] < 0:
                    dist[w] = dist[v] + 1
                    queue.append(w)
                if dist[w] == dist[v] + 1:
                    sigma[w] += sigma[v]
                    preds[w].append(v)
        delta = {node: 0.0 for node in nodes}
        while stack:
            w = stack.pop()
            for v in preds[w]:
                if sigma[w]:
                    delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
            if w != source:
                centrality[w] += delta[w]

    n = len(nodes)
    if n > 2:
        scale = 1.0 / ((n - 1) * (n - 2))
        centrality = {k: v * scale for k, v in centrality.items()}
    return centrality


def compute_centrality(session: Session, limit: int = 10) -> list[dict[str, Any]]:
    entities = {e.id: e for e in session.exec(select(Entity)).all()}
    rels = session.exec(select(Relationship)).all()
    adj = build_adjacency(rels)
    for entity_id in entities:
        adj.setdefault(entity_id, set())

    pr = pagerank(adj)
    bc = betweenness_centrality(adj)

    rows = []
    for entity_id, neighbours in adj.items():
        entity = entities.get(entity_id)
        if entity is None:
            continue
        rows.append({
            "id": entity_id,
            "name": entity.name,
            "type": entity.type,
            "degree": len(neighbours),
            "betweenness": round(bc.get(entity_id, 0.0), 4),
            "pagerank": round(pr.get(entity_id, 0.0), 4),
            "riskScore": entity.risk_score,
        })
    rows.sort(key=lambda r: (r["pagerank"], r["degree"]), reverse=True)
    return rows[:limit]


# ------------------------------------------------------------ risk helpers
def risk_level(score: float) -> str:
    if score > 80:
        return "Critical"
    if score > 60:
        return "High"
    if score > 30:
        return "Medium"
    return "Low"


def _zscores(values: dict[str, float]) -> dict[str, float]:
    if len(values) < 2:
        return {k: 0.0 for k in values}
    nums = list(values.values())
    mean = statistics.fmean(nums)
    stdev = statistics.pstdev(nums) or 1.0
    return {k: (v - mean) / stdev for k, v in values.items()}


# -------------------------------------------------------- anomaly detection
def detect_anomalies(session: Session) -> list[dict[str, Any]]:
    """Statistical outlier detection over degree, money flow and case load."""
    entities = {e.id: e for e in session.exec(select(Entity)).all()}
    rels = session.exec(select(Relationship)).all()
    links = session.exec(select(CaseEntityLink)).all()
    if not entities:
        return []

    adj = build_adjacency(rels)
    degree = {eid: float(len(adj.get(eid, ()))) for eid in entities}
    money = defaultdict(float)
    calls = defaultdict(float)
    for rel in rels:
        if rel.type == "TRANSFERRED_MONEY_TO":
            money[rel.source_id] += 1
            money[rel.target_id] += 1
        if rel.type == "CALLED":
            calls[rel.source_id] += 1
            calls[rel.target_id] += 1
    case_load = Counter(link.entity_id for link in links)

    z_degree = _zscores(degree)
    z_money = _zscores({eid: money.get(eid, 0.0) for eid in entities})
    bc = betweenness_centrality({**{k: set() for k in entities}, **adj})

    out: list[dict[str, Any]] = []
    for eid, entity in entities.items():
        deg_z = z_degree.get(eid, 0.0)
        mon_z = z_money.get(eid, 0.0)

        if deg_z >= 1.8:
            out.append({
                "title": f"Network hub outlier: {entity.name}",
                "description": (
                    f"{int(degree[eid])} direct links — {deg_z:.1f}σ above the network mean. "
                    "Structurally consistent with a coordinator role."
                ),
                "confidence": min(97, int(60 + deg_z * 12)),
                "risk": "Critical" if deg_z >= 3 else "High",
                "entity": entity.name,
                "metric": "degree",
                "zScore": round(deg_z, 2),
            })

        if mon_z >= 1.8 and money.get(eid):
            out.append({
                "title": f"Transaction velocity outlier: {entity.name}",
                "description": (
                    f"{int(money[eid])} money-movement edges, {mon_z:.1f}σ over baseline — "
                    "layering / fan-in signature."
                ),
                "confidence": min(96, int(62 + mon_z * 11)),
                "risk": "Critical" if mon_z >= 3 else "High",
                "entity": entity.name,
                "metric": "money_flow",
                "zScore": round(mon_z, 2),
            })

        if bc.get(eid, 0.0) > 0.08 and degree.get(eid, 0) >= 2:
            out.append({
                "title": f"Broker position detected: {entity.name}",
                "description": (
                    f"Betweenness {bc[eid]:.3f} — removing {entity.name} would cut shortest paths "
                    "between otherwise separate clusters."
                ),
                "confidence": min(94, int(65 + bc[eid] * 150)),
                "risk": "High",
                "entity": entity.name,
                "metric": "betweenness",
                "zScore": round(bc[eid], 3),
            })

        if case_load.get(eid, 0) >= 3:
            out.append({
                "title": f"Cross-case recurrence: {entity.name}",
                "description": f"Appears in {case_load[eid]} separate investigations — repeat-offender pattern.",
                "confidence": min(93, 62 + case_load[eid] * 6),
                "risk": "High" if case_load[eid] >= 4 else "Medium",
                "entity": entity.name,
                "metric": "case_load",
                "zScore": float(case_load[eid]),
            })

        if calls.get(eid, 0) >= 4:
            out.append({
                "title": f"Communication burst: {entity.name}",
                "description": f"{int(calls[eid])} communication links concentrated on one identifier.",
                "confidence": min(90, 60 + int(calls[eid]) * 4),
                "risk": "Medium",
                "entity": entity.name,
                "metric": "calls",
                "zScore": round(calls[eid], 2),
            })

    out.sort(key=lambda a: (a["confidence"], a["zScore"]), reverse=True)
    return out[:24]


# ------------------------------------------------------ hidden connections
def hidden_connections(session: Session, limit: int = 8) -> list[dict[str, Any]]:
    """Two-hop links: entity pairs with shared neighbours but no direct edge."""
    entities = {e.id: e for e in session.exec(select(Entity)).all()}
    rels = session.exec(select(Relationship)).all()
    adj = build_adjacency(rels)
    direct = {frozenset((r.source_id, r.target_id)) for r in rels}

    scored: list[tuple[int, dict[str, Any]]] = []
    ids = list(adj.keys())
    for i, a in enumerate(ids):
        for b in ids[i + 1 :]:
            if frozenset((a, b)) in direct:
                continue
            shared = adj[a] & adj[b]
            if not shared:
                continue
            ent_a, ent_b = entities.get(a), entities.get(b)
            if not ent_a or not ent_b:
                continue
            bridges = [entities[s].name for s in list(shared)[:3] if s in entities]
            confidence = min(95, 55 + len(shared) * 9)
            scored.append((
                len(shared) * 100 + max(ent_a.risk_score, ent_b.risk_score),
                {
                    "title": f"{ent_a.name} ↔ {ent_b.name} ({len(shared)}-bridge indirect link)",
                    "description": (
                        f"No direct relationship, but both connect through {', '.join(bridges)}. "
                        f"Combined risk {ent_a.risk_score}/{ent_b.risk_score}."
                    ),
                    "confidence": confidence,
                    "risk": risk_level(max(ent_a.risk_score, ent_b.risk_score)),
                },
            ))
    scored.sort(key=lambda s: s[0], reverse=True)
    return [row for _, row in scored[:limit]]


# --------------------------------------------------- suspicious activity
def suspicious_activity(session: Session, limit: int = 8) -> list[dict[str, Any]]:
    cases = session.exec(select(Case)).all()
    entities = {e.id: e for e in session.exec(select(Entity)).all()}
    rels = session.exec(select(Relationship)).all()
    out: list[dict[str, Any]] = []

    money_by_case: dict[str, int] = Counter(r.case_id for r in rels if r.type == "TRANSFERRED_MONEY_TO" and r.case_id)
    for case in cases:
        txns = case.transactions or []
        flagged = [t for t in txns if str(t.get("flag", "")).strip()]
        if flagged:
            out.append({
                "title": f"Flagged transactions in {case.id}",
                "description": (
                    f"{len(flagged)} of {len(txns)} transactions in “{case.title}” carry analyst flags "
                    f"({', '.join({str(t.get('flag')) for t in flagged[:3]})})."
                ),
                "confidence": min(96, 68 + len(flagged) * 6),
                "risk": risk_level(case.risk_score),
            })
        elif money_by_case.get(case.id, 0) >= 3:
            out.append({
                "title": f"Layered money movement in {case.id}",
                "description": f"{money_by_case[case.id]} money-movement edges reconstructed from “{case.title}”.",
                "confidence": min(92, 64 + money_by_case[case.id] * 5),
                "risk": risk_level(case.risk_score),
            })

    for entity in entities.values():
        for activity in (entity.suspicious_activities or [])[:2]:
            out.append({
                "title": f"{entity.name}: {activity}",
                "description": f"Behavioural flag recorded on a {entity.type} with risk score {entity.risk_score}.",
                "confidence": min(94, 60 + entity.risk_score // 3),
                "risk": risk_level(entity.risk_score),
            })

    out.sort(key=lambda i: i["confidence"], reverse=True)
    return out[:limit]


# ------------------------------------------------------- pattern analysis
def crime_patterns(session: Session, limit: int = 6) -> list[dict[str, Any]]:
    cases = session.exec(select(Case)).all()
    if not cases:
        return []
    out: list[dict[str, Any]] = []

    by_type = Counter(c.crime_type for c in cases)
    by_location = Counter(c.location for c in cases if c.location)
    total = len(cases)

    for crime_type, count in by_type.most_common(3):
        scores = [c.risk_score for c in cases if c.crime_type == crime_type]
        out.append({
            "title": f"{crime_type} concentration",
            "description": (
                f"{count} of {total} cases ({count * 100 // total}%) are {crime_type}, "
                f"average risk {int(statistics.fmean(scores))}."
            ),
            "confidence": min(95, 60 + count * 100 // total),
            "risk": risk_level(max(scores)),
        })

    for location, count in by_location.most_common(2):
        if count < 2:
            continue
        out.append({
            "title": f"Geographic cluster: {location}",
            "description": f"{count} investigations registered at {location} — repeat-location hotspot.",
            "confidence": min(92, 58 + count * 8),
            "risk": "High" if count >= 3 else "Medium",
        })

    open_cases = [c for c in cases if c.status != "Closed" and c.risk_score > 70]
    if open_cases:
        out.append({
            "title": "High-risk open backlog",
            "description": f"{len(open_cases)} open case(s) score above 70 and remain unresolved.",
            "confidence": 84,
            "risk": "High",
        })
    return out[:limit]


def monthly_activity(session: Session, months: int = 6) -> list[dict[str, Any]]:
    cases = session.exec(select(Case)).all()
    links = session.exec(select(CaseEntityLink)).all()
    entities_per_case = Counter(link.case_id for link in links)
    today = date_type.today()

    buckets: list[tuple[int, int, str]] = []
    year, month = today.year, today.month
    for _ in range(months):
        buckets.append((year, month, date_type(year, month, 1).strftime("%b")))
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    buckets.reverse()

    out = []
    for year, month, label in buckets:
        month_cases = [c for c in cases if c.date and c.date.year == year and c.date.month == month]
        alerts = sum(entities_per_case.get(c.id, 0) for c in month_cases)
        out.append({"month": label, "cases": len(month_cases), "alerts": alerts})
    return out


def anomaly_timeline(session: Session, days: int = 14) -> list[dict[str, Any]]:
    """Daily anomaly pressure: mean risk of cases registered each day vs rolling baseline."""
    cases = session.exec(select(Case)).all()
    today = date_type.today()
    all_scores = [c.risk_score for c in cases] or [0]
    baseline = int(statistics.fmean(all_scores))

    out = []
    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        day_cases = [c for c in cases if c.date == day]
        score = int(statistics.fmean([c.risk_score for c in day_cases])) if day_cases else 0
        out.append({
            "day": day.strftime("%d %b"),
            "score": score,
            "baseline": baseline,
            "cases": len(day_cases),
        })
    return out


def overview(session: Session) -> dict[str, Any]:
    anomaly_list = detect_anomalies(session)
    centrality = compute_centrality(session)
    confidences = [a["confidence"] for a in anomaly_list] or [0]
    hidden = hidden_connections(session)
    suspicious = suspicious_activity(session)
    patterns = crime_patterns(session)
    return {
        "centrality": centrality,
        "anomalies": anomaly_list,
        "hiddenConnections": hidden,
        "suspiciousActivity": suspicious,
        "crimePatterns": patterns,
        "monthlyActivity": monthly_activity(session),
        "anomalyTimeline": anomaly_timeline(session),
        "summary": {
            "insights": len(anomaly_list) + len(hidden) + len(suspicious) + len(patterns),
            "anomalies": len(anomaly_list),
            "criticalAnomalies": len([a for a in anomaly_list if a["risk"] == "Critical"]),
            "hiddenLinks": len(hidden),
            "avgConfidence": int(statistics.fmean(confidences)),
            "modelsActive": 5,
        },
    }
