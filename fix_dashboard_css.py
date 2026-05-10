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

# Update dashboard CSS to include box-sizing fix for embedded mode
dashboard_css = """
.dashboard-component-chart-holder {
  width: 100%;
  box-sizing: border-box;
}
*,
*::before,
*::after {
  box-sizing: border-box;
}
"""

r = s.put(f'{BASE}/api/v1/dashboard/2', json={
    "css": dashboard_css.strip()
}, timeout=10)
print(f'Dashboard CSS update: {r.status_code}')
if r.status_code == 200:
    print('CSS updated successfully')
else:
    print(r.text[:500])
