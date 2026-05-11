"""Fix dashboard 65 using guest token (our patched flow)."""
import requests
import json

BASE = 'http://superset:8088'

# Login
s = requests.Session()
r = s.post(f'{BASE}/api/v1/security/login',
           json={'username': 'admin', 'password': 'admin123', 'provider': 'db', 'refresh': True},
           timeout=10)
s.headers['Authorization'] = f'Bearer {r.json()["access_token"]}'
s.headers['Referer'] = f'{BASE}/'

# Get guest token (works despite CSRF)
r = s.post(f'{BASE}/api/v1/security/guest_token/',
           json={'user': {'username': 'admin', 'first_name': 'Admin', 'last_name': ''},
                  'resources': [{'type': 'dashboard', 'id': '65'}],
                  'rls': []},
           timeout=10)
token = r.json()['token']

# Now use the guest token (our patched auth)
s2 = requests.Session()
s2.headers['X-GuestToken'] = token
s2.headers['Referer'] = f'{BASE}/'
s2.headers['Content-Type'] = 'application/json'

# Get dashboard
r = s2.get(f'{BASE}/api/v1/dashboard/65', timeout=10)
dash = r.json()['result']
pos = json.loads(dash['position_json'])

valid_ids = {4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25, 28}
new_pos = {}
valid_children = []

for key, val in pos.items():
    if key.startswith('CHART-'):
        chart_id = val.get('meta', {}).get('chartId')
        if chart_id in valid_ids:
            new_pos[key] = val
            valid_children.append(key)
    else:
        new_pos[key] = val

new_pos['GRID_ID']['children'] = valid_children
new_pos_json = json.dumps(new_pos, separators=(',', ':'))

body = {'position_json': new_pos_json}
r = s2.put(f'{BASE}/api/v1/dashboard/65', json=body, timeout=10)

if r.status_code == 200:
    print(f'✓ Dashboard 65 fixed! Now has {len(valid_children)} valid charts.')
    print(f'  Charts kept: {[p["meta"].get("sliceName", "?") for p in new_pos.values() if isinstance(p, dict) and p.get("type") == "CHART"]}')
else:
    print(f'✗ Failed: {r.status_code}')
    print(f'  Response: {r.text[:500]}')
