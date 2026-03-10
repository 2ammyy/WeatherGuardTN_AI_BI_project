# test_jan20_fixed.py
import requests

print("="*60)
print("🌊 TESTING JANUARY 20, 2026 FLOOD EVENT")
print("="*60)

# CORRECT: Include precipitation (71.9mm)
jan20_weather = {
    "temp_max": 11.1,
    "temp_min": 9.7,
    "temp_avg": 10.4,
    "wind_speed": 20.1,
    "humidity": 99.8,
    "precipitation": 71.9,  
    "city": "Tunis"
}

print(f"\n📍 Sending weather data with {jan20_weather['precipitation']}mm rain...")

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
        
        print(f"\n✅ Model predicts: {risk}")
        print(f"   Confidence: {confidence}%")
        
        # Show probabilities
        print(f"\n   📊 Probabilities:")
        for level, prob in data['probabilities'].items():
            print(f"      {level}: {prob}%")
        
        # Check if correct
        if risk in ['ORANGE', 'RED']:
            print(f"\n🎯 CORRECT! This matches the flood event.")
        else:
            print(f"\n❌ INCORRECT! Should be ORANGE/RED for 71.9mm rain.")
            
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Error: {str(e)}")