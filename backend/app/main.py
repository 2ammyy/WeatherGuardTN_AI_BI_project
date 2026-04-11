import traceback
import os
from contextlib import asynccontextmanager

import mlflow
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import engine, Base
import app.models.user
from app.models import User
from app.api.routes import router
from app.auth.google_auth import router as google_auth_router

from app.forum.routes import router as forum_router

MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
EXPERIMENT_NAME = "WeatherGuardTN"

@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    print("🚀 Démarrage de WeatherGuardTN API...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables de la base de données initialisées.")
    except Exception as e:
        print(f"❌ Erreur lors de la création des tables : {e}")

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    try:
        experiment = mlflow.get_experiment_by_name(EXPERIMENT_NAME)
        if experiment is None:
            mlflow.create_experiment(EXPERIMENT_NAME)
        mlflow.set_experiment(EXPERIMENT_NAME)
        mlflow.search_experiments()
        print("✅ Connexion à MLflow établie")
    except Exception as e:
        print(f"⚠️ MLflow non connecté ou erreur : {e}")

    yield
    print("👋 Arrêt de WeatherGuardTN API...")

# ✅ Use a different variable name to avoid conflict with the `app` package folder
fastapi_app = FastAPI(
    title="WeatherGuardTN API",
    description="Early weather danger & vigilance prediction for Tunisia",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

class COOPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        return response

fastapi_app.add_middleware(COOPMiddleware)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:80",
        "http://frontend:80",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@fastapi_app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()  # prints full error to docker logs
    return JSONResponse(status_code=500, content={"detail": str(exc)})

fastapi_app.include_router(router, prefix="/api")
fastapi_app.include_router(google_auth_router, prefix="/api/auth", tags=["auth"])

@fastapi_app.get("/")
def root():
    return {
        "message": "WeatherGuardTN API is running",
        "version": "1.0.0",
        "status": "healthy",
        "project": "WeatherGuardTN"
    }

@fastapi_app.get("/health")
def health_check():
    return {"status": "healthy", "mlflow_connected": test_mlflow_connection()}

def test_mlflow_connection():
    try:
        mlflow.search_experiments()
        return True
    except:
        return False

# ✅ Keep `app` as an alias so uvicorn can still find it (uvicorn runs `app.main:app`)
app = fastapi_app

app.include_router(forum_router, prefix="/api/forum", tags=["forum"])
