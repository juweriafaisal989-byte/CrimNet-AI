"""CrimeNet AI FastAPI backend — cases, entities, relationships and data import."""
from __future__ import annotations

import mimetypes
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlmodel import Session, delete, select

from . import analytics as analytics_models
from .database import get_session, init_db
from .models import Case, CaseEntityLink, Entity, Evidence, Relationship
from .schemas import (
    CaseCreate,
    EntityCreate,
    ImportPayload,
    ImportResult,
    RelationshipCreate,
)
from .services import (
    case_to_read,
    create_case,
    create_relationship,
    entity_to_read,
    parse_upload,
    recompute_all_risk,
    recompute_entity_risk,
    upsert_entity,
)

app = FastAPI(title="CrimeNet AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


def evidence_to_read(item: Evidence) -> dict:
    return {
        "id": item.id,
        "caseId": item.case_id,
        "filename": item.filename,
        "contentType": item.content_type,
        "size": item.size,
        "kind": item.kind,
        "description": item.description,
        "uploadedBy": item.uploaded_by,
        "uploadedAt": item.uploaded_at.isoformat(),
        "downloadUrl": f"/evidence/{item.id}/download",
    }


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------- cases
@app.get("/cases")
def list_cases(session: Session = Depends(get_session)):
    cases = session.exec(select(Case).order_by(Case.date.desc())).all()
    return [case_to_read(session, c) for c in cases]


@app.post("/cases", status_code=201)
def post_case(payload: CaseCreate, session: Session = Depends(get_session)):
    case = create_case(session, payload)
    session.commit()
    session.refresh(case)
    return case_to_read(session, case)


@app.get("/cases/{case_id}")
def get_case(case_id: str, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return case_to_read(session, case)


@app.delete("/cases/{case_id}", status_code=204)
def delete_case(case_id: str, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    session.exec(delete(CaseEntityLink).where(CaseEntityLink.case_id == case_id))
    session.delete(case)
    session.commit()


# ------------------------------------------------------------- entities
@app.get("/entities")
def list_entities(session: Session = Depends(get_session)):
    entities = session.exec(select(Entity).order_by(Entity.risk_score.desc())).all()
    return [entity_to_read(session, e) for e in entities]


@app.post("/entities", status_code=201)
def post_entity(payload: EntityCreate, session: Session = Depends(get_session)):
    entity = upsert_entity(session, payload)
    if payload.risk_score is None:
        recompute_entity_risk(session, entity)
    session.commit()
    session.refresh(entity)
    return entity_to_read(session, entity)


@app.get("/entities/{entity_id}")
def get_entity(entity_id: str, session: Session = Depends(get_session)):
    entity = session.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
    return entity_to_read(session, entity)


# -------------------------------------------------------- relationships
@app.get("/relationships")
def list_relationships(session: Session = Depends(get_session)):
    return session.exec(select(Relationship)).all()


@app.post("/relationships", status_code=201)
def post_relationship(payload: RelationshipCreate, session: Session = Depends(get_session)):
    rel = create_relationship(session, payload)
    for entity_id in (payload.source_id, payload.target_id):
        entity = session.get(Entity, entity_id)
        if entity:
            recompute_entity_risk(session, entity)
    session.commit()
    session.refresh(rel)
    return rel


# ---------------------------------------------------------------- graph
@app.get("/graph")
def graph(session: Session = Depends(get_session)):
    entities = session.exec(select(Entity)).all()
    rels = session.exec(select(Relationship)).all()
    links = session.exec(select(CaseEntityLink)).all()
    cases_by_entity: dict[str, list[str]] = {}
    for link in links:
        cases_by_entity.setdefault(link.entity_id, []).append(link.case_id)
    return {
        "nodes": [
            {
                "id": e.id,
                "label": e.name,
                "type": e.type,
                "riskScore": e.risk_score,
                "cases": cases_by_entity.get(e.id, []),
                "detail": e.notes or f"{e.type} resolved from {len(cases_by_entity.get(e.id, []))} case(s).",
            }
            for e in entities
        ],
        "edges": [
            {"source": r.source_id, "target": r.target_id, "type": r.type, "detail": r.detail}
            for r in rels
        ],
    }


@app.get("/stats")
def stats(session: Session = Depends(get_session)):
    cases = session.exec(select(Case)).all()
    entities = session.exec(select(Entity)).all()
    rels = session.exec(select(Relationship)).all()
    high_risk = len([c for c in cases if c.risk_score > 80])
    return {
        "cases": len(cases),
        "entities": len(entities),
        "relationships": len(rels),
        "highRiskCases": high_risk,
        "openCases": len([c for c in cases if c.status != "Closed"]),
    }


# ------------------------------------------------------------ analytics
@app.get("/analytics/risk-scores")
def risk_scores(session: Session = Depends(get_session)):
    entities = session.exec(select(Entity).order_by(Entity.risk_score.desc())).all()
    return [entity_to_read(session, e) for e in entities]


@app.get("/analytics/anomalies")
def anomalies(session: Session = Depends(get_session)):
    return analytics_models.detect_anomalies(session)


@app.get("/analytics/centrality")
def centrality(session: Session = Depends(get_session)):
    return analytics_models.compute_centrality(session)


@app.get("/analytics/hidden-connections")
def hidden_links(session: Session = Depends(get_session)):
    return analytics_models.hidden_connections(session)


@app.get("/analytics/overview")
def analytics_overview(session: Session = Depends(get_session)):
    return analytics_models.overview(session)


@app.post("/analytics/recompute")
def recompute(session: Session = Depends(get_session)):
    count = recompute_all_risk(session)
    session.commit()
    return {"entitiesRescored": count}


# --------------------------------------------------------------- import
def _run_import(session: Session, payload: ImportPayload) -> ImportResult:
    result = ImportResult()
    if payload.replace:
        session.exec(delete(CaseEntityLink))
        session.exec(delete(Relationship))
        session.exec(delete(Case))
        session.exec(delete(Entity))
        session.flush()

    for case in payload.cases:
        if not case.title:
            result.skipped.append("Case row missing a title")
            continue
        create_case(session, case)
        result.cases_imported += 1

    for entity in payload.entities:
        if not entity.name:
            result.skipped.append("Entity row missing a name")
            continue
        upsert_entity(session, entity)
        result.entities_imported += 1

    for rel in payload.relationships:
        if not rel.source_id or not rel.target_id:
            result.skipped.append("Relationship row missing source or target")
            continue
        create_relationship(session, rel)
        result.relationships_imported += 1

    recompute_all_risk(session)
    session.commit()
    return result


@app.post("/import")
def import_json(payload: ImportPayload, session: Session = Depends(get_session)) -> ImportResult:
    return _run_import(session, payload)


@app.post("/import/file")
async def import_file(
    file: UploadFile = File(...),
    kind: str = Query("cases", pattern="^(cases|entities|relationships)$"),
    replace: bool = Query(False),
    session: Session = Depends(get_session),
) -> ImportResult:
    raw = (await file.read()).decode("utf-8-sig", errors="replace")
    try:
        rows = parse_upload(raw, kind)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Could not parse {file.filename}: {exc}") from exc

    payload = ImportPayload(replace=replace)
    if kind == "cases":
        payload.cases = [CaseCreate.model_validate(r) for r in rows]
    elif kind == "entities":
        payload.entities = [EntityCreate.model_validate(r) for r in rows]
    else:
        payload.relationships = [RelationshipCreate.model_validate(r) for r in rows]
    return _run_import(session, payload)


# -------------------------------------------------------------- evidence
@app.get("/evidence")
def list_all_evidence(session: Session = Depends(get_session)):
    items = session.exec(select(Evidence).order_by(Evidence.uploaded_at.desc())).all()
    return [evidence_to_read(i) for i in items]


@app.get("/cases/{case_id}/evidence")
def list_case_evidence(case_id: str, session: Session = Depends(get_session)):
    items = session.exec(
        select(Evidence).where(Evidence.case_id == case_id).order_by(Evidence.uploaded_at.desc())
    ).all()
    return [evidence_to_read(i) for i in items]


@app.post("/cases/{case_id}/evidence", status_code=201)
async def upload_evidence(
    case_id: str,
    file: UploadFile = File(...),
    description: str = Form(""),
    kind: str = Form("Document"),
    uploaded_by: str = Form("Investigator"),
    session: Session = Depends(get_session),
):
    case = session.get(Case, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(raw) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds the 25MB limit")

    original = file.filename or "evidence.bin"
    suffix = Path(original).suffix
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    (UPLOAD_DIR / stored_name).write_bytes(raw)

    item = Evidence(
        case_id=case_id,
        filename=original,
        stored_name=stored_name,
        content_type=file.content_type or mimetypes.guess_type(original)[0] or "application/octet-stream",
        size=len(raw),
        kind=kind or "Document",
        description=description,
        uploaded_by=uploaded_by or "Investigator",
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return evidence_to_read(item)


@app.get("/evidence/{evidence_id}/download")
def download_evidence(evidence_id: int, session: Session = Depends(get_session)):
    item = session.get(Evidence, evidence_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Evidence not found")
    path = UPLOAD_DIR / item.stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing on disk")
    return FileResponse(path, media_type=item.content_type, filename=item.filename)


@app.delete("/evidence/{evidence_id}", status_code=204)
def delete_evidence(evidence_id: int, session: Session = Depends(get_session)):
    item = session.get(Evidence, evidence_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Evidence not found")
    path = UPLOAD_DIR / item.stored_name
    if path.exists():
        path.unlink()
    session.delete(item)
    session.commit()
