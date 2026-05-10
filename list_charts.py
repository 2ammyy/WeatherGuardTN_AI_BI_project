import requests, json

BASE = 'http://superset:8088'
s = requests.Session()

r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
r.raise_for_status()
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'

# Get all charts
r = s.get(f'{BASE}/api/v1/chart/', params={'q': '(page_size:200)'}, timeout=10)
if r.status_code == 200:
    charts = r.json().get('result', [])
    print(f'Total charts: {len(charts)}')
    for c in charts:
        print(f'  ID: {c.get("id")}, slice_name: {c.get("slice_name")}, datasource_id: {c.get("datasource_id")}, datasource_type: {c.get("datasource_type")}')

# Get dashboard 2 details
r = s.get(f'{BASE}/api/v1/dashboard/2', timeout=10)
if r.status_code == 200:
    d = r.json().get('result', {})
    print(f'\nDashboard 2: {d.get("dashboard_title")}')
    pos = json.loads(d.get('position_json', '{}'))
    for key, val in pos.items():
        if isinstance(val, dict) and val.get('type') == 'CHART':
            meta = val.get('meta', {})
            print(f'  Chart widget "{key}": chart_id={meta.get("chartId")}')

# Get dashboard 2 charts
r = s.get(f'{BASE}/api/v1/dashboard/2/charts', timeout=10)
if r.status_code == 200:
    charts_data = r.json().get('result', [])
    print(f'\nDashboard 2 charts (from /charts endpoint):')
    for c in charts_data:
        print(f'  ID: {c.get("id")}, slice_name: {c.get("slice_name")}')
