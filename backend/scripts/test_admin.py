from fastapi.testclient import TestClient
from app.main import app
import re

client = TestClient(app)
r = client.post("/admin/login", data={"username": "admin@weatherguard.com", "password": "admin123"}, follow_redirects=False)
cookie = r.headers["set-cookie"].split(";")[0]
r2 = client.get("/admin/", headers={"Cookie": cookie})

# Just print all hrefs that are not static files
for m in re.finditer(r'href="([^"]+)"', r2.text):
    link = m.group(1)
    if "statics" not in link and "css" not in link and "js" not in link:
        print(link)
