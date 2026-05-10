import requests, json, urllib.parse

BASE = 'http://superset:8088'
s = requests.Session()

r = s.post(f'{BASE}/api/v1/security/login', json={'username':'admin','password':'admin123','provider':'db','refresh':True}, timeout=10)
r.raise_for_status()
token = r.json()['access_token']
s.headers['Authorization'] = f'Bearer {token}'

r = s.get(f'{BASE}/api/v1/security/csrf_token', timeout=10)
r.raise_for_status()
csrf = r.json()['result']

r = s.post(f'{BASE}/api/v1/security/guest_token/', json={
    'user': {'username':'admin','first_name':'Admin','last_name':''},
    'resources': [{'type':'dashboard','id':'2'}],
    'rls': [],
}, headers={'X-CSRFToken': csrf, 'Referer': f'{BASE}/'}, timeout=10)
guest_token = r.json()['token']

# Test: POST to chart/data with query params + JSON body (like frontend does)
url = f'{BASE}/api/v1/chart/data?form_data={urllib.parse.quote(json.dumps({"slice_id":49}))}&dashboard_id=2&force'
print(f'URL: {url}')

# This is what the frontend sends
# The body is JSON.stringify(c) where c is the query context
# c = {datasource: {id:..., type:...}, queries: [...], force: bool, result_format: "json", result_type: "full"}
# But the frontend might also include form_data in the JSON body

# Let's try the exact payload format from browser
# The frontend code: body: JSON.stringify(c)
# c = (0, p.u)({formData: e, resultType: n, resultFormat: t, force: r, ...})

# First, let's get the chart's form_data to construct a proper query context
r = requests.get(
    f'{BASE}/api/v1/chart/49',
    headers={'Authorization': f'Bearer {token}', 'Referer': f'{BASE}/'},
    timeout=10
)
chart_data = r.json().get('result', {})
print(f'Chart 49 form_data: {chart_data.get("form_data", "N/A")[:200]}')

# Construct query context payload matching what the frontend would send
query_context = {
    "datasource": {"id": 7, "type": "table"},
    "force": False,
    "queries": [{
        "metrics": ["count"],
        "filters": [],
        "time_range": "No filter",
        "is_timeseries": False,
    }],
    "result_format": "json",
    "result_type": "full",
    "form_data": {"slice_id": 49, "dashboard_id": 2},
}

# POST with query params (like frontend)
r = requests.post(
    url,
    json=query_context,
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=30
)
print(f'\nTest POST chart/data (with query params + body): {r.status_code}')
print(f'  Body: {r.text[:500]}')

# Now try POST with query params but minimal body (slice_id only)
url2 = f'{BASE}/api/v1/chart/data?form_data={urllib.parse.quote(json.dumps({"slice_id":49}))}&dashboard_id=2&force'
r2 = requests.post(
    url2,
    json={"slice_id": 49},
    headers={'X-GuestToken': guest_token, 'Referer': f'{BASE}/'},
    timeout=30
)
print(f'\nTest POST chart/data (minimal body): {r2.status_code}')
print(f'  Body: {r2.text[:500]}')
