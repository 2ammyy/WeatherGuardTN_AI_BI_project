import requests, json

BASE = 'http://superset:8088'
s = requests.Session()

# Login as admin
r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
r.raise_for_status()
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'

r = s.get(f'{BASE}/api/v1/security/csrf_token', timeout=10)
r.raise_for_status()
csrf = r.json()['result']
s.headers['X-CSRFToken'] = csrf
s.headers['Referer'] = f'{BASE}/'

# Get Gamma role details
r = s.get(f'{BASE}/api/v1/role/', params={'q': '(filters:!((col:name,opr:eq,value:Gamma)))'}, timeout=10)
print(f'Role list status: {r.status_code}')

if r.status_code == 200:
    roles = r.json().get('result', [])
    print(f'Roles found: {len(roles)}')
    for role in roles:
        print(f'  Role: {role.get("name")}, id: {role.get("id")}')
        perms = role.get('permissions', [])
        print(f'  Permissions count: {len(perms)}')
        # Show chart-related permissions
        for p in perms:
            pname = p.get('permission', {}).get('name', '') if isinstance(p.get('permission'), dict) else ''
            vname = p.get('view_menu', {}).get('name', '') if isinstance(p.get('view_menu'), dict) else ''
            if 'chart' in pname.lower() or 'chart' in vname.lower() or 'data' in pname.lower() or 'explore' in pname.lower():
                print(f'    {pname} on {vname}')
