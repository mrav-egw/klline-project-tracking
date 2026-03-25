# klline-project-tracking

So this project should look something like that

Browser
  └── React frontend (port 3000 dev / 8080 prod)
        └── axios → JWT auth header
              └── FastAPI backend (port 8000)
                    ├── PostgreSQL — main database
                    ├── MinIO — file storage (PDFs, photos)
                    └── Redis → Celery workers
                                ├── Celery worker — async tasks
                                └── Celery beat — scheduled tasks


it should be possible to run in k8s in openshift as well as local testing with docker compose

### Backend (FastAPI + Python)

**Entry point:** `backend/app/main.py` — registers all routers under `/api/`

| Layer | Location | Purpose |
|-------|----------|---------|
| Routers | `app/routers/` | HTTP endpoints, request validation |
| Services | `app/services/` | Business logic, no HTTP/DB imports |
| Models | `app/models/` | SQLAlchemy ORM models |
| Schemas | `app/schemas/` | Pydantic request/response types |
| Tasks | `app/tasks/` | Celery async + scheduled tasks |

**Database:** PostgreSQL via SQLAlchemy 2.x. Run migrations with `alembic upgrade head`.

**Auth:** JWT tokens (OAuth2 password flow). All endpoints require `Authorization: Bearer <token>` except `/api/auth/login`.

**File storage:** MinIO (S3-compatible). PDFs and photos are stored as objects, served via pre-signed URLs



There is an excel (sales report kline) in this repositry. this excel we basically want to transfer into the web app.

so basically you have projects/customers. in this projects you have several products you order with a order date, when it was payed and stuff like that. basically alls the things that are in projektdetails. 

Then all this data comes into a vertriebsbericht. where at the end we want to see the how profitable it is.

then with lieferanten and monteure those are just some infopages we want in the webapp