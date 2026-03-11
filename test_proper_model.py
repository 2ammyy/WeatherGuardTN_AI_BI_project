import joblib
import numpy as np

print("🔍 Testing PROPER RAIN MODEL (6 features)")

# Load the proper model
model = joblib.load("mlartifacts/proper_rain_model.pkl")
scaler = joblib.load("mlartifacts/scaler_6features.pkl")

# January 20 data with precipitation
jan20 = np.array([[11.1, 9.7, 10.4, 20.1, 99.8, 71.9]])

# Scale and predict
scaled = scaler.transform(jan20)
pred = model.predict(scaled)[0]
proba = model.predict_proba(scaled)[0]

risk_names = {0: "GREEN", 1: "YELLOW", 2: "ORANGE", 3: "RED", 4: "PURPLE"}

print(f"\n🌊 January 20, 2026 (71.9mm rain)")
print(f"   Prediction: {risk_names[pred]}")
print(f"   Confidence: {max(proba)*100:.2f}%")
print(f"   Probabilities: GREEN={proba[0]:.2%}, YELLOW={proba[1]:.2%}, ORANGE={proba[2]:.2%}, RED={proba[3]:.2%}, PURPLE={proba[4]:.2%}")