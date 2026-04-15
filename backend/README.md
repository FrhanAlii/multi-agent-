# OutreachAI — Backend

Python backend for OutreachAI, built with **FastAPI**, **LangChain**, and **LangGraph**.

## Structure

```
backend/
├── agents/                 # LangGraph agent nodes
│   ├── orchestrator.py     # State machine graph definition
│   ├── document_intake_agent.py
│   ├── data_extraction_agent.py
│   ├── process_decision_agent.py
│   ├── compliance_checker_agent.py
│   ├── execution_agent.py
│   └── outreach_agent.py
├── api/                    # FastAPI route handlers
├── chains/                 # LangChain chains (email generation, etc.)
├── database/               # SQLAlchemy models, session, Alembic migrations
├── document_handling/      # Upload processing, validation, deduplication
├── rag/                    # Dual RAG (universal KB + client-specific ChromaDB)
├── services/               # Business logic layer
├── tools/                  # LangChain tools
├── workflows/              # Workflow engine and approval manager
├── utils/                  # Config, logging, validators
├── tests/                  # Pytest test suite
├── requirements.txt
└── main.py
```

## Setup

```bash
# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in your OPENAI_API_KEY and other values
```

## Running the server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Running tests

```bash
pytest tests/ -v
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/chat` | Send a message to the AI agent |
| `POST` | `/api/documents/upload` | Upload a document |
| `GET` | `/api/documents` | List documents |
| `GET` | `/api/workflows` | List workflows |
| `POST` | `/api/workflows/{id}/approve` | Approve a workflow step |
| `POST` | `/api/workflows/{id}/reject` | Reject a workflow step |
| `GET` | `/api/rag/query` | Query the knowledge base |
