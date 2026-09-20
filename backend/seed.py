"""Load the bundled demo dataset into the database.

Usage:
    python seed.py [--replace]
"""
import json
import sys
from pathlib import Path

from sqlmodel import Session

from app.database import engine, init_db
from app.main import _run_import
from app.schemas import ImportPayload

DATA = Path(__file__).resolve().parent / "seed_data.json"


def main() -> None:
    init_db()
    payload = ImportPayload.model_validate(json.loads(DATA.read_text(encoding="utf-8")))
    payload.replace = "--replace" in sys.argv
    with Session(engine) as session:
        result = _run_import(session, payload)
    print(
        f"Imported {result.cases_imported} cases, {result.entities_imported} entities, "
        f"{result.relationships_imported} relationships."
    )


if __name__ == "__main__":
    main()
