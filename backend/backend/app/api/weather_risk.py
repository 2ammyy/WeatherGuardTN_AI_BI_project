# backend/app/api/weather_risk.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import pandas as pd
from typing import List, Dict, Optional
import os
import traceback
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="WeatherGuardTN API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODEL LOADING ====================

MODEL_PATH = "mlartifacts/proper_rain_model.pkl"  
SCALER_PATH = "mlartifacts/scaler_6features.pkl"  
FEATURES_PATH = "mlartifacts/feature_cols_6.pkl"   

print("📦 Loading model and preprocessors...")

# Default features
DEFAULT_FEATURES = ['temp_max', 'temp_min', 'temp_avg', 'wind_speed', 'humidity', 'precipitation']

try:
    # Load model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded: {type(model).__name__}")
    else:
        print(f"❌ Model not found: {MODEL_PATH}")
        model = None
    
    # Load scaler
    if os.path.exists(SCALER_PATH):
        scaler = joblib.load(SCALER_PATH)
        print(f"✅ Scaler loaded (expects {scaler.n_features_in_} features)")
    else:
        print(f"❌ Scaler not found: {SCALER_PATH}")
        scaler = None
    
    # Load features
    if os.path.exists(FEATURES_PATH):
        feature_cols = joblib.load(FEATURES_PATH)
        print(f"✅ Features: {feature_cols}")
    else:
        feature_cols = DEFAULT_FEATURES
        print(f"⚠️ Using default features: {feature_cols}")
        
except Exception as e:
    print(f"❌ Error loading model: {e}")
    traceback.print_exc()
    model = None
    scaler = None
    feature_cols = DEFAULT_FEATURES

# ==================== CONFIGURATION ====================

WEATHER_API_KEY = "139fef2236c773191352b491bd53a624"
WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/forecast"

# Tunisian cities coordinates
CITY_COORDINATES = {
    "Tunis": {"lat": 36.8065, "lon": 10.1815},
    "Sfax": {"lat": 34.7400, "lon": 10.7600},
    "Sousse": {"lat": 35.8256, "lon": 10.6411},
    "Bizerte": {"lat": 37.2744, "lon": 9.8739},
    "Jendouba": {"lat": 36.5011, "lon": 8.7803},
    "Gabes": {"lat": 33.8815, "lon": 10.0982},
    "Ariana": {"lat": 36.8667, "lon": 10.2000},
    "Ben Arous": {"lat": 36.7533, "lon": 10.2219},
    "Manouba": {"lat": 36.8081, "lon": 10.0972},
    "Nabeul": {"lat": 36.4561, "lon": 10.7378},
    "Zaghouan": {"lat": 36.4029, "lon": 10.1429},
    "Beja": {"lat": 36.7256, "lon": 9.1817},
    "Kef": {"lat": 36.1741, "lon": 8.7049},
    "Siliana": {"lat": 36.0849, "lon": 9.3708},
    "Kairouan": {"lat": 35.6781, "lon": 10.0963},
    "Kasserine": {"lat": 35.1676, "lon": 8.8365},
    "Sidi Bouzid": {"lat": 35.0359, "lon": 9.4858},
    "Monastir": {"lat": 35.7833, "lon": 10.8333},
    "Mahdia": {"lat": 35.5047, "lon": 11.0622},
    "Medenine": {"lat": 33.3549, "lon": 10.5055},
    "Tataouine": {"lat": 32.9297, "lon": 10.4518},
    "Gafsa": {"lat": 34.4250, "lon": 8.7842},
    "Tozeur": {"lat": 33.9197, "lon": 8.1335},
    "Kebili": {"lat": 33.7044, "lon": 8.9692}
}

# ==================== PYDANTIC MODELS ====================

class WeatherData(BaseModel):
    temp_max: float = Field(..., example=35.0)
    temp_min: float = Field(..., example=24.0)
    temp_avg: float = Field(..., example=29.5)
    wind_speed: float = Field(..., example=45.0)
    humidity: float = Field(..., example=60.0)
    precipitation: Optional[float] = Field(0, example=71.9)
    city: str = Field("Tunis", example="Tunis")

class DateForecastRequest(BaseModel):
    date: str = Field(..., example="2026-03-15")
    city: str = Field("Tunis", example="Tunis")

class WeatherInfo(BaseModel):
    temp_max: float
    temp_min: float
    temp_avg: float
    wind_speed: float
    humidity: float
    precipitation: float
    city: str

class RiskResponse(BaseModel):
    risk_level: str
    risk_code: int
    confidence: float
    probabilities: Dict[str, float]
    city: str
    weather: WeatherInfo

# New simplified response model for merged 3-level risk
class SimplifiedRiskResponse(BaseModel):
    date: str
    city: str
    risk_level: str  # SAFE, CAUTION, or DANGER
    risk_code: int    # 0, 1, 2
    risk_emoji: str   # 🟢, 🟡, 🔴
    risk_description: str
    confidence: float
    probabilities: Dict[str, float]  # SAFE, CAUTION, DANGER percentages
    weather: Dict
    recommendations: Dict[str, str]

# Risk level mapping
RISK_NAMES = {0: "GREEN", 1: "YELLOW", 2: "ORANGE", 3: "RED", 4: "PURPLE"}
RISK_COLORS = {0: "🟢", 1: "🟡", 2: "🟠", 3: "🔴", 4: "🟣"}

# ==================== HELPER FUNCTIONS ====================

async def get_weather_forecast(date: str, city: str):
    """Fetch weather forecast from OpenWeatherMap including precipitation"""
    try:
        print(f"🌤️ Fetching weather for {city} on {date}")
        
        if city not in CITY_COORDINATES:
            return None
        
        coords = CITY_COORDINATES[city]
        params = {
            "lat": coords["lat"],
            "lon": coords["lon"],
            "appid": WEATHER_API_KEY,
            "units": "metric",
            "cnt": 40
        }
        
        response = requests.get(WEATHER_API_URL, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return None
        
        data = response.json()
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        day_forecasts = []
        
        for item in data["list"]:
            item_date = datetime.fromtimestamp(item["dt"]).date()
            if item_date == target_date:
                day_forecasts.append(item)
        
        if not day_forecasts:
            return None
        
        # Calculate daily averages
        temps_max = [f["main"]["temp_max"] for f in day_forecasts]
        temps_min = [f["main"]["temp_min"] for f in day_forecasts]
        wind_speeds = [f["wind"]["speed"] * 3.6 for f in day_forecasts]
        humidities = [f["main"]["humidity"] for f in day_forecasts]
        
        # Get precipitation
        precipitations = []
        for f in day_forecasts:
            if "rain" in f and "3h" in f["rain"]:
                precipitations.append(f["rain"]["3h"])
            else:
                precipitations.append(0)
        
        return {
            "temp_max": round(max(temps_max), 1),
            "temp_min": round(min(temps_min), 1),
            "temp_avg": round((max(temps_max) + min(temps_min)) / 2, 1),
            "wind_speed": round(sum(wind_speeds) / len(wind_speeds), 1),
            "humidity": round(sum(humidities) / len(humidities), 1),
            "precipitation": round(sum(precipitations), 1),
            "city": city,
            "date": date
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def get_simplified_recommendations(risk_level: str):
    """Get recommendations for each user group based on simplified risk level"""
    recommendations = {
        "SAFE": {
            "students": "✅ School Open",
            "delivery": "✅ Normal deliveries",
            "fishermen": "✅ Safe to fish",
            "civil": "✅ Normal monitoring",
            "public": "✅ Normal activities"
        },
        "CAUTION": {
            "students": "🟡 Monitor updates",
            "delivery": "🟡 Drive cautiously",
            "fishermen": "🟡 Stay near coast",
            "civil": "🟡 Increase awareness",
            "public": "🟡 Be aware"
        },
        "DANGER": {
            "students": "🔴 SCHOOL CLOSED",
            "delivery": "🔴 DELIVERY SUSPENDED",
            "fishermen": "🔴 PORT CLOSED - DO NOT GO OUT",
            "civil": "🔴 DEPLOY TEAMS - ACTIVATE EOC",
            "public": "🔴 STAY HOME - Take action!"
        }
    }
    return recommendations.get(risk_level, recommendations["SAFE"])

# ==================== API ENDPOINTS ====================

@app.get("/")
def root():
    return {
        "message": "WeatherGuardTN API",
        "status": "active",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "endpoints": [
            "/health",
            "/governorates", 
            "/risk-info",
            "/predict (POST) - 5-level original risk",
            "/forecast-by-date (POST) - 5-level forecast",
            "/simplified-risk (POST) - 3-level merged risk (SAFE/CAUTION/DANGER)"
        ]
    }

@app.get("/health")
def health():
    return {
        "status": "healthy", 
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None
    }

@app.get("/governorates")
def get_governorates():
    return {"governorates": sorted(CITY_COORDINATES.keys())}

@app.get("/risk-info")
def get_risk_info():
    return {
        "levels": [
            {"code": 0, "name": "GREEN", "color": "🟢", "description": "Normal conditions"},
            {"code": 1, "name": "YELLOW", "color": "🟡", "description": "Be aware"},
            {"code": 2, "name": "ORANGE", "color": "🟠", "description": "Be prepared"},
            {"code": 3, "name": "RED", "color": "🔴", "description": "Take action"},
            {"code": 4, "name": "PURPLE", "color": "🟣", "description": "Emergency"}
        ]
    }

@app.post("/predict")
async def predict_risk(weather: WeatherData):
    """Predict weather risk level with 6 features (original 5-level)"""
    
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        print(f"📥 Received request: {weather}")
        
        # Prepare 6 features including precipitation
        features = np.array([[
            float(weather.temp_max),
            float(weather.temp_min),
            float(weather.temp_avg),
            float(weather.wind_speed),
            float(weather.humidity),
            float(weather.precipitation)  # Critical 6th feature!
        ]])
        
        print(f"📊 Features shape: {features.shape}")
        print(f"📊 Features: {features}")
        
        # Scale and predict
        features_scaled = scaler.transform(features)
        pred = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]
        
        risk_code = int(pred)
        risk_level = RISK_NAMES[risk_code]
        confidence = float(max(probabilities) * 100)
        
        # Create probability dict
        prob_dict = {}
        for i in range(len(probabilities)):
            if probabilities[i] > 0.01:
                prob_dict[RISK_NAMES[i]] = round(probabilities[i] * 100, 2)
        
        print(f"🎯 Prediction: {risk_level} ({confidence:.1f}%)")
        
        return {
            "risk_level": risk_level,
            "risk_code": risk_code,
            "confidence": round(confidence, 2),
            "probabilities": prob_dict,
            "city": weather.city,
            "weather": {
                "temp_max": round(weather.temp_max, 1),
                "temp_min": round(weather.temp_min, 1),
                "temp_avg": round(weather.temp_avg, 1),
                "wind_speed": round(weather.wind_speed, 1),
                "humidity": round(weather.humidity, 1),
                "precipitation": round(weather.precipitation, 1),
                "city": weather.city
            }
        }
        
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/forecast-by-date")
async def forecast_by_date(request: DateForecastRequest):
    """Get weather forecast for a specific date and predict risk (original 5-level)"""
    
    # Get weather forecast with precipitation
    weather_data = await get_weather_forecast(request.date, request.city)
    
    if weather_data is None:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast found for {request.date}"
        )
    
    # Create WeatherData object
    weather = WeatherData(
        temp_max=weather_data["temp_max"],
        temp_min=weather_data["temp_min"],
        temp_avg=weather_data["temp_avg"],
        wind_speed=weather_data["wind_speed"],
        humidity=weather_data["humidity"],
        precipitation=weather_data["precipitation"],
        city=weather_data["city"]
    )
    
    # Get prediction
    prediction = await predict_risk(weather)
    prediction["forecast_date"] = request.date
    
    return prediction

# ==================== NEW SIMPLIFIED 3-LEVEL RISK ENDPOINT ====================

@app.post("/simplified-risk", response_model=SimplifiedRiskResponse)
async def get_simplified_risk(request: DateForecastRequest):
    """
    Returns 3-level merged risk: SAFE 🟢, CAUTION 🟡, or DANGER 🔴
    DANGER = ORANGE + RED + PURPLE (original levels 2, 3, 4)
    """
    try:
        # Get weather forecast
        weather_data = await get_weather_forecast(request.date, request.city)
        
        if weather_data is None:
            raise HTTPException(
                status_code=404,
                detail=f"No forecast found for {request.date}"
            )
        
        if model is None or scaler is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        # Prepare features
        features = np.array([[
            weather_data["temp_max"],
            weather_data["temp_min"],
            weather_data["temp_avg"],
            weather_data["wind_speed"],
            weather_data["humidity"],
            weather_data["precipitation"]
        ]])
        
        # Scale and predict
        features_scaled = scaler.transform(features)
        pred = model.predict(features_scaled)[0]  # 0-4
        probabilities = model.predict_proba(features_scaled)[0]
        
        # ===== MERGE THE 3 HIGH-RISK LEVELS =====
        # Original: 0=GREEN, 1=YELLOW, 2=ORANGE, 3=RED, 4=PURPLE
        # New: 0=SAFE (GREEN), 1=CAUTION (YELLOW), 2=DANGER (ORANGE+RED+PURPLE)
        
        if pred == 0:
            merged_risk = "SAFE"
            merged_code = 0
            merged_emoji = "🟢"
            merged_description = "Normal conditions - No action needed"
        elif pred == 1:
            merged_risk = "CAUTION"
            merged_code = 1
            merged_emoji = "🟡"
            merged_description = "Be aware - Monitor weather updates"
        else:  # pred in [2, 3, 4]
            merged_risk = "DANGER"
            merged_code = 2
            merged_emoji = "🔴"
            merged_description = "HIGH RISK - Take action! (Flood/Storm/Extreme)"
        
        # Merge probabilities (sum of ORANGE+RED+PURPLE)
        merged_probs = {
            "SAFE": round(probabilities[0] * 100, 2),
            "CAUTION": round(probabilities[1] * 100, 2),
            "DANGER": round((probabilities[2] + probabilities[3] + probabilities[4]) * 100, 2)
        }
        
        # Get the highest confidence among merged levels
        confidence = max(merged_probs.values())
        
        # Get recommendations for each user group
        recommendations = get_simplified_recommendations(merged_risk)
        
        print(f"🎯 Simplified prediction: {merged_risk} ({confidence:.1f}%)")
        
        return {
            "date": request.date,
            "city": request.city,
            "risk_level": merged_risk,
            "risk_code": merged_code,
            "risk_emoji": merged_emoji,
            "risk_description": merged_description,
            "confidence": confidence,
            "probabilities": merged_probs,
            "weather": weather_data,
            "recommendations": recommendations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in simplified-risk: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DEBUG ENDPOINTS ====================

@app.get("/debug/model-info")
def model_info():
    """Debug endpoint to check model info"""
    if model is None:
        return {"error": "Model not loaded"}
    
    return {
        "model_type": type(model).__name__,
        "features": feature_cols,
        "n_features": len(feature_cols),
        "model_loaded": True,
        "scaler_loaded": scaler is not None
    }

@app.get("/debug/test-prediction")
def test_prediction():
    """Test endpoint with sample data"""
    if model is None:
        return {"error": "Model not loaded"}
    
    test_cases = [
        {"name": "Normal Day", "data": {"temp_max": 22, "temp_min": 15, "temp_avg": 18, 
                                        "wind_speed": 15, "humidity": 65, "precipitation": 0}},
        {"name": "Hot Day", "data": {"temp_max": 38, "temp_min": 24, "temp_avg": 31, 
                                     "wind_speed": 20, "humidity": 40, "precipitation": 0}},
        {"name": "Jan 20 Flood", "data": {"temp_max": 11.1, "temp_min": 9.7, "temp_avg": 10.4, 
                                          "wind_speed": 20.1, "humidity": 99.8, "precipitation": 71.9}},
    ]
    
    results = []
    for test in test_cases:
        try:
            features = np.array([[
                test["data"]["temp_max"],
                test["data"]["temp_min"],
                test["data"]["temp_avg"],
                test["data"]["wind_speed"],
                test["data"]["humidity"],
                test["data"]["precipitation"]
            ]])
            features_scaled = scaler.transform(features)
            pred = model.predict(features_scaled)[0]
            proba = model.predict_proba(features_scaled)[0]
            
            # Calculate simplified
            if pred == 0:
                simple = "SAFE"
            elif pred == 1:
                simple = "CAUTION"
            else:
                simple = "DANGER"
            
            results.append({
                "name": test["name"],
                "original_risk": RISK_NAMES[int(pred)],
                "simplified_risk": simple,
                "confidence": float(max(proba) * 100),
                "success": True
            })
        except Exception as e:
            results.append({
                "name": test["name"],
                "error": str(e),
                "success": False
            })
    
    return {"test_results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)