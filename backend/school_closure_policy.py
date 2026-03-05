# backend/school_closure_policy.py

def should_close_schools(weather_data):
    """
    Decision engine for school closures based on Tunisian conditions
    """
    reasons = []
    
    # Check rainfall (primary factor)
    if weather_data.get('precipitation', 0) > 50:
        reasons.append(f"Extreme rainfall: {weather_data['precipitation']}mm (flood risk)")
        return True, reasons
    
    # Check wind (secondary factor)
    if weather_data.get('wind_speed', 0) > 60:
        reasons.append(f"Dangerous winds: {weather_data['wind_speed']} km/h")
        return True, reasons
    
    # Combined factors
    risk_score = 0
    if weather_data.get('precipitation', 0) > 30:
        risk_score += 2
        reasons.append(f"Heavy rain: {weather_data['precipitation']}mm")
    if weather_data.get('wind_speed', 0) > 40:
        risk_score += 2
        reasons.append(f"Strong winds: {weather_data['wind_speed']} km/h")
    
    if risk_score >= 3:
        reasons.append("Combined hazardous conditions")
        return True, reasons
    
    return False, ["Conditions normal"]

# Test with January 20 data
jan20_data = {
    'precipitation': 71.9,
    'wind_speed': 20.1,
    'temp': 11.1
}

should_close, reasons = should_close_schools(jan20_data)
print(f"School closure: {'✅ YES' if should_close else '❌ NO'}")
print("Reasons:", ", ".join(reasons))