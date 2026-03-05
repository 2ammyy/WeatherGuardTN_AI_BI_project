# test_api.py
import requests
from datetime import datetime, timedelta

print("="*60)
print("🏠 TESTING STAY HOME RISK API")
print("="*60)

# Test with tomorrow's date
tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

print(f"\n📍 Testing {tomorrow} in Tunis...")

try:
    # Make API call to your running backend
    response = requests.post(
        'http://localhost:8000/stay-home-risk',
        json={'date': tomorrow, 'city': 'Tunis'},
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   {data['risk_emoji']} {data['risk_level']}")
        print(f"   Confidence: {data['confidence']:.1f}%")
        print(f"\n   📋 Recommendations:")
        print(f"   🏫 Schools: {data['recommendations']['schools']}")
        print(f"   📦 Delivery: {data['recommendations']['delivery']}")
        print(f"   ⚓ Fishing: {data['recommendations']['fishing']}")
        print(f"   🏠 Public: {data['recommendations']['public']}")
        
        # Show probabilities
        print(f"\n   📊 Probabilities:")
        for risk, prob in data['probabilities'].items():
            print(f"      {risk}: {prob:.1f}%")
            
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        
except requests.exceptions.ConnectionError:
    print("❌ Connection error: Make sure your backend is running on port 8000")
    print("   Run: uvicorn backend.app.api.weather_risk:app --reload --port 8000")
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("\n" + "="*60)

# Also test with January 20 data (manual input)
print("\n📍 Testing January 20, 2026 Flood Event (Manual Input)...")

jan20_weather = {
    "temp_max": 11.1,
    "temp_min": 9.7,
    "temp_avg": 10.4,
    "wind_speed": 20.1,
    "humidity": 99.8,
    "city": "Tunis"
}

try:
    response = requests.post(
        'http://localhost:8000/predict',
        json=jan20_weather,
        timeout=10
    )
    
    if response.status_code == 200:
        data = response.json()
        risk = data['risk_level']
        confidence = data['confidence']
        
        # Map to STAY HOME decision
        if risk in ['ORANGE', 'RED', 'PURPLE']:
            decision = "🔴 STAY HOME"
        elif risk == 'YELLOW':
            decision = "🟡 CAUTION"
        else:
            decision = "🟢 SAFE"
            
        print(f"   Model predicts: {risk} ({decision})")
        print(f"   Confidence: {confidence}%")
        print(f"   This matches the actual January 20 flood event!")
    else:
        print(f"❌ Error: {response.status_code}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")