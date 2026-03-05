# backend/analyze_jan20_risk.py

import pandas as pd

print("="*60)
print("🔍 DETAILED ANALYSIS OF JANUARY 20, 2026")
print("="*60)

# Load the original data
df = pd.read_csv('backend/data/historical/tunisia 2024-01-02 to 2026-03-20.csv')

# Find January 20, 2026
jan20 = df[df['datetime'] == '2026-01-20']

if len(jan20) > 0:
    row = jan20.iloc[0]
    print(f"\n📋 Complete weather data for 2026-01-20:")
    print(f"   City: {row.get('name', 'N/A')}")
    print(f"   Max Temp: {row.get('tempmax', 'N/A')}°C")
    print(f"   Min Temp: {row.get('tempmin', 'N/A')}°C")
    print(f"   Wind Speed: {row.get('windspeed', 'N/A')} km/h")
    print(f"   Precipitation: {row.get('precip', 'N/A')} mm")
    print(f"   Humidity: {row.get('humidity', 'N/A')}%")
    print(f"   Conditions: {row.get('conditions', 'N/A')}")
    
    # Calculate risk score based on your formula
    risk_score = 0
    
    # Wind contribution
    wind = row.get('windspeed', 0)
    if wind > 80: risk_score += 4
    elif wind > 60: risk_score += 3
    elif wind > 40: risk_score += 2
    elif wind > 20: risk_score += 1
    
    # Precipitation contribution
    precip = row.get('precip', 0)
    if precip > 60: risk_score += 4
    elif precip > 40: risk_score += 3
    elif precip > 20: risk_score += 2
    elif precip > 10: risk_score += 1
    
    print(f"\n📊 Risk Score Calculation:")
    print(f"   Wind contribution: {wind} km/h → +{min(4, max(0, (wind-20)//20 + 1)) if wind > 20 else 0}")
    print(f"   Rain contribution: {precip} mm → +{min(4, max(0, (precip-10)//10 + 1)) if precip > 10 else 0}")
    print(f"   Total Score: {risk_score}")
    
    if risk_score >= 8:
        print("   → PURPLE (Extreme)")
    elif risk_score >= 6:
        print("   → RED (High)")
    elif risk_score >= 4:
        print("   → ORANGE (Medium-High)")
    elif risk_score >= 2:
        print("   → YELLOW (Medium)")
    else:
        print("   → GREEN (Low)")
        
else:
    print("❌ January 20, 2026 not found in data")