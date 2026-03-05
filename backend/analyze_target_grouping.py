# backend/analyze_target_grouping.py

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
import lightgbm as lgb
import warnings
warnings.filterwarnings('ignore')

print("="*70)
print("🔍 TARGET VARIABLE GROUPING ANALYSIS")
print("="*70)

# Load your complete dataset
df = pd.read_csv('data/merged_data_complete_2016_2026.csv')
print(f"\n📊 Total samples: {len(df)}")

# Original distribution
print("\n📈 ORIGINAL RISK DISTRIBUTION (5 levels):")
orig_dist = df['danger_label'].value_counts().sort_index()
risk_names = {0: 'GREEN', 1: 'YELLOW', 2: 'ORANGE', 3: 'RED', 4: 'PURPLE'}

for label in range(5):
    count = orig_dist.get(label, 0)
    pct = count/len(df)*100
    print(f"   {risk_names[label]}: {count:5d} ({pct:5.1f}%)")

# Create different grouping strategies
df_copy = df.copy()

# Strategy 1: Merge Orange+Red+Purple into one "HIGH RISK" category
df_copy['target_merged_high'] = df_copy['danger_label'].apply(
    lambda x: 0 if x == 0 else (1 if x == 1 else 2)  # 0=Green, 1=Yellow, 2=Orange+Red+Purple
)

# Strategy 2: Merge Yellow+Orange+Red into one "MODERATE+HIGH" category
df_copy['target_merged_moderate'] = df_copy['danger_label'].apply(
    lambda x: 0 if x == 0 else 1  # 0=Green, 1=Yellow+Orange+Red+Purple
)

# Strategy 3: Binary classification (Green vs Rest)
df_copy['target_binary'] = df_copy['danger_label'].apply(
    lambda x: 0 if x == 0 else 1  # 0=Safe, 1=Dangerous
)

# Strategy 4: Keep original but weight classes
# (will be handled in model)

print("\n" + "="*70)
print("📊 GROUPING STRATEGIES COMPARISON")
print("="*70)

strategies = {
    'Original (5 levels)': df['danger_label'],
    'Merged High (Green/Yellow/High)': df_copy['target_merged_high'],
    'Merged Moderate (Green/Rest)': df_copy['target_merged_moderate'],
    'Binary (Safe/Danger)': df_copy['target_binary']
}

for name, target in strategies.items():
    print(f"\n📌 {name}:")
    dist = target.value_counts().sort_index()
    if name == 'Original (5 levels)':
        labels = ['Green', 'Yellow', 'Orange', 'Red', 'Purple']
    elif name == 'Merged High (Green/Yellow/High)':
        labels = ['Green', 'Yellow', 'High (Orange+Red+Purple)']
    elif name == 'Merged Moderate (Green/Rest)':
        labels = ['Green', 'Rest (Yellow+Orange+Red+Purple)']
    else:
        labels = ['Safe', 'Dangerous']
    
    for i, count in enumerate(dist):
        pct = count/len(df)*100
        print(f"   {labels[i]}: {count:5d} ({pct:5.1f}%)")

# Train models for each strategy
print("\n" + "="*70)
print("🤖 MODEL PERFORMANCE COMPARISON")
print("="*70)

feature_cols = ['temp_max', 'temp_min', 'temp_avg', 'wind_speed', 'humidity']
X = df[feature_cols].fillna(df[feature_cols].mean())

results = {}

for strategy_name, y in strategies.items():
    print(f"\n📌 Training: {strategy_name}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train model
    model = lgb.LGBMClassifier(
        n_estimators=100,
        max_depth=8,
        learning_rate=0.1,
        random_state=42,
        verbose=-1
    )
    
    model.fit(X_train, y_train)
    
    # Predict
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    
    # For multi-class, use macro F1
    if len(np.unique(y)) > 2:
        f1 = f1_score(y_test, y_pred, average='macro')
    else:
        f1 = f1_score(y_test, y_pred, average='binary')
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5)
    
    results[strategy_name] = {
        'accuracy': accuracy,
        'f1_score': f1,
        'cv_mean': cv_scores.mean(),
        'cv_std': cv_scores.std(),
        'model': model,
        'classes': len(np.unique(y))
    }
    
    print(f"   Accuracy: {accuracy:.4f}")
    print(f"   F1-Score: {f1:.4f}")
    print(f"   CV: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
    
    # Show confusion matrix for best strategy
    if strategy_name == 'Merged High (Green/Yellow/High)':
        cm = confusion_matrix(y_test, y_pred)
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                   xticklabels=['Green', 'Yellow', 'High'],
                   yticklabels=['Green', 'Yellow', 'High'])
        plt.title('Confusion Matrix - Merged High Strategy')
        plt.tight_layout()
        plt.savefig('eda_results/confusion_matrix_merged_high.png')
        plt.show()

# Compare results
print("\n" + "="*70)
print("📊 FINAL COMPARISON TABLE")
print("="*70)

print(f"\n{'Strategy':<35} {'Classes':<8} {'Accuracy':<10} {'F1-Score':<10} {'CV Mean':<10}")
print("-" * 70)

best_f1 = 0
best_strategy = None

for name, metrics in results.items():
    print(f"{name:<35} {metrics['classes']:<8} "
          f"{metrics['accuracy']:.4f}    "
          f"{metrics['f1_score']:.4f}    "
          f"{metrics['cv_mean']:.4f}")
    
    if metrics['f1_score'] > best_f1:
        best_f1 = metrics['f1_score']
        best_strategy = name

print("-" * 70)
print(f"\n🏆 BEST STRATEGY: {best_strategy} (F1-Score: {best_f1:.4f})")

# Analyze school closure scenario with best strategy
print("\n" + "="*70)
print("🏫 SCHOOL CLOSURE SCENARIO ANALYSIS")
print("="*70)

# Test with typical closure conditions
closure_scenarios = [
    {
        "name": "Heavy Rain - Jendouba",
        "weather": [12, 6, 9, 75, 98],
        "expected": "High Risk"  # Should be Orange/Red
    },
    {
        "name": "Strong Storm - Bizerte",
        "weather": [14, 8, 11, 85, 95],
        "expected": "High Risk"
    },
    {
        "name": "Normal Winter Day - Tunis",
        "weather": [16, 10, 13, 25, 70],
        "expected": "Green/Yellow"
    },
    {
        "name": "Moderate Rain - Sousse",
        "weather": [15, 9, 12, 45, 85],
        "expected": "Yellow/Orange"
    }
]

# Use the best model
best_model = results[best_strategy]['model']

print("\n📋 Predictions with best strategy:")
for scenario in closure_scenarios:
    features = np.array([scenario['weather']])
    pred = best_model.predict(features)[0]
    proba = best_model.predict_proba(features)[0]
    
    # Map prediction to label based on strategy
    if best_strategy == 'Original (5 levels)':
        labels = ['GREEN', 'YELLOW', 'ORANGE', 'RED', 'PURPLE']
        pred_label = labels[pred] if pred < len(labels) else 'UNKNOWN'
    elif best_strategy == 'Merged High (Green/Yellow/High)':
        labels = ['GREEN', 'YELLOW', 'HIGH']
        pred_label = labels[pred]
    elif best_strategy == 'Merged Moderate (Green/Rest)':
        labels = ['GREEN', 'REST']
        pred_label = labels[pred]
    else:
        labels = ['SAFE', 'DANGEROUS']
        pred_label = labels[pred]
    
    confidence = max(proba) * 100
    
    print(f"\n📍 {scenario['name']}")
    print(f"   Weather: T={scenario['weather'][0]}°C, Wind={scenario['weather'][3]} km/h")
    print(f"   Predicted: {pred_label} (confidence: {confidence:.1f}%)")
    print(f"   Expected: {scenario['expected']}")
    print(f"   Match: {'✅' if pred_label in scenario['expected'] else '❌'}")

print("\n" + "="*70)
print("📋 RECOMMENDATION")
print("="*70)

print("""
Based on the analysis:

✅ If you need granular warnings (different responses for different risk levels):
   → Keep ORIGINAL 5 levels (if Red/Purple samples increase with new data)

✅ If you want balanced performance with limited Red samples:
   → Use MERGED HIGH (Green/Yellow/High) - combines Orange+Red+Purple

✅ If you only need binary decision (close schools or not):
   → Use BINARY (Safe/Dangerous) - simplest, often most robust

✅ If Yellow is also actionable (e.g., advise caution):
   → Use MERGED MODERATE (Green/Rest) - combines all non-Green

My recommendation for SCHOOL CLOSURE prediction:
🔴 HIGH RISK = Orange+Red+Purple (definitely close schools)
🟡 YELLOW = Be aware, monitor (maybe delay, not close)
🟢 GREEN = Normal operations

This gives you 3 actionable levels without losing too much granularity.
""")