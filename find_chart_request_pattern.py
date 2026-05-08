import re
data = open('/app/superset/static/assets/9548dc0f106df7ead049.chunk.js', 'r', errors='ignore').read()

# Find the getChartData function definition (ue = getChartData)
# Look for where 'ue' is called with arguments
idx = data.find('getChartData')
print(f'getChartData at index {idx}')

# Find actual request building code for chart data
start_search = data.find('var n={}')
if start_search < 0:
    start_search = 0

relevant = data[start_search:start_search+50000]

# Look for chart data request patterns
patterns = ['dashboardId', 'dashboard_id', 'slice_id', 'form_data', '/api/v1/chart/data']
for p in patterns:
    positions = [m.start() for m in re.finditer(re.escape(p), relevant)]
    for pos in positions[:3]:
        ctx = relevant[max(0,pos-200):pos+300]
        print(f'\n--- {p} at offset {pos} ---')
        print(ctx)
