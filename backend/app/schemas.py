"""Request/response schemas. The API speaks camelCase to match the frontend."""
from datetime import date as date_type
from typing import Any, Optional

from pydantic import BaseModel, Field


def _camel(s: str) -> str:
    head, *rest = s.split("_")
    return head + "".join(w.capitalize() for w in rest)


class CamelModel(BaseModel):
    model_config = {"alias_generator": _camel, "populate_by_name": True}


class Transaction(CamelModel):
    id: str
    from_: str = Field(alias="from")
    to: str
    amount: str
    date: str = ""
    flag: str = ""

    model_config = {"populate_by_name": True}


class Insight(CamelModel):
    title: str
    description: str = ""
    confidence: int = 70
    risk: str = "Medium"


class CaseCreate(CamelModel):
    id: Optional[str] = None
    title: str
    crime_type: str = "Unclassified"
    location: str = ""
    date: Optional[date_type] = None
    status: str = "Open"
    risk_score: Optional[int] = None
    description: str = ""
    entities: list[str] = []
    persons: list[str] = []
    locations: list[str] = []
    transactions: list[dict[str, Any]] = []
    insights: list[Insight] = []


class CaseRead(CamelModel):
    id: str
    title: str
    crime_type: str
    location: str
    date: str
    status: str
    risk_score: int
    description: str
    entities: list[str]
    persons: list[str]
    locations: list[str]
    transactions: list[dict[str, Any]]
    insights: list[dict[str, Any]]


class EntityCreate(CamelModel):
    id: Optional[str] = None
    name: str
    type: str = "Person"
    risk_score: Optional[int] = None
    aliases: list[str] = []
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    notes: str = ""
    suspicious_activities: list[str] = []
    risk_factors: list[dict[str, Any]] = []
    cases: list[str] = []


class EntityRead(CamelModel):
    id: str
    name: str
    type: str
    risk_score: int
    aliases: list[str]
    first_seen: Optional[str]
    last_seen: Optional[str]
    notes: str
    suspicious_activities: list[str]
    risk_factors: list[dict[str, Any]]
    cases: list[str]
    connections: int
    relationships: list[dict[str, Any]]


class RelationshipCreate(CamelModel):
    source_id: str
    target_id: str
    type: str = "ASSOCIATED_WITH"
    detail: str = ""
    weight: float = 1.0
    case_id: Optional[str] = None


class ImportPayload(CamelModel):
    cases: list[CaseCreate] = []
    entities: list[EntityCreate] = []
    relationships: list[RelationshipCreate] = []
    replace: bool = False


class ImportResult(CamelModel):
    cases_imported: int = 0
    entities_imported: int = 0
    relationships_imported: int = 0
    skipped: list[str] = []


class EvidenceRead(CamelModel):
    id: int
    case_id: str
    filename: str
    content_type: str
    size: int
    kind: str
    description: str
    uploaded_by: str
    uploaded_at: str
    download_url: str
