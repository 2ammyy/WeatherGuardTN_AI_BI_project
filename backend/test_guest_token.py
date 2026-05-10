import requests, json

BASE = 'http://superset:8088'
s = requests.Session()

# Login as admin to get guest token
r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
r.raise_for_status()
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'

r = s.get(f'{BASE}/api/v1/security/csrf_token', timeout=10)
r.raise_for_status()
csrf = r.json()['result']

# Get guest token
r = s.post(f'{BASE}/api/v1/security/guest_token/', json={
    "user": {"username": "admin", "first_name": "Admin", "last_name": ""},
    "resources": [{"type": "dashboard", "id": "2"}],
    "rls": [],
}, headers={'X-CSRFToken': csrf, 'Referer': f'{BASE}/'}, timeout=10)
print(f'Guest token response: {r.status_code}')
print(json.dumps(r.json(), indent=2)[:300])
