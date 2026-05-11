import os

SQLALCHEMY_DATABASE_URI = "postgresql://weatheruser:weatherpass@climate-db:5432/weatherguard"

SECRET_KEY = os.getenv("SUPERSET_SECRET_KEY", "weatherguard-superset-secret-key-2026")

FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
}

# Guest token role — must have at least can_read on Dashboard
# Gamma is the standard read-only role in Superset
GUEST_ROLE_NAME = "Alpha"

# Disable Talisman security headers to allow iframe embedding
TALISMAN_ENABLED = False

# Use CSP instead of X-Frame-Options for modern browsers
CONTENT_SECURITY_POLICY = "frame-ancestors 'self' http://localhost:8001 http://localhost:3000 http://127.0.0.1:8001"

# CORS config for embedding
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "origins": ["http://localhost:8001", "http://localhost:3000", "http://127.0.0.1:8001", "http://localhost:8088"],
}

# Session config
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_HTTPONLY = True

ROW_LIMIT = 5000
SUPERSET_WORKERS = 4



WTF_CSRF_ENABLED = False

WTF_CSRF_CHECK_DEFAULT = False

