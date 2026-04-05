from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import mlflow
import os
from .api.routes import router
from .auth.google_auth import router as google_auth_router

MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
EXPERIMENT_NAME = "WeatherGuardTN"

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀 Démarrage de WeatherGuardTN API...")
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    experiment = mlflow.get_experiment_by_name(EXPERIMENT_NAME)
    if experiment is None:
        mlflow.create_experiment(EXPERIMENT_NAME)
    mlflow.set_experiment(EXPERIMENT_NAME)
    try:
        mlflow.search_experiments()
        print("✅ Connexion à MLflow établie")
    except Exception as e:
        print(f"⚠️  MLflow non connecté: {e}")
    yield
    print("👋 Arrêt de WeatherGuardTN API...")

app = FastAPI(
    title="WeatherGuardTN API",
    description="Early weather danger & vigilance prediction for Tunisia",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:80",
    "http://frontend:80",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router, prefix="/api")
app.include_router(google_auth_router, prefix="/api/auth", tags=["auth"])

@app.get("/")
def root():
    return {"message": "WeatherGuardTN API is running", "version": "1.0.0", "status": "healthy"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "mlflow_connected": test_mlflow_connection()}

def test_mlflow_connection():
    try:
        mlflow.search_experiments()
        return True
    except:
        return False