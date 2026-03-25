# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web app that replaces the Excel-based `SALES REPORT KLLINE (1).xlsx` sales tracking workflow for Klline, an Austrian furniture/office-equipment reseller. UI language: German (Austria).

**Core domain concepts:**
- **Projekte/Kunden** — projects linked to customers, each containing SalesInvoices and PurchaseOrders
- **Deckungsbeitrag (DB)** — contribution margin = (sales + noch_zu_fakturieren) − purchases
- **Vertriebsbericht** — P&L report from CostEntries (REVENUE, PURCHASE, PAYROLL, OVERHEAD)
- **Lieferanten** — supplier master with product categories and commercial terms
- **Monteure_Lager** — installation partner directory with capabilities (install/deliver/store)

## Architecture

```
Browser
  └── React frontend (port 3000 dev / 8080 prod)
        └── axios → JWT Bearer token
              └── FastAPI backend (port 8000)
                    ├── PostgreSQL — main DB (SQLAlchemy 2.x async)
                    ├── MinIO — file storage (S3-compatible)
                    └── Redis → Celery workers
```

Runs via Docker Compose locally. k8s/kustomize for production/OpenShift.

## Development Commands

### Local with Docker Compose
```bash
docker compose up --build          # Start all services
docker compose up -d postgres redis minio  # Start only infra
```

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head               # Run migrations
uvicorn app.main:app --reload --port 8000

# Generate a new migration
alembic revision --autogenerate -m "description"
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev        # Dev server at http://localhost:3000 (proxies /api → :8000)
npm run build      # Production build
```

### Kubernetes (kustomize)
```bash
kubectl apply -k k8s/overlays/local        # Local k8s
kubectl apply -k k8s/overlays/production   # Production

# Update image tag in production
cd k8s/overlays/production
kustomize edit set image klline/backend=klline/backend:v1.2.3
```

## Backend Structure (`backend/app/`)

| Layer | Location | Purpose |
|-------|----------|---------|
| Entry | `main.py` | FastAPI app, CORS, router registration, startup admin user |
| Config | `config.py` | Pydantic Settings (env vars) |
| DB | `database.py` | Async SQLAlchemy engine + `get_db()` dependency |
| Auth | `deps.py` + `services/auth.py` | JWT, bcrypt, `get_current_user` dependency |
| Models | `models/` | SQLAlchemy ORM (User, Customer, Project, SalesInvoice, PurchaseOrder, Supplier, InstallationPartner, CostEntry) |
| Schemas | `schemas/` | Pydantic v2 request/response types |
| Routers | `routers/` | All CRUD endpoints under `/api/` |
| Services | `services/` | Business logic (reports, auth) |
| Tasks | `tasks/celery_app.py` | Celery + Redis beat |

**Auth:** JWT OAuth2 password flow. All endpoints require `Authorization: Bearer <token>` except `POST /api/auth/login`. Default credentials: `admin@klline.at` / `klline2025`.

**Migrations:** Alembic with async engine. `alembic/env.py` imports all models to populate `Base.metadata`.

**Contribution margin** is a Python `@property` on the `Project` model (not stored in DB) — load `sales_invoices` and `purchase_orders` with `selectinload` before accessing it.

## Frontend Structure (`frontend/src/`)

| Dir | Purpose |
|-----|---------|
| `api/` | Axios functions per resource (auth, projects, customers, suppliers, installers, costEntries, reports) |
| `store/auth.ts` | Zustand store — persists token + user to localStorage `klline-auth` |
| `types/index.ts` | All TypeScript interfaces mirroring backend schemas |
| `utils/format.ts` | `formatCurrency` (de-AT €), `formatDate` (de-AT), `formatPct` |
| `components/` | Layout (sidebar), Modal, StatusBadge, LoadingSpinner, ProtectedRoute |
| `pages/` | One file per route |

**API proxy:** Vite dev server proxies `/api` → `http://localhost:8000`. In production, nginx in the frontend container proxies `/api` → `http://backend:8000`.

## Key Data Model Notes

- All IDs are UUIDs (string in Python/TypeScript, generated server-side)
- All monetary values: `Decimal`/`Numeric(12,2)` in Python, `number` in TypeScript
- `Project.contribution_margin` = `(total_sales + total_still_to_invoice) − total_purchases`
- `CostCategory` enum: `REVENUE | PURCHASE | PAYROLL | OVERHEAD`
- `Vertriebsbericht` profit = `revenue_net − purchase_cost_net − other_costs`
- `PurchaseOrder.supplier_id` is nullable (FK to Supplier); `supplier_name_free` is a free-text fallback for unmatched suppliers
