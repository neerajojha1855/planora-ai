# Planora AI — Event Planning Engine

Planora AI is an event-planning assistant designed to generate structured celebration blueprints for weddings, birthdays, and community gatherings. Built with React 19, FastAPI, Neon Serverless PostgreSQL, and Google Gemini 2.5 Flash, the application coordinates budget estimation, scheduling milestones, vendor checklists, and personalized conceptual ideas into a single interactive workspace.

---

## 1. Overview and Problem Statement

Event planning requires balancing budgetary limits, scheduling constraints, vendor dependencies, and host preferences. Manual planning often leads to fragmented spreadsheets, miscommunicated timelines, and unexpected cost overruns.

Planora AI automates this process through structured generation:
* **Domain Input Validation**: Captures event type, date, location, guest count, budget in INR, priorities, and style aesthetic.
* **Coordinated Generation**: Produces a unified plan across four synchronized sections: budget allocation with variance tracking, chronological milestones, categorized vendor checklists, and personalized concepts.
* **Persistent In-Place Refinement**: Hosts can update milestone states, track actual expenses against estimates, and regenerate specific sections without overwriting manual edits elsewhere in the plan.
* **Cloud Persistence**: All plans, user profiles, and active sessions are stored in Neon PostgreSQL with cross-user data isolation.

---

## 2. Technical Stack

| Layer | Technologies | Responsibilities |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Anime.js | Single-page application, interactive dashboards, accessible controls, and live synchronization indicators. |
| **Backend API** | FastAPI, Pydantic v2, Python 3.12 | REST API endpoints, transport contract validation, sliding-window rate limiting, and session security. |
| **Database** | Neon Serverless PostgreSQL, SQLAlchemy 2.0 (async), Alembic | Relational data persistence, JSONB plan storage, schema migrations, and connection pooling. |
| **AI Provider** | Google Gemini 2.5 Flash (`google-genai`), Mock Adapter | Structured JSON output parsing, system prompt versioning, and deterministic mock fallback. |
| **Infrastructure & CI** | GitHub Actions, Vercel | Automated multi-job CI (linting, build, containerized PostgreSQL tests) and serverless deployment. |

---

## 3. Security and Resilience

* **Authentication**: Password hashing using Argon2id. Sessions utilize high-entropy opaque tokens stored as SHA-256 digests in PostgreSQL.
* **Cookie Policy**: HTTP-only, SameSite=Lax cookies with automatic secure flag enforcement in production environments.
* **Access Control**: Strict user ownership validation on all plan endpoints. Unowned plan queries return HTTP 404 rather than HTTP 403 to prevent resource enumeration.
* **Abuse Controls**: Sliding-window rate limiting on authentication routes (maximum 10 requests per minute per IP address).
* **Payload Boundaries**: Request body size enforced at 2MB maximum with HTTP 413 responses for oversized payloads.
* **Security Headers**: Middleware enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
* **Accessibility**: Compliant with WCAG 2.1 AA standards, including ARIA tablist/tab roles, ARIA live regions for sync status, accessible checkbox semantics, and support for `prefers-reduced-motion`.

---

## 4. Local Development Setup

### Prerequisites
* Node.js >= 20.x
* Python >= 3.12
* PostgreSQL instance or Neon database connection URL
* Google Gemini API Key (optional; deterministic mock planner is used if unset)

### Backend Installation
```bash
cd backend
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows:
.\.venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
# Configure DATABASE_URL and GEMINI_API_KEY in .env

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

### Frontend Installation
```sh
cd frontend
npm install
npm run dev
```

### Verification and Quality Checks
```sh
# Backend test execution
cd backend
python -m pytest -v

# Frontend linking and typecheck
cd frontend
npm run lint
npm run build
```
