"""Delete all charts except the 13 in the dashboard."""
import requests

BASE = "http://localhost:8088"
token = requests.post(BASE + "/api/v1/security/login",
    json={"username": "admin", "password": "admin123", "provider": "db"}
).json()["access_token"]
headers = {"Authorization": "Bearer " + token}

r = requests.get(BASE + "/api/v1/chart/?q=(page_size:100)", headers=headers).json()
print("count:", r["count"])

keep = {40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52}
to_delete = [c["id"] for c in r["result"] if c["id"] not in keep]
print("to_delete:", len(to_delete))

for cid in to_delete:
    d = requests.delete(BASE + f"/api/v1/chart/{cid}", headers=headers)
    print("deleted", cid, d.status_code)

r2 = requests.get(BASE + "/api/v1/chart/?q=(page_size:100)", headers=headers).json()
print("remaining:", r2["count"])
for c in r2["result"]:
    print(" ", c["id"], c["slice_name"])
