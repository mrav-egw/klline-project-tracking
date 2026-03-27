from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal, Base, engine
from app.routers import auth, cost_entries, customers, installers, projects, reports, suppliers, users
from app.services.auth import ensure_admin_user
from app.seed import seed_db

# Columns added after initial DB creation — applied with IF NOT EXISTS so they're safe to run every startup
_COLUMN_MIGRATIONS = [
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS name VARCHAR",
    "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS order_number INTEGER",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        # Create any missing tables
        await conn.run_sync(Base.metadata.create_all)
        # Apply column additions that create_all won't handle on existing tables
        for stmt in _COLUMN_MIGRATIONS:
            await conn.execute(text(stmt))
    async with AsyncSessionLocal() as db:
        await ensure_admin_user(db)
        await seed_db(db)
    yield


app = FastAPI(title="Klline Project Tracking", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [auth.router, users.router, customers.router, projects.router, suppliers.router,
               installers.router, cost_entries.router, reports.router]:
    app.include_router(router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
