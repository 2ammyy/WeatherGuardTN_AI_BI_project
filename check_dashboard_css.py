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

# Get dashboard CSS
r = s.get(f'{BASE}/api/v1/dashboard/2', timeout=10)
d = r.json()['result']
css = d.get('css', '')
print(f'Dashboard CSS length: {len(css)}')
print(f'CSS contains box-sizing: {"box-sizing" in css}')
print(f'CSS content:')
print(css[:500])

# Also try to access the dashboard page
r = s.get(f'{BASE}/superset/dashboard/2/', headers={'Accept': 'text/html'}, timeout=10)
print(f'\nDashboard page status: {r.status_code}')
