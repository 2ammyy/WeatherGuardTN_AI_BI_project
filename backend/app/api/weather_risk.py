# backend/app/api/weather_risk.py

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
import pandas as pd
from typing import List, Dict, Optional
import os
import traceback

app = FastAPI(title="WeatherGuardTN API")

# Load model at startup
MODEL_PATH = "mlartifacts/clean_data_model.pkl"
SCALER_PATH = "mlartifacts/scaler.pkl"
ENCODER_PATH = "mlartifacts/label_encoder.pkl"
FEATURES_PATH = "mlartifacts/feature_columns.pkl"

print("📦 Loading model and preprocessors...")
try:
    # Check if files exist
    for path in [MODEL_PATH, SCALER_PATH, ENCODER_PATH, FEATURES_PATH]:
        if not os.path.exists(path):
            print(f"❌ File not found: {path}")
    
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    encoder = joblib.load(ENCODER_PATH)
    feature_cols = joblib.load(FEATURES_PATH)
    
    print(f"✅ Model loaded successfully!")
    print(f"📊 Model type: {type(model).__name__}")
    print(f"📊 Features: {feature_cols}")
    
except Exception as e:
    print(f"❌ Error loading model: {e}")
    traceback.print_exc()
    model = None
    scaler = None
    encoder = None
    feature_cols = None

# Define request model
class WeatherData(BaseModel):
    temp_max: float = Field(..., description="Maximum temperature in °C", example=35.0)
    temp_min: float = Field(..., description="Minimum temperature in °C", example=24.0)
    temp_avg: float = Field(..., description="Average temperature in °C", example=29.5)
    wind_speed: float = Field(..., description="Wind speed in km/h", example=45.0)
    humidity: float = Field(..., description="Humidity percentage (0-100)", example=60.0)
    city: str = Field("Unknown", description="City name", example="Tunis")

# Define nested weather info model for response
class WeatherInfo(BaseModel):
    """Weather data included in response"""
    temp_max: float
    temp_min: float
    temp_avg: float
    wind_speed: float
    humidity: float
    city: str

# Define response model
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
RISK_DESCRIPTIONS = {
    "GREEN": "Normal conditions - No action needed",
    "YELLOW": "Be aware - Monitor weather updates",
    "ORANGE": "Be prepared - Possible disruptions",
    "RED": "Take action - Protect life and property",
    "PURPLE": "Emergency - Immediate response needed"
}

@app.get("/")
def root():
    return {
        "message": "WeatherGuardTN API",
        "status": "active",
        "model_loaded": model is not None
    }

@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/predict", response_model=RiskResponse)
async def predict_risk(weather: WeatherData):
    """Predict weather risk level based on weather data"""
    
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        print(f"📥 Received request: {weather}")
        
        # Prepare features in the exact order the model expects
        features = np.array([[
            float(weather.temp_max),
            float(weather.temp_min),
            float(weather.temp_avg),
            float(weather.wind_speed),
            float(weather.humidity)
        ]])
        
        print(f"📊 Features shape: {features.shape}")
        print(f"📊 Features: {features}")
        
        # Scale features
        features_scaled = scaler.transform(features)
        print(f"📊 Scaled features shape: {features_scaled.shape}")
        
        # Predict
        pred = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]
        
        print(f"🎯 Prediction: {pred}")
        print(f"📊 Probabilities: {probabilities}")
        
        # Get risk level
        risk_code = int(pred)
        risk_level = RISK_NAMES[risk_code]
        confidence = float(max(probabilities) * 100)
        
        # Create probability dictionary
        prob_dict = {}
        for i in range(len(probabilities)):
            prob_value = float(probabilities[i] * 100)
            if prob_value > 0.1:  # Show all non-zero probabilities
                prob_dict[RISK_NAMES[i]] = round(prob_value, 2)
        
        # Create response with proper typing
        response = RiskResponse(
            risk_level=risk_level,
            risk_code=risk_code,
            confidence=round(confidence, 2),
            probabilities=prob_dict,
            city=weather.city,
            weather=WeatherInfo(
                temp_max=round(weather.temp_max, 1),
                temp_min=round(weather.temp_min, 1),
                temp_avg=round(weather.temp_avg, 1),
                wind_speed=round(weather.wind_speed, 1),
                humidity=round(weather.humidity, 1),
                city=weather.city
            )
        )
        
        print(f"✅ Response prepared")
        return response
        
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/governorates")
def get_governorates():
    """List of Tunisian governorates"""
    governorates = [
        "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan",
        "Bizerte", "Beja", "Jendouba", "Kef", "Siliana", "Sousse",
        "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid",
        "Gabes", "Medenine", "Tataouine", "Gafsa", "Tozeur", "Kebili"
    ]
    return {"governorates": sorted(governorates)}

@app.get("/risk-info")
def get_risk_info():
    """Information about risk levels"""
    return {
        "levels": [
            {
                "name": name,
                "code": code,
                "color": RISK_COLORS[code],
                "description": RISK_DESCRIPTIONS[name]
            }
            for code, name in RISK_NAMES.items()
        ]
    }

@app.get("/debug/model-info")
def model_info():
    """Debug endpoint to check model info"""
    if model is None:
        return {"error": "Model not loaded"}
    
    return {
        "model_type": type(model).__name__,
        "features": feature_cols,
        "classes": list(RISK_NAMES.values()),
        "n_features": len(feature_cols) if feature_cols else 0,
        "model_loaded": True
    }

@app.get("/debug/test-prediction")
def test_prediction():
    """Test endpoint with sample data"""
    if model is None:
        return {"error": "Model not loaded"}
    
    test_cases = [
        {"name": "Normal Day", "data": {"temp_max": 22, "temp_min": 15, "temp_avg": 18, "wind_speed": 15, "humidity": 65}},
        {"name": "Hot Day", "data": {"temp_max": 38, "temp_min": 24, "temp_avg": 31, "wind_speed": 20, "humidity": 40}},
        {"name": "Windy Day", "data": {"temp_max": 24, "temp_min": 18, "temp_avg": 21, "wind_speed": 55, "humidity": 70}},
    ]
    
    results = []
    for test in test_cases:
        try:
            features = np.array([[
                test["data"]["temp_max"],
                test["data"]["temp_min"],
                test["data"]["temp_avg"],
                test["data"]["wind_speed"],
                test["data"]["humidity"]
            ]])
            features_scaled = scaler.transform(features)
            pred = model.predict(features_scaled)[0]
            proba = model.predict_proba(features_scaled)[0]
            
            results.append({
                "name": test["name"],
                "prediction": int(pred),
                "risk_level": RISK_NAMES[int(pred)],
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