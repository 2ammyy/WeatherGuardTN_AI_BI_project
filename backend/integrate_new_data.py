# backend/integrate_new_data.py

import pandas as pd
import numpy as np
from datetime import datetime
import os

print("="*60)
print("🔄 INTEGRATING NEW HISTORICAL DATA (2024-2026)")
print("="*60)

# Load existing data (2016-2024)
print("\n📂 Loading existing data (2016-2024)...")
existing_df = pd.read_csv('data/merged_data_clean.csv')
print(f"✅ Existing records: {len(existing_df)}")
print(f"   Date range: {existing_df['date'].min()} to {existing_df['date'].max()}")

# Load new data (2024-2026) - USING YOUR EXACT PATH
print("\n📂 Loading new data (2024-2026)...")
new_file_path = 'backend/data/historical/tunisia 2024-01-02 to 2026-03-20.csv'
new_df = pd.read_csv(new_file_path)
print(f"✅ New records: {len(new_df)}")
print(f"   Date range: {new_df['datetime'].min()} to {new_df['datetime'].max()}")

# Display first few rows to verify
print("\n👀 First 3 rows of new data:")
print(new_df[['name', 'datetime', 'tempmax', 'tempmin', 'windspeed']].head(3))

# Standardize column names
print("\n🔄 Standardizing column names...")
column_mapping = {
    'name': 'city',
    'datetime': 'date',
    'tempmax': 'temp_max',
    'tempmin': 'temp_min',
    'temp': 'temp_avg',
    'windspeed': 'wind_speed',
    'humidity': 'humidity',
    'precip': 'precipitation'
}

# Rename columns that exist
for old_col, new_col in column_mapping.items():
    if old_col in new_df.columns:
        new_df = new_df.rename(columns={old_col: new_col})
        print(f"  ✅ Renamed {old_col} → {new_col}")

# Keep only relevant columns
keep_cols = ['city', 'date', 'temp_max', 'temp_min', 'temp_avg', 
             'wind_speed', 'humidity', 'precipitation']
new_df = new_df[[col for col in keep_cols if col in new_df.columns]]

# Check for missing values
print("\n🔍 Checking for missing values:")
print(new_df.isnull().sum())

# Calculate danger labels for new data
print("\n⚠️ Calculating danger labels for new data...")

def calculate_risk_level(row):
    risk_score = 0
    
    # Temperature risk
    if pd.notna(row.get('temp_max')):
        if row['temp_max'] > 40:
            risk_score += 4
        elif row['temp_max'] > 35:
            risk_score += 3
        elif row['temp_max'] > 30:
            risk_score += 2
        elif row['temp_max'] > 25:
            risk_score += 1
    
    # Wind risk
    if pd.notna(row.get('wind_speed')):
        if row['wind_speed'] > 80:
            risk_score += 4
        elif row['wind_speed'] > 60:
            risk_score += 3
        elif row['wind_speed'] > 40:
            risk_score += 2
        elif row['wind_speed'] > 20:
            risk_score += 1
    
    # Precipitation risk
    if pd.notna(row.get('precipitation')):
        if row['precipitation'] > 60:
            risk_score += 4
        elif row['precipitation'] > 40:
            risk_score += 3
        elif row['precipitation'] > 20:
            risk_score += 2
        elif row['precipitation'] > 10:
            risk_score += 1
    
    # Map score to risk level (0-4)
    if risk_score >= 8:
        return 4  # Purple
    elif risk_score >= 6:
        return 3  # Red
    elif risk_score >= 4:
        return 2  # Orange
    elif risk_score >= 2:
        return 1  # Yellow
    else:
        return 0  # Green

# Apply risk calculation
new_df['danger_label'] = new_df.apply(calculate_risk_level, axis=1)

# Check January 2026 specifically in new data
print("\n🌊 CHECKING JANUARY 2026 IN NEW DATA:")
jan_2026_new = new_df[
    (new_df['date'] >= '2026-01-01') & 
    (new_df['date'] <= '2026-01-31')
]

if len(jan_2026_new) > 0:
    print(f"✅ Found {len(jan_2026_new)} records in January 2026")
    
    # Show risk distribution for January 2026
    risk_counts = jan_2026_new['danger_label'].value_counts().sort_index()
    risk_names = {0: 'Green', 1: 'Yellow', 2: 'Orange', 3: 'Red', 4: 'Purple'}
    
    print("\n📊 January 2026 Risk Distribution:")
    for label in range(5):
        count = risk_counts.get(label, 0)
        if count > 0:
            print(f"   {risk_names[label]}: {count}")
    
    # Show high-risk days (potential flood events)
    high_risk = jan_2026_new[jan_2026_new['danger_label'] >= 2]
    if len(high_risk) > 0:
        print(f"\n⚠️ High Risk Days in January 2026:")
        for _, row in high_risk.iterrows():
            risk_name = risk_names[row['danger_label']]
            print(f"   • {row['date']} - {row['city']}: {risk_name} "
                  f"(T={row['temp_max']}°C, W={row['wind_speed']} km/h)")
else:
    print("❌ No January 2026 data found!")

# Combine datasets
print("\n🔗 Combining old and new data...")
combined_df = pd.concat([existing_df, new_df], ignore_index=True)

# Remove duplicates based on date and city
combined_df = combined_df.drop_duplicates(subset=['date', 'city'], keep='last')

print(f"\n📊 FINAL DATASET STATISTICS:")
print(f"   Total records: {len(combined_df)}")
print(f"   Date range: {combined_df['date'].min()} to {combined_df['date'].max()}")
print(f"   Cities: {combined_df['city'].nunique()}")

# Show final risk distribution
print(f"\n📈 COMPLETE RISK DISTRIBUTION (2016-2026):")
risk_counts = combined_df['danger_label'].value_counts().sort_index()
risk_names = {0: 'Green', 1: 'Yellow', 2: 'Orange', 3: 'Red', 4: 'Purple'}
red_count = 0

for label in range(5):
    count = risk_counts.get(label, 0)
    pct = count/len(combined_df)*100
    print(f"   {risk_names[label]}: {count:5d} ({pct:5.1f}%)")
    if label == 3:
        red_count = count

print(f"\n🔴 TOTAL RED LEVEL SAMPLES: {red_count}")

# Save combined dataset
output_file = 'data/merged_data_complete_2016_2026.csv'
combined_df.to_csv(output_file, index=False)
print(f"\n✅ Combined dataset saved to: {output_file}")

print("\n" + "="*60)
print("🎯 NEXT STEPS:")
print("1. Check if Red level count increased")
print("2. Retrain model with complete data")
print("3. Test January 2026 flood dates")
print("="*60)