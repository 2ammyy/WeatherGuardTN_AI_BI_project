# backend/retrain_scaler.py

import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import StandardScaler
import os

print("="*60)
print("🔄 RETRAINING SCALER WITH 6 FEATURES")
print("="*60)

# Load your complete dataset
df = pd.read_csv('data/merged_data_complete_2016_2026.csv')
print(f"✅ Loaded {len(df)} records")

# Features with precipitation (6 features)
feature_cols = ['temp_max', 'temp_min', 'temp_avg', 'wind_speed', 'humidity', 'precipitation']

# Prepare features
X = df[feature_cols].fillna(0)

print(f"\n📊 Feature matrix shape: {X.shape}")
print(f"Features: {feature_cols}")

# Retrain scaler
print("\n🔄 Training new scaler...")
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print(f"✅ Scaler trained on {X.shape[1]} features")

# Save the new scaler
scaler_path = 'mlartifacts/scaler_6features.pkl'
joblib.dump(scaler, scaler_path)
print(f"✅ New scaler saved to: {scaler_path}")

# Also save feature list
feature_path = 'mlartifacts/feature_cols_6.pkl'
joblib.dump(feature_cols, feature_path)
print(f"✅ Feature list saved to: {feature_path}")

# Test the scaler
test_features = np.array([[11.1, 9.7, 10.4, 20.1, 99.8, 71.9]])
test_scaled = scaler.transform(test_features)
print(f"\n✅ Test successful! Scaler accepts 6 features")
print(f"Test scaled shape: {test_scaled.shape}")

print("\n" + "="*60)
print("🚀 NEXT STEP: Update weather_risk.py to use new scaler")
print("="*60)
print("""
In weather_risk.py, change:
SCALER_PATH = "mlartifacts/scaler.pkl"
TO:
SCALER_PATH = "mlartifacts/scaler_6features.pkl"

And update FEATURES_PATH to use the new feature list.
""")