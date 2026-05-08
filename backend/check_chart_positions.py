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

# Get dashboard with full details
r = s.get(f'{BASE}/api/v1/dashboard/2', timeout=10)
d = r.json()['result']

pos = json.loads(d.get('position_json', '{}'))
print(f"Position entries: {len(pos)}")
for k, v in pos.items():
    if isinstance(v, dict):
        meta = v.get('meta', {})
        if isinstance(meta, dict):
            chart_id = meta.get('chartId')
            width = meta.get('width')
            height = meta.get('height')
            if chart_id:
                print(f"  {k}: chartId={chart_id}, width={width}, height={height}")
