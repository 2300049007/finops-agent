import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.db.session import engine, Base
from backend.app.api.router import router as api_router

# Create Database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise AI Operations Agent for Financial Operations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
# Allow frontend to query FastAPI backend directly
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files mapping (for generated reports)
static_dir = "/app/static"
os.makedirs(static_dir, exist_ok=True)
os.makedirs(os.path.join(static_dir, "reports"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Map API endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "api_documentation": "/docs"
    }
