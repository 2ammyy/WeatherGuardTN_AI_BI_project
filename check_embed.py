import requests

s = requests.Session()
r = s.post('http://localhost:8088/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
s.headers.update({'Authorization': 'Bearer '+r.json()['access_token']})

r = s.get('http://localhost:8088/api/v1/dashboard/?q=(page_size:5)', timeout=10)
for d in r.json().get('result', []):
    did = d['id']
    title = d['dashboard_title']
    r2 = s.get(f'http://localhost:8088/api/v1/dashboard/{did}/embedded', timeout=10)
    if r2.ok:
        uuid = r2.json().get('result', {}).get('uuid', 'NONE')
        print(f'Dashboard {did}: {title} -> uuid={uuid}')
    else:
        print(f'Dashboard {did}: {title} -> NO EMBEDDING ({r2.status_code})')
    # Also try loading the embedded page
    if r2.ok:
        uuid = r2.json()['result']['uuid']
        r3 = s.get(f'http://localhost:8088/embedded/{uuid}?uiConfig=11', timeout=10)
        print(f'  Embedded page: {r3.status_code}')
