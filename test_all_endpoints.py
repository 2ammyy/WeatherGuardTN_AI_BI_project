import requests

base_url = "http://localhost:8000"

# Test health
r = requests.get(f"{base_url}/health")
print(f"Health: {r.status_code} - {r.json()}")

# Test governorates
r = requests.get(f"{base_url}/governorates")
print(f"Governorates: {r.status_code} - {len(r.json()['governorates'])} cities")

# Test Jan 20 flood
flood = {
    "temp_max": 11.1,
    "temp_min": 9.7,
    "temp_avg": 10.4,
    "wind_speed": 20.1,
    "humidity": 99.8,
    "precipitation": 71.9,
    "city": "Tunis"
}
r = requests.post(f"{base_url}/predict", json=flood)
print(f"\n🌊 JAN 20 FLOOD:")
print(f"   Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"   Risk: {data['risk_level']}")
    print(f"   Confidence: {data['confidence']}%")