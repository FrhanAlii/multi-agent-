# SmartB AI

**OutreachAI** is an enterprise-grade, multi-agent business process automation platform. It combines a conversational AI interface with an intelligent backend that orchestrates specialized agents to handle document intake, compliance checking, data extraction, and automated outreach workflows — with human-in-the-loop approval gates at every critical step.

---

## Overview

Modern business operations involve repetitive, high-stakes workflows: reviewing documents, verifying compliance, extracting structured data, and executing outreach. OutreachAI automates this end-to-end using a graph-based multi-agent architecture, while keeping humans in control of decisions that matter.

The platform consists of two main layers:

- **Frontend** — A React/TypeScript dashboard with a conversational chat interface, workflow tracking, team management, analytics, and document history.
- **Backend** — A FastAPI server powered by LangChain and LangGraph that runs a pipeline of specialized AI agents with a dual RAG (Retrieval-Augmented Generation) knowledge system.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                     │
│  Dashboard · Chat · Workflows · Analytics · Team     │
└────────────────────────┬────────────────────────────┘
                         │ REST / JSON
┌────────────────────────▼────────────────────────────┐
│                  FastAPI Backend                     │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │           LangGraph Agent Pipeline           │   │
│  │                                              │   │
│  │  Document Intake → Data Extraction           │   │
│  │       → Process Decision → Compliance        │   │
│  │       → [Human Approval Gate]                │   │
│  │       → Execution → Outreach                 │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────┐   ┌──────────────────────┐     │
│  │  Dual RAG Engine │   │  Workflow & Approval  │     │
│  │  Universal KB +  │   │  Management Engine   │     │
│  │  Client ChromaDB │   │                      │     │
│  └─────────────────┘   └──────────────────────┘     │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  SQLite / PostgreSQL  ·  Alembic Migrations  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Key Features

- **Multi-Agent Pipeline** — A LangGraph state machine with six specialized agents: document intake, data extraction, process decision, compliance checking, execution, and outreach generation.
- **Dual RAG System** — Two parallel retrieval layers: a universal knowledge base for general business processes and a per-client ChromaDB index for client-specific context.
- **Human-in-the-Loop Approvals** — Configurable approval gates that pause execution when confidence is low, compliance fails, or escalation is required.
- **Document Processing** — Supports PDF, DOCX, and spreadsheet ingestion with validation, deduplication, quality scoring, and structured storage.
- **Compliance Checking** — Automated policy and regulatory compliance verification before any workflow execution.
- **Conversational Interface** — Natural language chat with full session history, powered by GPT-4o-mini via LangChain.
- **Analytics & Audit Trail** — Structured logging of every agent decision, approval event, and workflow state transition.

---

## Tech Stack

### Frontend
| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| UI components | shadcn/ui + Tailwind CSS |
| Auth & DB client | Supabase |

### Backend
| Layer | Technology |
|-------|------------|
| API server | FastAPI + Uvicorn |
| Agent framework | LangGraph + LangChain |
| LLM provider | OpenAI (GPT-4o-mini) |
| Vector store | ChromaDB |
| Embeddings | sentence-transformers (`all-MiniLM-L6-v2`) |
| Database | SQLite (dev) / PostgreSQL (prod) + SQLAlchemy |
| Migrations | Alembic |
| Auth | JWT (python-jose) |
| Document parsing | pdfplumber, docx2txt, openpyxl |
| Logging | structlog |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- An OpenAI API key

### 1. Clone the repository

```bash
git clone https://github.com/FrhanAlii/multi-agent-.git
cd multi-agent-
```

### 2. Start the backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Open .env and set your OPENAI_API_KEY and any other values

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

### 3. Start the frontend

```bash
# From the project root
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.  
All `/api/*` requests are proxied to the backend automatically.

---

## Backend API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Service health check |
| `POST` | `/api/chat` | Send a message to the AI agent |
| `POST` | `/api/documents/upload` | Upload a document for processing |
| `GET` | `/api/documents` | List processed documents |
| `GET` | `/api/workflows` | List active workflows |
| `POST` | `/api/workflows/{id}/approve` | Approve a pending workflow step |
| `POST` | `/api/workflows/{id}/reject` | Reject a pending workflow step |
| `GET` | `/api/rag/query` | Query the RAG knowledge base |

Full schema available at `/docs` (Swagger UI) or `/redoc`.

---

## Project Structure

```
.
├── src/                        # React frontend
│   ├── components/             # Reusable UI components
│   ├── pages/                  # Route-level pages
│   ├── hooks/                  # Custom React hooks (useChat, etc.)
│   └── contexts/               # React context providers
│
└── backend/                    # FastAPI backend
    ├── agents/                 # LangGraph agent nodes
    ├── api/                    # FastAPI route handlers
    ├── chains/                 # LangChain chains (email, etc.)
    ├── database/               # SQLAlchemy models, queries, migrations
    ├── document_handling/      # Upload, validation, deduplication
    ├── rag/                    # Dual RAG system (universal + client)
    ├── services/               # Business logic layer
    ├── tools/                  # LangChain tools
    ├── workflows/              # Workflow engine and approval manager
    ├── utils/                  # Config, logging, validators
    ├── tests/                  # Pytest test suite
    └── main.py                 # Application entry point
```

---

## Environment Variables

Create a `backend/.env` file with the following:

```env
# LLM
OPENAI_API_KEY=your-openai-api-key
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.1

# Database
DATABASE_URL=sqlite+aiosqlite:///./outreachai.db

# JWT
JWT_SECRET_KEY=your-long-random-secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# RAG
CHROMA_PERSIST_DIR=./rag/universal_kb/chroma_db
CHROMA_CLIENT_BASE_DIR=./rag/client_chroma
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Document storage
DOCUMENT_STORAGE_DIR=./storage/documents
MAX_FILE_SIZE_MB=50

# API server
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
```

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## License

This project is proprietary software. All rights reserved.
