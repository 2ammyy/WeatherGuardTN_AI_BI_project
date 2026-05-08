import os

# Use SQLite for Superset metadata (simple, no extra DB needed)
SQLALCHEMY_DATABASE_URI = "sqlite:////app/superset_home/superset.db"

SECRET_KEY = os.getenv("SUPERSET_SECRET_KEY", "weatherguard-superset-secret-key-2026")

FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
}

HTTP_HEADERS = {"X-Frame-Options": "ALLOWALL"}

BABEL_DEFAULT_LOCALE = "en"

# WeatherGuardTN database connection for data exploration
EXTRA_DATABASE_CONNECTIONS = [
    {
        "database_name": "WeatherGuardTN (PostgreSQL)",
        "sqlalchemy_uri": "postgresql://weatheruser:weatherpass@db:5432/weatherguard",
    }
]

ROW_LIMIT = 5000
SUPERSET_WORKERS = 4
