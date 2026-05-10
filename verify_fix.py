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

r = s.get(f'{BASE}/api/v1/dashboard/2', timeout=10)
pos = json.loads(r.json()['result'].get('position_json', '{}'))
grid = pos.get('GRID_ID', {})
has_meta = 'meta' in grid
meta_val = grid.get('meta')
print(f'GRID_ID has meta: {has_meta}')
print(f'GRID_ID meta value: {meta_val}')
print(f'GRID_ID keys: {list(grid.keys())}')
