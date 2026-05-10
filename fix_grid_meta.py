import requests, json

BASE = 'http://superset:8088'
s = requests.Session()

r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
r.raise_for_status()
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'

r = s.get(f'{BASE}/api/v1/security/csrf_token', timeout=10)
r.raise_for_status()
csrf = r.json()['result']
s.headers['X-CSRFToken'] = csrf
s.headers['Referer'] = f'{BASE}/'

# Get current dashboard
r = s.get(f'{BASE}/api/v1/dashboard/2', timeout=10)
d = r.json()['result']
pos = json.loads(d.get('position_json', '{}'))

# Save backup
with open('/tmp/dashboard_backup.json', 'w') as f:
    json.dump(pos, f, indent=2)
print('Backup saved to /tmp/dashboard_backup.json')

# Check GRID_ID
grid = pos.get('GRID_ID', {})
print(f'GRID_ID has meta: {"meta" in grid}')
print(f'GRID_ID keys: {list(grid.keys())}')

# Add empty meta to GRID_ID
grid['meta'] = {}
print('Added meta to GRID_ID')

# Save the updated layout
r = s.put(f'{BASE}/api/v1/dashboard/2', json={
    'position_json': json.dumps(pos),
}, timeout=10)
print(f'Dashboard update status: {r.status_code}')
if r.status_code == 200:
    print('GRID_ID meta fix applied!')
else:
    print('Error:', r.text[:500])
