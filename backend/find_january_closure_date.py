# backend/find_january_closure_date.py

import pandas as pd
import requests
from datetime import datetime, timedelta

print("="*60)
print("🔍 SEARCHING FOR JANUARY 2026 SCHOOL CLOSURE DATE")
print("="*60)

# Load your data
df = pd.read_csv('data/merged_data_complete_2016_2026.csv')

# Focus on January 2026
jan_2026 = df[df['date'].str.startswith('2026-01')].copy()
print(f"\n📅 Found {len(jan_2026)} records in January 2026")

if len(jan_2026) == 0:
    print("❌ No January 2026 data found!")
    exit()

# Convert date to datetime for sorting
jan_2026['date_dt'] = pd.to_datetime(jan_2026['date'])

# Sort by date
jan_2026 = jan_2026.sort_values('date_dt')

# Display all January days with their risk levels
print("\n📋 JANUARY 2026 - DAILY WEATHER BY CITY:")
print("-" * 80)
print(f"{'Date':<12} {'City':<15} {'Risk':<8} {'Temp':<8} {'Wind':<8} {'Action'}")
print("-" * 80)

risk_names = {0: 'GREEN', 1: 'YELLOW', 2: 'ORANGE', 3: 'RED', 4: 'PURPLE'}

for _, row in jan_2026.iterrows():
    risk = risk_names[row['danger_label']]
    
    # Emoji based on risk
    emoji = {0: '🟢', 1: '🟡', 2: '🟠', 3: '🔴', 4: '🟣'}[row['danger_label']]
    
    # School closure likely if Orange or Red
    closure = "🏫 CLOSE" if row['danger_label'] >= 2 else "✅ OPEN"
    
    print(f"{row['date']:<12} {row['city']:<15} {emoji} {risk:<6} "
          f"{row['temp_max']:<8}°C {row['wind_speed']:<8}km/h {closure}")

# Find the HIGHEST risk days in January
print("\n" + "="*60)
print("⚠️ HIGHEST RISK DAYS IN JANUARY 2026")
print("="*60)

high_risk_days = jan_2026[jan_2026['danger_label'] >= 2].sort_values('danger_label', ascending=False)

if len(high_risk_days) > 0:
    print(f"\nFound {len(high_risk_days)} high-risk days (Orange or Red):")
    print("-" * 80)
    print(f"{'Date':<12} {'City':<15} {'Risk':<8} {'Temp':<8} {'Wind':<8}")
    print("-" * 80)
    
    for _, row in high_risk_days.iterrows():
        risk = risk_names[row['danger_label']]
        emoji = {2: '🟠', 3: '🔴', 4: '🟣'}[row['danger_label']]
        print(f"{row['date']:<12} {row['city']:<15} {emoji} {risk:<6} "
              f"{row['temp_max']:<8}°C {row['wind_speed']:<8}km/h")
    
    # Suggest most likely closure date
    most_severe = high_risk_days.iloc[0]
    print(f"\n🎯 MOST LIKELY CLOSURE DATE: {most_severe['date']} in {most_severe['city']}")
    print(f"   Weather: {most_severe['temp_max']}°C, wind {most_severe['wind_speed']} km/h")
    
else:
    print("\n❌ No Orange or Red days found in January 2026!")
    print("This suggests either:")
    print("1. The flood events are not in this dataset")
    print("2. The floods happened in a different month")
    print("3. Your risk thresholds need adjustment")

# Check late January (maybe floods were after the 20th)
late_jan = jan_2026[jan_2026['date_dt'] >= '2026-01-20']
if len(late_jan) > 0:
    late_high = late_jan[late_jan['danger_label'] >= 2]
    if len(late_high) > 0:
        print(f"\n📅 Late January ({late_high['date'].min()} to {late_high['date'].max()}):")
        for _, row in late_high.iterrows():
            print(f"   {row['date']}: {risk_names[row['danger_label']]} in {row['city']}")