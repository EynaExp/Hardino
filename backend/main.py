from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db
from app.core.models import User
from app.core.auth import hash_password
from app.api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB and seed admin user
    await init_db()
    from app.core.database import async_session
    from sqlalchemy import select
    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        if not result.scalar_one_or_none():
            admin = User(
                username="admin",
                email="admin@hardino.local",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)
            await db.commit()
    yield


app = FastAPI(
    title="Hardino",
    description="AI-Powered Device Hardening Assessment Platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "healthy"}
