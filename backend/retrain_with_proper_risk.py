# backend/retrain_with_proper_risk.py

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
import lightgbm as lgb
import joblib

print("="*60)
print("🔄 RETRAINING MODEL WITH PROPER RAIN WEIGHTING")
print("="*60)

# Load your data
df = pd.read_csv('data/merged_data_complete_2016_2026.csv')

# RECALCULATE danger_label with proper rain weighting
def calculate_proper_risk(row):
    risk_score = 0
    
    # Get precipitation if available
    precip = row.get('precipitation', 0)
    if pd.isna(precip):
        precip = 0
    
    # HEAVY RAIN - THIS IS CRITICAL!
    if precip > 50:
        risk_score += 4  # RED
        print(f"⚠️ Heavy rain detected: {precip}mm")
    elif precip > 30:
        risk_score += 3  # ORANGE
    elif precip > 15:
        risk_score += 2  # YELLOW
    elif precip > 5:
        risk_score += 1  # Light rain
    
    # Wind (secondary)
    wind = row.get('wind_speed', 0)
    if wind > 70:
        risk_score += 3
    elif wind > 50:
        risk_score += 2
    elif wind > 30:
        risk_score += 1
    
    # Cap at 4 (RED)
    return min(risk_score, 4)

print("\n📊 Recalculating risk levels with proper rain weighting...")
df['proper_risk'] = df.apply(calculate_proper_risk, axis=1)

# Show new distribution
print("\n📈 NEW RISK DISTRIBUTION:")
new_dist = df['proper_risk'].value_counts().sort_index()
risk_names = {0: 'GREEN', 1: 'YELLOW', 2: 'ORANGE', 3: 'RED', 4: 'PURPLE'}
for level in range(5):
    count = new_dist.get(level, 0)
    pct = count/len(df)*100
    print(f"   {risk_names[level]}: {count:5d} ({pct:.1f}%)")

# Prepare features (include precipitation!)
feature_cols = ['temp_max', 'temp_min', 'temp_avg', 'wind_speed', 'humidity', 'precipitation']
X = df[feature_cols].fillna(0)  # Fill missing precip with 0
y = df['proper_risk']

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train new model
print("\n🤖 Training new model...")
model = lgb.LGBMClassifier(
    n_estimators=300,
    max_depth=12,
    learning_rate=0.1,
    random_state=42,
    class_weight='balanced',  # Handle imbalance
    verbose=-1
)

model.fit(X_train, y_train)

# Test with January 20 data
jan20_features = np.array([[11.1, 9.7, 10.4, 20.1, 99.8, 71.9]])
pred = model.predict(jan20_features)[0]
proba = model.predict_proba(jan20_features)[0]

print(f"\n🌊 Testing January 20, 2026 (71.9mm rain):")
print(f"   Predicted risk level: {risk_names[pred]}")
print(f"   Probabilities: GREEN={proba[0]:.2%}, YELLOW={proba[1]:.2%}, "
      f"ORANGE={proba[2]:.2%}, RED={proba[3]:.2%}")

if pred >= 2:  # ORANGE or RED
    print("✅ CORRECT! Model recognizes heavy rain as dangerous.")
else:
    print("❌ Model still not recognizing heavy rain!")

# Evaluate on test set
y_pred = model.predict(X_test)
accuracy = (y_pred == y_test).mean()
print(f"\n📊 Model accuracy: {accuracy:.2%}")

# Save new model
joblib.dump(model, 'mlartifacts/proper_rain_model.pkl')
print("\n✅ New model saved to: mlartifacts/proper_rain_model.pkl")