import asyncio
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import Base, engine
from app.api import (
    auth,
    violations,
    cameras,
    dashboard,
    reports,
    websockets,
    uploads
)
from app.services.notifications import manager, redis_notification_listener

# Automatically create tables if not exists
# (In production Docker, we run init.sql as well, but this makes it robust)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Error creating database tables on startup: {e}")

app = FastAPI(
    title="Smoke Emission Monitoring System API",
    description="Backend API for managing smoke violations, alerts, and report analytics",
    version="1.0.0"
)

# CORS Configuration
# Allow local dev environment and production containers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Mount Static Files for serving evidence (crops and videos)
app.mount("/evidence", StaticFiles(directory=settings.UPLOAD_DIR), name="evidence")

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(violations.router, prefix="/api")
app.include_router(cameras.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(websockets.router)  # Mounted at root for ws://host:port/ws

@app.on_event("startup")
async def startup_event():
    # Start Redis notification subscriber background task
    asyncio.create_task(redis_notification_listener(manager))
    print("FastAPI Backend started successfully.")

@app.get("/")
def index():
    return {"message": "Smoke Emission Monitoring System API is running."}
