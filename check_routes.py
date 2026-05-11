from app.main import fastapi_app
print(f"Total routes: {len(fastapi_app.routes)}")
for r in fastapi_app.routes:
    if hasattr(r, "path") and "superset" in r.path.lower():
        print(f"  {r.path} {getattr(r, 'methods', '')}")
