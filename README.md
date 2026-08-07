# AI Financial Operations Agent - Monorepo

Welcome to the **AI Financial Operations (FinOps) Agent** platform, a hackathon-winning, production-ready, enterprise-grade Operations Console.

The system automates customer support inquiries, transaction investigations, fraud audits, and KYC workflows using a stateful **LangGraph** multi-agent workflow. The application features **Human-in-the-Loop (HITL) double authorization holds** to secure high-risk actions (such as refunds exceeding ₹10,000, account locks, or freezes).

---

## 1. System Features
* **Stateful Multi-Agent Reasoning (LangGraph)**: Coordination between Support, Payments, Fraud, and Workflow agents.
* **Human-in-the-Loop Intercepts**: Blocks and routes risky proposed actions to the Manager Approval Queue, pausing state graphs until authorized.
* **Vector RAG Ingestion (ChromaDB)**: Feeds corporate policy manuals (Refund parameters, KYC guidelines, internal SOPs) to ground AI decisions.
* **Async Workers (Celery & Redis)**: Handles background jobs including document OCR parses, incoming email intakes, and compiling case file PDF reports.
* **Hifi Visual Dashboard**: React, Next.js, Framer Motion animations, Recharts, and sleek custom glassmorphic cards.
* **Audit Trail Tracking**: Stores detailed confidence scores, inputs, execution steps, and AI logs in an immutable ledger.

---

## 2. Monorepo Directory Layout
* `/frontend`: NextJS dashboard, Framer Motion transitions, and Recharts reports.
* `/backend`: FastAPI service, LangGraph definitions, database models, and mock system APIs.
* `/docs`: Architecture specs, ER database layouts, and API spec summaries.
* `/docker`: Dockerfiles for development containers.
* `/scripts`: Python tools to seed database profiles and ingest vector policies.

---

## 3. Quick Launch Guide

Ensure Docker and Docker Compose are installed on your environment. In the root directory, run:

```bash
docker-compose up --build
```

This single command boots the entire stack:
* **Frontend Web Service**: `http://localhost:3000`
* **FastAPI Backend Swagger Docs**: `http://localhost:8000/docs`
* **PostgreSQL Database**: Port `5432`
* **Redis Message Cache**: Port `6379`
* **Celery Background Worker Daemon**: Active inside container

Upon startup, backend containers automatically run `scripts/load_policies.py` and `scripts/seed_db.py` to ingest 4 corporate policies and seed the database with **500 customers, 1,000 transactions, 300 support tickets, 150 fraud cases, and 50 approvals**.

---

## 4. Test Credentials & Dev Shortcuts

The dashboard login screen provides quick shortcut buttons to fill in credentials for testing roles:

| Role | Username | Password | Access Level |
|---|---|---|---|
| **Analyst** | `analyst@finops.com` | `analyst123` | Read support tickets, view audit logs, trigger OCR. |
| **Manager** | `manager@finops.com` | `manager123` | Authorize/decline holds, process refunds, resolve fraud cases. |
| **Admin** | `admin@finops.com` | `admin123` | Root read/write configurations. |

---

## 5. Verification Test Suite

To run automated unit tests:
1. Initialize a virtual environment inside `/backend` and install dependencies.
2. Execute the Pytest suite:
   ```bash
   pytest backend/tests/
   ```
   This validates HTTP routes, route guard exclusions, and heuristic NLP parser rules.
