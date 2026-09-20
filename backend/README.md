# CrimeNet AI — FastAPI backend

SQLite-backed API for cases, entities and relationships.

## Run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Docs: http://127.0.0.1:8000/docs

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/cases` | List all cases (frontend `CaseRecord` shape) |
| POST | `/cases` | Create a case; entities are extracted and linked |
| GET | `/cases/{case_id}` | Full case file |
| DELETE | `/cases/{case_id}` | Remove a case |
| GET/POST | `/entities`, `/entities/{id}` | Entity register |
| GET/POST | `/relationships` | Edges between entities |
| GET | `/graph` | Nodes + edges for the network graph |
| GET | `/stats` | Dashboard counters |
| POST | `/import` | Bulk JSON import (`{cases, entities, relationships, replace}`) |
| POST | `/import/file?kind=cases\|entities\|relationships&replace=` | CSV or JSON file upload |

Risk scores are computed server-side when not supplied.

## Seed with the demo dataset

```bash
python seed.py            # add demo cases/entities
python seed.py --replace  # wipe first
```
