"""Database models for cases, entities and relationships."""
from datetime import datetime, date as date_type
from typing import Any, Optional

from sqlalchemy import Column, JSON, UniqueConstraint
from sqlmodel import Field, SQLModel


class CaseEntityLink(SQLModel, table=True):
    __tablename__ = "case_entity_link"
    case_id: str = Field(foreign_key="cases.id", primary_key=True)
    entity_id: str = Field(foreign_key="entities.id", primary_key=True)
    role: Optional[str] = None


class Case(SQLModel, table=True):
    __tablename__ = "cases"

    id: str = Field(primary_key=True)
    title: str
    crime_type: str = "Unclassified"
    location: str = ""
    date: date_type = Field(default_factory=date_type.today)
    status: str = "Open"
    risk_score: int = 0
    description: str = ""
    transactions: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    insights: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Entity(SQLModel, table=True):
    __tablename__ = "entities"

    id: str = Field(primary_key=True)
    name: str = Field(index=True)
    type: str = "Person"
    risk_score: int = 0
    aliases: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    notes: str = ""
    suspicious_activities: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    risk_factors: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Relationship(SQLModel, table=True):
    __tablename__ = "relationships"
    __table_args__ = (UniqueConstraint("source_id", "target_id", "type", name="uq_relationship"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: str = Field(index=True)
    target_id: str = Field(index=True)
    type: str = "ASSOCIATED_WITH"
    detail: str = ""
    weight: float = 1.0
    case_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Evidence(SQLModel, table=True):
    """A document or file uploaded against a case."""

    __tablename__ = "evidence"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(index=True, foreign_key="cases.id")
    filename: str
    stored_name: str
    content_type: str = "application/octet-stream"
    size: int = 0
    kind: str = "Document"
    description: str = ""
    uploaded_by: str = "Investigator"
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
