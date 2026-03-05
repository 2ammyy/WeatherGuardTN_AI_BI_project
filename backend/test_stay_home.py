# test_stay_home_fixed.py
from fastapi import HTTPException
from flask import app
import joblib
import numpy as np
import requests
from datetime import datetime, timedelta

from backend.app.api.weather_risk import CITY_COORDINATES, DateForecastRequest

print("="*60)
print("🏠 TESTING STAY HOME RISK API")
print("="*60)

# Test with tomorrow's date
tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

print(f"\n📍 Testing {tomorrow} in Tunis...")

try:
    response = requests.post(
        'http://localhost:8000/stay-home-risk',
        json={'date': tomorrow, 'city': 'Tunis'}
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
        
except Exception as e:
    print(f"❌ Connection error: {str(e)}")

print("\n" + "="*60)

# Add this helper function to fetch weather with precipitation
async def get_weather_forecast(date: str, city: str):
    """
    Fetch weather forecast from OpenWeatherMap including precipitation
    """
    try:
        print(f"🌤️ Fetching weather for {city} on {date}")
        
        # Your OpenWeatherMap API key
        API_KEY = "139fef2236c773191352b491bd53a624"
        
        # Get coordinates for the city
        if city not in CITY_COORDINATES:
            raise HTTPException(status_code=400, detail=f"City '{city}' not found")
        
        coords = CITY_COORDINATES[city]
        
        # Call OpenWeatherMap API
        url = "https://api.openweathermap.org/data/2.5/forecast"
        params = {
            "lat": coords["lat"],
            "lon": coords["lon"],
            "appid": API_KEY,
            "units": "metric",
            "cnt": 40  # 5 days * 8 timestamps
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return None
        
        data = response.json()
        
        # Find forecast for requested date
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        day_forecasts = []
        
        for item in data["list"]:
            item_date = datetime.fromtimestamp(item["dt"]).date()
            if item_date == target_date:
                day_forecasts.append(item)
        
        if not day_forecasts:
            # Return available dates for error message
            available = set()
            for item in data["list"]:
                available.add(datetime.fromtimestamp(item["dt"]).date())
            available_dates = sorted([d.strftime("%Y-%m-%d") for d in available])[:5]
            raise HTTPException(
                status_code=404,
                detail=f"No forecast for {date}. Available: {', '.join(available_dates)}"
            )
        
        # Calculate daily averages INCLUDING PRECIPITATION
        temps_max = [f["main"]["temp_max"] for f in day_forecasts]
        temps_min = [f["main"]["temp_min"] for f in day_forecasts]
        wind_speeds = [f["wind"]["speed"] * 3.6 for f in day_forecasts]  # m/s to km/h
        humidities = [f["main"]["humidity"] for f in day_forecasts]
        
        # Get precipitation (rain volume in mm)
        precipitations = []
        for f in day_forecasts:
            if "rain" in f and "3h" in f["rain"]:
                precipitations.append(f["rain"]["3h"])
            else:
                precipitations.append(0)  # No rain
        
        weather = {
            "temp_max": round(max(temps_max), 1),
            "temp_min": round(min(temps_min), 1),
            "temp_avg": round((max(temps_max) + min(temps_min)) / 2, 1),
            "wind_speed": round(sum(wind_speeds) / len(wind_speeds), 1),
            "humidity": round(sum(humidities) / len(humidities), 1),
            "precipitation": round(sum(precipitations), 1),  # CRITICAL: Include precipitation!
            "city": city,
            "date": date
        }
        
        print(f"✅ Weather data: {weather}")
        return weather
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_weather_forecast: {str(e)}")
        return None

@app.post("/stay-home-risk")
async def predict_stay_home_risk(request: DateForecastRequest):
    """
    Unified prediction: SAFE 🟢, CAUTION 🟡, or STAY HOME 🟠🔴
    """
    try:
        print(f"\n🔍 Processing request for {request.city} on {request.date}")
        
        # Step 1: Get weather forecast with precipitation
        forecast = await get_weather_forecast(request.date, request.city)
        
        if forecast is None:
            raise HTTPException(
                status_code=404,
                detail=f"Could not fetch weather data for {request.date}"
            )
        
        # Step 2: Load the unified model
        try:
            model = joblib.load('mlartifacts/stay_home_model.pkl')
            scaler = joblib.load('mlartifacts/scaler.pkl')
            print("✅ Model loaded successfully")
        except Exception as e:
            print(f"❌ Model loading failed: {str(e)}")
            raise HTTPException(status_code=500, detail="Model not available")
        
        # Step 3: Prepare features (6 features including precipitation)
        features = np.array([[
            float(forecast['temp_max']),
            float(forecast['temp_min']),
            float(forecast['temp_avg']),
            float(forecast['wind_speed']),
            float(forecast['humidity']),
            float(forecast['precipitation'])  # 6th feature!
        ]])
        
        print(f"📊 Features: {features}")
        
        # Step 4: Scale features
        features_scaled = scaler.transform(features)
        
        # Step 5: Predict
        pred = model.predict(features_scaled)[0]
        proba = model.predict_proba(features_scaled)[0]
        
        print(f"🎯 Prediction: {pred}, Probabilities: {proba}")
        
        # Step 6: Map to risk levels
        risk_levels = ['SAFE', 'CAUTION', 'STAY HOME']
        emojis = ['🟢', '🟡', '🔴']
        
        # Step 7: Generate recommendations
        recommendations = {
            0: {  # SAFE
                "schools": "✅ Open normally",
                "delivery": "✅ Normal operations",
                "fishing": "✅ Safe to go out",
                "public": "✅ Normal activities"
            },
            1: {  # CAUTION
                "schools": "🟡 Monitor, possible delays",
                "delivery": "🟡 Be careful, avoid rural roads",
                "fishing": "🟡 Stay near coast",
                "public": "🟡 Stay informed"
            },
            2: {  # STAY HOME
                "schools": "🔴 CLOSED",
                "delivery": "🔴 SUSPENDED",
                "fishing": "🔴 DO NOT GO OUT",
                "public": "🔴 STAY INDOORS"
            }
        }
        
        # Step 8: Return response
        response = {
            "date": request.date,
            "city": request.city,
            "risk_level": risk_levels[pred],
            "risk_emoji": emojis[pred],
            "confidence": float(max(proba) * 100),
            "probabilities": {
                "SAFE": float(proba[0] * 100),
                "CAUTION": float(proba[1] * 100),
                "STAY HOME": float(proba[2] * 100)
            },
            "weather": forecast,  # Includes precipitation now!
            "recommendations": recommendations[pred]
        }
        
        print("✅ Response prepared")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))