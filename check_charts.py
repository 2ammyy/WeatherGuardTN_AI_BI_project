import requests

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

r = s.get(f'{BASE}/api/v1/dashboard/2/charts', timeout=10)
data = r.json()
charts = data.get('result', [])
for c in charts:
    fd = c.get('form_data', {}) or {}
    print(f'  Chart {c.get("id")}: {c.get("slice_name")} - type: {fd.get("viz_type")}')
