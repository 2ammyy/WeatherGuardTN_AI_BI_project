import traceback
import os
from contextlib import asynccontextmanager

try:
    import mlflow
except ImportError:
    mlflow = None
    print('⚠️ mlflow not installed — MLflow features disabled')
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.database import engine, Base
import app.models.user
from app.models import User
from app.api.routes import router
from app.auth.google_auth import router as google_auth_router
from app.forum.routes import router as forum_router
from app.routers import news
from app.scraper.scheduler import run_all_scrapers, start_scheduler, stop_scheduler

from app.admin.config import setup_admin


MLFLOW_TRACKING_URI = os.getenv('MLFLOW_TRACKING_URI', 'http://mlflow:5000')
EXPERIMENT_NAME = 'WeatherGuardTN'

@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    print('🚀 Démarrage de WeatherGuardTN API...')
    try:
        Base.metadata.create_all(bind=engine)
        print('✅ Tables de la base de données initialisées.')
    except Exception as e:
        print(f'❌ Erreur lors de la création des tables : {e}')

    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        if 'notifications' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('notifications')]
            with engine.connect() as conn:
                from sqlalchemy import text
                # Add news_article_id column if missing
                if 'news_article_id' not in columns:
                    conn.execute(text("ALTER TABLE notifications ADD COLUMN news_article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE"))
                    conn.commit()
                    print('✅ Added news_article_id column to notifications table')
                # Fix check constraint to include 'news_update'
                try:
                    conn.execute(text("ALTER TABLE notifications DROP CONSTRAINT notifications_type_check"))
                    conn.commit()
                except Exception:
                    conn.rollback()
                try:
                    conn.execute(text(
                        "ALTER TABLE notifications ADD CONSTRAINT notifications_type_check "
                        "CHECK (type IN ('post_like','post_comment','post_share','post_approved','post_rejected',"
                        "'comment_like','new_follower','user_report_resolved','post_report_resolved','news_update'))"
                    ))
                    conn.commit()
                    print('✅ Updated notifications_type_check to include news_update')
                except Exception as e:
                    conn.rollback()
                    print(f'⚠️ Could not update notifications_type_check: {e}')
    except Exception as e:
        print(f'⚠️ Could not migrate notifications table: {e}')

    if mlflow is not None:
        try:
            mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
            experiment = mlflow.get_experiment_by_name(EXPERIMENT_NAME)
            if experiment is None:
                mlflow.create_experiment(EXPERIMENT_NAME)
            mlflow.set_experiment(EXPERIMENT_NAME)
            mlflow.search_experiments()
            print('✅ Connexion à MLflow établie')
        except Exception as e:
            print(f'⚠️ MLflow non connecté ou erreur : {e}')
    else:
        print('⚠️ MLflow module not available — skipping MLflow setup')

    # Start news scraper scheduler
    try:
        start_scheduler(interval_hours=6)
    except Exception as e:
        print(f'⚠️ Scheduler could not start: {e}')

    yield

    # Shutdown
    stop_scheduler()
    print('👋 Arrêt de WeatherGuardTN API...')

fastapi_app = FastAPI(
    title='WeatherGuardTN API',
    description='Early weather danger & vigilance prediction for Tunisia',
    version='1.0.0',
    lifespan=lifespan,
    docs_url='/docs',
    redoc_url='/redoc',
    openapi_url='/openapi.json'
)

CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173,http://localhost:80,http://frontend:80').split(',')

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r'https://.*\.onrender\.com',
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

fastapi_app.add_middleware(SessionMiddleware, secret_key=os.getenv('FORUM_SECRET_KEY', 'weatherguardtn-admin-secret-2026'))

setup_admin(fastapi_app)

@fastapi_app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(status_code=500, content={'detail': str(exc)})

fastapi_app.include_router(router, prefix='/api')
fastapi_app.include_router(google_auth_router, prefix='/api/auth', tags=['auth'])
fastapi_app.include_router(forum_router, prefix='/api/forum', tags=['forum'])
fastapi_app.include_router(news.router)

# Serve uploaded forum media
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'forum')
os.makedirs(UPLOAD_DIR, exist_ok=True)
fastapi_app.mount('/api/forum/uploads', StaticFiles(directory=UPLOAD_DIR), name='forum-uploads')

# Serve custom static files (admin CSS)
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
os.makedirs(STATIC_DIR, exist_ok=True)
fastapi_app.mount('/static', StaticFiles(directory=STATIC_DIR), name='static')

@fastapi_app.get('/')
def root():
    return {
        'message': 'WeatherGuardTN API is running',
        'version': '1.0.0',
        'status': 'healthy',
        'project': 'WeatherGuardTN'
    }

@fastapi_app.get('/health')
def health_check():
    return {'status': 'healthy', 'mlflow_connected': test_mlflow_connection()}

def test_mlflow_connection():
    if mlflow is None:
        return False
    try:
        mlflow.search_experiments()
        return True
    except:
        return False

app = fastapi_app
