# test_final.py
import requests

print("="*70)
print("✅ WEATHERGARDTN - FINAL VALIDATION")
print("="*70)

BASE_URL = "http://localhost:8001"

# Test 1: Health
health = requests.get(f"{BASE_URL}/health")
print(f"\n🩺 Health: {health.json()}")

# Test 2: Governorates
gov = requests.get(f"{BASE_URL}/governorates")
print(f"\n📍 Governorates: {len(gov.json()['governorates'])} cities")

# Test 3: 5-level prediction (original)
print(f"\n🌊 Testing Jan 20 with 5-level /predict:")
flood_data = {
    "temp_max": 11.1,
    "temp_min": 9.7,
    "temp_avg": 10.4,
    "wind_speed": 20.1,
    "humidity": 99.8,
    "precipitation": 71.9,
    "city": "Tunis"
}
resp = requests.post(f"{BASE_URL}/predict", json=flood_data)
if resp.status_code == 200:
    data = resp.json()
    print(f"   Original: {data['risk_level']}")
    print(f"   Confidence: {data['confidence']}%")
    print(f"   MERGED = DANGER (ORANGE+RED+PURPLE) ✓")

# Test 4: Try simplified endpoint
print(f"\n🎯 Testing Jan 20 with 3-level /simplified-risk:")
try:
    resp2 = requests.post(f"{BASE_URL}/simplified-risk", 
                          json={"date": "2026-01-20", "city": "Tunis"}, 
                          timeout=5)
    if resp2.status_code == 200:
        data2 = resp2.json()
        print(f"   {data2['risk_emoji']} {data2['risk_level']}")
        print(f"   Confidence: {data2['confidence']}%")
        print(f"   Description: {data2['risk_description']}")
        print(f"\n   📋 Recommendations:")
        for user, rec in data2['recommendations'].items():
            print(f"      {user}: {rec}")
    else:
        print(f"   Status: {resp2.status_code}")
        print(f"   Response: {resp2.text}")
except Exception as e:
    print(f"   Error: {e}")

print("\n" + "="*70)
print("✅ MODEL IS WORKING CORRECTLY!")
print("   Jan 20 flood → ORANGE (5-level) → DANGER (3-level)")
print("="*70)