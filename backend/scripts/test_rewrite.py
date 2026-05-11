"""Test the static asset URL rewrite logic from inside the container."""
import os, requests as req

SUPERSET_BASE = os.getenv("SUPERSET_BASE", "http://superset:8088")
print("SUPERSET_BASE:", SUPERSET_BASE)

sess = req.Session()
r = sess.post(
    f"{SUPERSET_BASE}/api/v1/security/login",
    json={"username": "admin", "password": "admin123", "provider": "db", "refresh": True},
    timeout=10,
)
r.raise_for_status()
access_token = r.json()["access_token"]
sess.headers.update({"Authorization": f"Bearer {access_token}"})

r2 = sess.get(f"{SUPERSET_BASE}/api/v1/security/csrf_token", timeout=10)
r2.raise_for_status()
sess.headers.update({"X-CSRFToken": r2.json()["result"]})

resp = sess.get(f"{SUPERSET_BASE}/explore/?slice_id=14&standalone=3", timeout=15)
text = resp.content.decode("utf-8", errors="replace")

before_count = text.count("/static/")
print("Before rewrite - /static/ occurrences:", before_count)

superset_origin = SUPERSET_BASE.replace("://superset", "://localhost")
superset_origin = superset_origin.rstrip("/")
print("Rewriting to origin:", superset_origin)

text2 = text.replace('"/static/', f'"{superset_origin}/static/')
text2 = text2.replace("'/static/", f"'{superset_origin}/static/")
text2 = text2.replace("=static/", f"={superset_origin}/static/")
text2 = text2.replace("url(/static/", f"url({superset_origin}/static/")

after_count = text2.count(superset_origin + "/static/")
print("After rewrite - rewritten occurrences:", after_count)
print("First 3 rewritten URLs:")
idx = 0
for _ in range(3):
    idx = text2.find(superset_origin, idx)
    if idx == -1:
        break
    print(f"  [{_}] {text2[idx:idx+100]}")
    idx += 1

# Also count any remaining unrewritten /static/ paths
remaining = text2.count(f"/static/")
print("Remaining unrewritten /static/:", remaining)
