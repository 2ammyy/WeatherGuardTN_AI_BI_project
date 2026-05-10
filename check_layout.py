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

# Get current position data
r = s.get(f'{BASE}/api/v1/dashboard/2', timeout=10)
d = r.json()['result']
pos = json.loads(d.get('position_json', '{}'))

# Print all entries with their parents
for k, v in pos.items():
    if isinstance(v, dict):
        print(f"{k}: type={v.get('type')}, children={v.get('children')}, parents={v.get('parents')}, has_meta={'meta' in v}")

# Check what CHART parents point to
for k, v in pos.items():
    if isinstance(v, dict) and v.get('type') == 'CHART':
        parents = v.get('parents', [])
        print(f'\n{k} parents: {parents}')
        for p in parents:
            if p in pos and isinstance(pos[p], dict):
                pm = pos[p].get('meta', 'NO_META')
                print(f'  Parent {p} type={pos[p].get("type")}, meta_keys={list(pm.keys()) if isinstance(pm, dict) else type(pm).__name__}')
