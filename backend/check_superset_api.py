import requests, json

BASE = 'http://superset:8088'
s = requests.Session()

r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
r.raise_for_status()
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'

# Try Superset API v1 roles
for path in ['/api/v1/role/', '/api/v1/roles/', '/api/v1/security/roles/']:
    r = s.get(f'{BASE}{path}', timeout=10)
    print(f'{path}: {r.status_code}')

# Check available endpoints
r = s.get(f'{BASE}/swagger/v1/openapi.json', timeout=10)
if r.status_code == 200:
    spec = r.json()
    paths = list(spec.get('paths', {}).keys())
    role_paths = [p for p in paths if 'role' in p.lower()]
    print(f'\nRole-related API paths: {role_paths}')
