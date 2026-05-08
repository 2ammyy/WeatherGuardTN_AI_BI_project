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

# Get charts and their datasets
r = s.get(f'{BASE}/api/v1/dashboard/2/charts', timeout=10)
charts = r.json().get('result', [])

dataset_ids = set()
for c in charts:
    fd = c.get('form_data', {}) or {}
    ds = fd.get('datasource', '')
    print(f'Chart {c["id"]} ({c.get("slice_name")}): datasource={ds}, viz_type={fd.get("viz_type")}')
    if ds:
        parts = ds.split('__')
        dataset_ids.add(parts[0] if len(parts) > 1 else ds.split('[')[1].split(']')[0] if '[' in ds else '')

print(f'\nUnique dataset IDs: {dataset_ids}')

# Check each dataset exists
for ds_id in sorted(dataset_ids):
    if ds_id:
        r = s.get(f'{BASE}/api/v1/dataset/{ds_id}', timeout=10)
        if r.status_code == 200:
            ds = r.json().get('result', {})
            print(f'Dataset {ds_id}: {ds.get("table_name")} (schema: {ds.get("schema")})')
        else:
            print(f'Dataset {ds_id}: ERROR - {r.status_code}')
