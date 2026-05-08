data = open('/app/superset/static/assets/8047.8a41e1d5ad34db9d0240.entry.js', 'r', errors='ignore').read()
idx = data.find('jsonPayload')
if idx >= 0:
    start = max(0, idx - 1500)
    end = min(len(data), idx + 1500)
    section = data[start:end]
    print(section)
