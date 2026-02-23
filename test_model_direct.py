# test_model_direct.py
import joblib
import numpy as np
import glob
import os
from pathlib import Path

# Find the latest model
model_files = glob.glob("mlruns/**/artifacts/model.pkl", recursive=True)
model_files.sort(key=os.path.getmtime, reverse=True)
latest_model = model_files[0]

print(f"Loading model: {latest_model}")
model = joblib.load(latest_model)

print(f"\nModel type: {type(model).__name__}")

# Check model properties
if hasattr(model, 'n_features_in_'):
    print(f"Expected features: {model.n_features_in_}")

# For LGBMClassifier, feature_name_ is a list, not a method
if hasattr(model, 'feature_name_'):
    print(f"Feature names: {model.feature_name_}")

print("\n" + "="*60)
print("TESTING PREDICTIONS WITH CORRECT FEATURE NAMES")
print("="*60)

# The feature order from training: temp_max_fb, temp_min_fb, humidity_percent_hist_fb, wind_speed_kmh_hist_fb, city_encoded
test_cases = [
    {
        "name": "Normal conditions (Tunis)",
        "features": [25.0, 18.0, 60.0, 15.0, 1]  # temp_max_fb, temp_min_fb, humidity, wind, city_encoded
    },
    {
        "name": "Hot conditions (Tunis)",
        "features": [38.0, 24.0, 80.0, 20.0, 1]
    },
    {
        "name": "Storm conditions (Tunis)",
        "features": [22.0, 18.0, 95.0, 55.0, 1]
    },
    {
        "name": "Cold wave (Tunis)",
        "features": [5.0, -2.0, 85.0, 30.0, 1]
    },
    {
        "name": "Normal conditions (Sfax - city_encoded=6)",
        "features": [25.0, 18.0, 60.0, 15.0, 6]
    },
    {
        "name": "Extreme heat (Sfax)",
        "features": [42.0, 28.0, 15.0, 25.0, 6]
    }
]

print("\n" + "-"*60)
for test in test_cases:
    X = np.array([test["features"]], dtype=np.float32)
    
    # Get prediction
    pred = model.predict(X)[0]
    
    # Get probability
    if hasattr(model, 'predict_proba'):
        proba = model.predict_proba(X)[0]
        prob = proba[1] if len(proba) > 1 else proba[0]
    else:
        prob = float(pred)
    
    print(f"\n{test['name']}:")
    print(f"  Features: {test['features']}")
    print(f"  Prediction: {pred} (0=normal, 1=danger)")
    print(f"  Probability: {prob:.4f}")
    
    # Determine risk level
    if prob < 0.2:
        level = "GREEN"
        desc = "Conditions normales"
    elif prob < 0.4:
        level = "YELLOW"
        desc = "Soyez vigilant"
    elif prob < 0.6:
        level = "ORANGE"
        desc = "Risque élevé"
    elif prob < 0.8:
        level = "ORANGE_RED"
        desc = "Risque très élevé"
    else:
        level = "RED"
        desc = "DANGER EXTRÊME"
    print(f"  Risk Level: {level} - {desc}")

print("\n" + "="*60)
print("Checking if predictions vary with different inputs:")
print("="*60)

# Test if the model is actually sensitive to input changes
base_features = [25.0, 18.0, 60.0, 15.0, 1]
variations = [
    ("Base case", base_features),
    ("Higher temp", [35.0, 18.0, 60.0, 15.0, 1]),
    ("Higher humidity", [25.0, 18.0, 90.0, 15.0, 1]),
    ("Higher wind", [25.0, 18.0, 60.0, 45.0, 1]),
    ("Different city", [25.0, 18.0, 60.0, 15.0, 6]),
]

print("\nProbability variations:")
for name, feats in variations:
    X = np.array([feats], dtype=np.float32)
    proba = model.predict_proba(X)[0]
    prob = proba[1] if len(proba) > 1 else proba[0]
    print(f"  {name:15} : {prob:.4f}")