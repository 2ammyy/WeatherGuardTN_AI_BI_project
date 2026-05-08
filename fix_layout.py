import requests, json, uuid

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

# Get current dashboard
r = s.get(f'{BASE}/api/v1/dashboard/2', timeout=10)
d = r.json()['result']
pos = json.loads(d.get('position_json', '{}'))

def make_id(prefix='ROW'):
    return f'{prefix}-{uuid.uuid4().hex[:8]}'

# Group charts into rows (matching the layout structure)
# Row 1: CHART-0 (w=6), CHART-1 (w=6)  → two half-width charts
# Row 2: CHART-2 (w=4), CHART-3 (w=4), CHART-4 (w=4)  → three one-third charts
# Row 3: CHART-5 (w=6), CHART-6 (w=6)  → two half-width charts
# Row 4: CHART-7 (w=4), CHART-8 (w=4), CHART-9 (w=4)  → three one-third charts
# Row 5: CHART-10 (w=6), CHART-11 (w=3), CHART-12 (w=3)  → one half + two quarter charts

rows = [
    ['CHART-0', 'CHART-1'],
    ['CHART-2', 'CHART-3', 'CHART-4'],
    ['CHART-5', 'CHART-6'],
    ['CHART-7', 'CHART-8', 'CHART-9'],
    ['CHART-10', 'CHART-11', 'CHART-12'],
]

# Create ROW components and update layout
row_ids = []
for i, chart_ids in enumerate(rows):
    row_id = make_id('ROW')
    row_ids.append(row_id)
    row = {
        'type': 'ROW',
        'id': row_id,
        'children': chart_ids,
        'meta': {'background': 'BACKGROUND_TRANSPARENT'},
        'parents': ['ROOT_ID', 'GRID_ID'],
    }
    pos[row_id] = row

    # Update each CHART's parents to include ROW
    for cid in chart_ids:
        chart = pos.get(cid)
        if chart:
            # Insert ROW_ID between GRID_ID position
            chart['parents'] = ['ROOT_ID', 'GRID_ID', row_id]

# Update GRID_ID children to point to ROWs instead of CHARTs
pos['GRID_ID']['children'] = row_ids

# Update ROOT_ID children (should still be just GRID_ID)
# already correct

print(f'Added {len(row_ids)} ROW components')
print(f'GRID_ID children: {pos["GRID_ID"]["children"]}')

# Save the updated layout
r = s.put(f'{BASE}/api/v1/dashboard/2', json={
    'position_json': json.dumps(pos),
}, timeout=10)
print(f'Dashboard update status: {r.status_code}')
if r.status_code == 200:
    print('Layout updated successfully!')
else:
    print('Error:', r.text[:500])
