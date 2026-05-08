"""Test the superset dashboard page via admin login."""
import requests

s = requests.Session()
login = s.post("http://localhost:8000/admin/login",
               data={"username": "admin@weatherguard.com", "password": "admin123"},
               allow_redirects=False)
print("Login:", login.status_code)

resp = s.get("http://localhost:8000/superset-dashboard")
print("Dashboard page:", resp.status_code)
if resp.status_code == 200:
    # Check it has the iframe
    has_iframe = 'src="http://localhost:8088/superset/dashboard/3/' in resp.text
    print(f"  Has iframe: {has_iframe}")
    print(f"  Length: {len(resp.text)} chars")
    print("  ✅ Superset dashboard page works!")
else:
    print(f"  ❌ Failed: {resp.text[:200]}")

# Test sidebar link works from admin page
admin = s.get("http://localhost:8000/admin/")
print("Admin index:", admin.status_code)
