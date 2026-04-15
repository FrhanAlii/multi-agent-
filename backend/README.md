# OutreachAI — Backend

Python backend powered by **LangChain**, **LangGraph**, and **FastAPI**.

## Structure

```
backend/
├── agents/           # LangGraph agent definitions
├── chains/           # LangChain chains (email generation, etc.)
├── tools/            # LangChain tools (search, enrichment, etc.)
├── api/              # FastAPI server
├── requirements.txt
└── .env.example
```

## Setup

```bash
# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in your keys
```

## Running the server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive API docs.

## Endpoints

| Method | Path      | Description              |
|--------|-----------|--------------------------|
| GET    | /health   | Health check             |
| POST   | /chat     | Send a message to the AI |
