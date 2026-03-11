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
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded: {type(model).__name__}")
    else:
        print(f"❌ Model not found: {MODEL_PATH}")
        model = None
    
    if os.path.exists(SCALER_PATH):
        scaler = joblib.load(SCALER_PATH)
        print(f"✅ Scaler loaded (expects {scaler.n_features_in_} features)")
    else:
        print(f"❌ Scaler not found: {SCALER_PATH}")
        scaler = None
    
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
CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"

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

# Risk level mapping
RISK_NAMES = {0: "GREEN", 1: "YELLOW", 2: "ORANGE", 3: "RED", 4: "PURPLE"}
RISK_COLORS = {0: "🟢", 1: "🟡", 2: "🟠", 3: "🔴", 4: "🟣"}

# ==================== HELPER FUNCTIONS ====================

async def get_weather_forecast(date: str, city: str):
    """Fetch weather forecast from OpenWeatherMap including precipitation"""
    try:
        print(f"🌤️ Fetching forecast for {city} on {date}")
        
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
        
        temps_max = [f["main"]["temp_max"] for f in day_forecasts]
        temps_min = [f["main"]["temp_min"] for f in day_forecasts]
        wind_speeds = [f["wind"]["speed"] * 3.6 for f in day_forecasts]
        humidities = [f["main"]["humidity"] for f in day_forecasts]
        
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

async def get_current_weather(city: str):
    """Fetch current weather from OpenWeatherMap"""
    try:
        print(f"🌤️ Fetching current weather for {city}")
        
        if city not in CITY_COORDINATES:
            return None
        
        coords = CITY_COORDINATES[city]
        params = {
            "lat": coords["lat"],
            "lon": coords["lon"],
            "appid": WEATHER_API_KEY,
            "units": "metric"
        }
        
        response = requests.get(CURRENT_WEATHER_URL, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code}")
            return None
        
        data = response.json()
        
        precipitation = 0
        if "rain" in data and "1h" in data["rain"]:
            precipitation = data["rain"]["1h"]
        
        return {
            "temp_max": round(data["main"]["temp_max"], 1),
            "temp_min": round(data["main"]["temp_min"], 1),
            "temp_avg": round(data["main"]["temp"], 1),
            "wind_speed": round(data["wind"]["speed"] * 3.6, 1),
            "humidity": data["main"]["humidity"],
            "precipitation": precipitation,
            "city": city,
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

# ==================== PREDICTION HELPER ====================

async def get_prediction_from_weather(weather_data: dict):
    """Get risk prediction from weather data"""
    features = np.array([[
        weather_data["temp_max"],
        weather_data["temp_min"],
        weather_data["temp_avg"],
        weather_data["wind_speed"],
        weather_data["humidity"],
        weather_data["precipitation"]
    ]])
    
    features_scaled = scaler.transform(features)
    pred = model.predict(features_scaled)[0]
    probabilities = model.predict_proba(features_scaled)[0]
    
    risk_code = int(pred)
    risk_level = RISK_NAMES[risk_code]
    confidence = float(max(probabilities) * 100)
    
    prob_dict = {}
    for i in range(len(probabilities)):
        if probabilities[i] > 0.01:
            prob_dict[RISK_NAMES[i]] = round(probabilities[i] * 100, 2)
    
    return {
        "risk_level": risk_level,
        "risk_code": risk_code,
        "confidence": round(confidence, 2),
        "probabilities": prob_dict
    }

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
            "/predict (POST)",
            "/forecast-by-date (POST)",
            "/current-weather (POST)"
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
    """Predict weather risk level with 6 features"""
    
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        weather_data = {
            "temp_max": weather.temp_max,
            "temp_min": weather.temp_min,
            "temp_avg": weather.temp_avg,
            "wind_speed": weather.wind_speed,
            "humidity": weather.humidity,
            "precipitation": weather.precipitation
        }
        
        prediction = await get_prediction_from_weather(weather_data)
        
        return {
            **prediction,
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
    """Get weather forecast for a specific date and predict risk"""
    
    weather_data = await get_weather_forecast(request.date, request.city)
    
    if weather_data is None:
        raise HTTPException(
            status_code=404,
            detail=f"No forecast found for {request.date}"
        )
    
    prediction = await get_prediction_from_weather(weather_data)
    
    return {
        **prediction,
        "city": request.city,
        "weather": weather_data,
        "forecast_date": request.date
    }

@app.post("/current-weather")
async def current_weather(request: DateForecastRequest):
    """Get current weather for a city (for today's date)"""
    
    weather_data = await get_current_weather(request.city)
    
    if weather_data is None:
        raise HTTPException(
            status_code=404,
            detail=f"No current weather found for {request.city}"
        )
    
    prediction = await get_prediction_from_weather(weather_data)
    
    return {
        **prediction,
        "city": request.city,
        "weather": weather_data,
        "current_date": weather_data["date"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)