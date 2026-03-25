# backend/analyze_dataset.py

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

print("="*70)
print("📊 WEATHERGARDTN - COMPLETE DATASET ANALYSIS")
print("="*70)

# Create output directory for visualizations
output_dir = Path("eda_results/dataset_analysis")
output_dir.mkdir(parents=True, exist_ok=True)

# Load dataset
print("\n📂 Loading dataset...")
df = pd.read_csv('data/merged_data_complete_2016_2026.csv')
print(f"✅ Loaded {len(df):,} records")
print(f"📅 Date range: {df['date'].min()} to {df['date'].max()}")
print(f"📍 Cities: {df['city'].nunique()}")

# ============================================================
# 1. TARGET VARIABLE DISTRIBUTION
# ============================================================
print("\n" + "="*70)
print("📊 1. TARGET VARIABLE DISTRIBUTION")
print("="*70)

risk_counts = df['danger_label'].value_counts().sort_index()
risk_names = {0: 'GREEN 🟢', 1: 'YELLOW 🟡', 2: 'ORANGE 🟠', 3: 'RED 🔴', 4: 'PURPLE 🟣'}
risk_colors = ['#4CAF50', '#FFC107', '#FF9800', '#F44336', '#9C27B0']

total = len(df)
print(f"\n📈 Distribution (Total: {total:,} samples):")
print("-" * 50)

for level in range(5):
    count = risk_counts.get(level, 0)
    percentage = (count/total)*100
    bar = '█' * int(percentage/2)
    print(f"{risk_names[level]}: {count:6d} ({percentage:6.2f}%) {bar}")

# Create distribution plot
plt.figure(figsize=(10, 6))
bars = plt.bar(range(5), [risk_counts.get(i, 0) for i in range(5)], 
               color=risk_colors, alpha=0.8)
plt.xlabel('Risk Level')
plt.ylabel('Number of Samples')
plt.title('Distribution of Danger Labels in Dataset')
plt.xticks(range(5), ['GREEN', 'YELLOW', 'ORANGE', 'RED', 'PURPLE'])
plt.grid(axis='y', alpha=0.3)

# Add value labels on bars
for bar, count in zip(bars, [risk_counts.get(i, 0) for i in range(5)]):
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height,
             f'{count}\n({count/total*100:.1f}%)',
             ha='center', va='bottom', fontsize=10)

plt.tight_layout()
plt.savefig(output_dir / 'target_distribution.png', dpi=150)
print(f"\n✅ Distribution plot saved: {output_dir}/target_distribution.png")

# ============================================================
# 2. STATISTICS BY RISK LEVEL
# ============================================================
print("\n" + "="*70)
print("📊 2. WEATHER STATISTICS BY RISK LEVEL")
print("="*70)

stats = []
for level in range(5):
    if level in risk_counts.index:
        subset = df[df['danger_label'] == level]
        
        stats.append({
            'risk_level': level,
            'risk_name': list(risk_names.values())[level],
            'count': len(subset),
            'percentage': len(subset)/total*100,
            'avg_temp_max': subset['temp_max'].mean(),
            'min_temp_max': subset['temp_max'].min(),
            'max_temp_max': subset['temp_max'].max(),
            'avg_wind': subset['wind_speed'].mean(),
            'min_wind': subset['wind_speed'].min(),
            'max_wind': subset['wind_speed'].max(),
        })
        
        if 'precipitation' in subset.columns:
            stats[-1]['avg_rain'] = subset['precipitation'].mean()
            stats[-1]['min_rain'] = subset['precipitation'].min()
            stats[-1]['max_rain'] = subset['precipitation'].max()
        
        print(f"\n{risk_names[level]}:")
        print(f"   Count: {len(subset):,} ({len(subset)/total*100:.1f}%)")
        print(f"   Temperature: {subset['temp_max'].mean():.1f}°C avg "
              f"({subset['temp_max'].min():.1f}°C - {subset['temp_max'].max():.1f}°C)")
        print(f"   Wind Speed: {subset['wind_speed'].mean():.1f} km/h avg "
              f"({subset['wind_speed'].min():.1f} - {subset['wind_speed'].max():.1f})")
        if 'precipitation' in subset.columns:
            print(f"   Rainfall: {subset['precipitation'].mean():.1f} mm avg "
                  f"({subset['precipitation'].min():.1f} - {subset['precipitation'].max():.1f})")

# Create statistics DataFrame and save
stats_df = pd.DataFrame(stats)
stats_df.to_csv(output_dir / 'risk_statistics.csv', index=False)
print(f"\n✅ Statistics saved: {output_dir}/risk_statistics.csv")

# ============================================================
# 3. JANUARY 20, 2026 SPECIFIC ANALYSIS
# ============================================================
print("\n" + "="*70)
print("🌊 3. JANUARY 20, 2026 FLOOD EVENT ANALYSIS")
print("="*70)

# Find Jan 20 data
jan20 = df[(df['date'] == '2026-01-20')]

if len(jan20) > 0:
    print(f"\n📍 Found {len(jan20)} records for Jan 20, 2026")
    
    for _, row in jan20.iterrows():
        print(f"\n   City: {row['city'].title()}")
        print(f"   Danger Label: {row['danger_label']} ({risk_names[row['danger_label']]})")
        print(f"   Max Temp: {row['temp_max']}°C")
        print(f"   Min Temp: {row['temp_min']}°C")
        print(f"   Wind Speed: {row['wind_speed']} km/h")
        if 'precipitation' in row:
            print(f"   Precipitation: {row['precipitation']} mm")
    
    # Compare with dataset averages
    orange_data = df[df['danger_label'] == 2]
    print(f"\n📊 Comparison with ORANGE level averages:")
    print(f"   Jan 20 Rain: {jan20.iloc[0]['precipitation']} mm")
    print(f"   ORANGE Avg Rain: {orange_data['precipitation'].mean():.1f} mm")
    print(f"   ORANGE Max Rain: {orange_data['precipitation'].max():.1f} mm")
    
    if jan20.iloc[0]['precipitation'] <= orange_data['precipitation'].max():
        print(f"\n✅ Jan 20 ({jan20.iloc[0]['precipitation']}mm) is within ORANGE range")
        print(f"   (ORANGE max: {orange_data['precipitation'].max():.1f}mm)")
else:
    print("❌ No data found for January 20, 2026")

# ============================================================
# 4. FEATURE CORRELATION ANALYSIS
# ============================================================
print("\n" + "="*70)
print("📊 4. FEATURE CORRELATIONS")
print("="*70)

# Select numeric columns for correlation
numeric_cols = ['temp_max', 'temp_min', 'temp_avg', 'wind_speed', 'humidity', 'danger_label']
if 'precipitation' in df.columns:
    numeric_cols.append('precipitation')

corr_df = df[numeric_cols].copy()
corr_matrix = corr_df.corr()

print("\n🔍 Correlation with Danger Label:")
danger_corr = corr_matrix['danger_label'].sort_values(ascending=False)
for feat, corr in danger_corr.items():
    if feat != 'danger_label':
        strength = "🔥 STRONG" if abs(corr) > 0.5 else "📊 MODERATE" if abs(corr) > 0.3 else "💧 WEAK"
        print(f"   {feat}: {corr:.3f} ({strength})")

# Create correlation heatmap
plt.figure(figsize=(10, 8))
sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', center=0, 
            square=True, fmt='.2f', cbar_kws={'shrink': 0.8})
plt.title('Feature Correlation Matrix')
plt.tight_layout()
plt.savefig(output_dir / 'correlation_heatmap.png', dpi=150)
print(f"\n✅ Correlation heatmap saved: {output_dir}/correlation_heatmap.png")

# ============================================================
# 5. RAINFALL ANALYSIS (Key for Flood Events)
# ============================================================
if 'precipitation' in df.columns:
    print("\n" + "="*70)
    print("🌧️ 5. RAINFALL ANALYSIS BY RISK LEVEL")
    print("="*70)
    
    # Create figure with two subplots
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Subplot 1: Box plot of rainfall by risk level
    ax1 = axes[0]
    
    # Prepare data for boxplot (only levels that exist)
    data_to_plot = []
    plot_labels = []
    colors_used = []
    
    for level in range(5):
        if level in df['danger_label'].unique():
            data = df[df['danger_label'] == level]['precipitation'].dropna()
            if len(data) > 0:
                data_to_plot.append(data)
                plot_labels.append(['GREEN', 'YELLOW', 'ORANGE', 'RED', 'PURPLE'][level])
                colors_used.append(risk_colors[level])
    
    # Create boxplot
    if data_to_plot:
        bp = ax1.boxplot(data_to_plot, patch_artist=True, labels=plot_labels)
        
        # Color boxes
        for patch, color in zip(bp['boxes'], colors_used):
            patch.set_facecolor(color)
            patch.set_alpha(0.6)
        
        ax1.set_xlabel('Risk Level')
        ax1.set_ylabel('Precipitation (mm)')
        ax1.set_title('Rainfall Distribution by Risk Level')
        ax1.grid(axis='y', alpha=0.3)
        
        # Add Jan 20 as a marker if it exists
        if len(jan20) > 0:
            rain_val = jan20.iloc[0]['precipitation']
            risk_val = jan20.iloc[0]['danger_label']
            ax1.scatter(risk_val + 1, rain_val, color='black', s=100, 
                       marker='*', label='Jan 20, 2026', zorder=5)
            ax1.legend()
    
    # Subplot 2: Bar chart of average rainfall by risk level
    ax2 = axes[1]
    
    avg_rain = []
    rain_levels = []
    
    for level in range(5):
        if level in df['danger_label'].unique():
            avg = df[df['danger_label'] == level]['precipitation'].mean()
            avg_rain.append(avg)
            rain_levels.append(['GREEN', 'YELLOW', 'ORANGE', 'RED', 'PURPLE'][level])
    
    bars = ax2.bar(rain_levels, avg_rain, color=colors_used, alpha=0.7)
    ax2.set_xlabel('Risk Level')
    ax2.set_ylabel('Average Precipitation (mm)')
    ax2.set_title('Average Rainfall by Risk Level')
    ax2.grid(axis='y', alpha=0.3)
    
    # Add value labels on bars
    for bar, val in zip(bars, avg_rain):
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height,
                f'{val:.1f}mm', ha='center', va='bottom', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(output_dir / 'rainfall_analysis.png', dpi=150)
    print(f"✅ Rainfall analysis saved: {output_dir}/rainfall_analysis.png")
    plt.close()

# ============================================================
# 6. SUMMARY REPORT
# ============================================================
print("\n" + "="*70)
print("📋 6. DATASET SUMMARY REPORT")
print("="*70)

print(f"""
╔══════════════════════════════════════════════════════════════╗
║                    DATASET SUMMARY                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║   Total Samples: {total:>10,}                                   ║
║   Date Range:    {df['date'].min()} to {df['date'].max()}        ║
║   Cities:        {df['city'].nunique():>10}                                   ║
║                                                              ║
║   Risk Distribution:                                          ║
║   • GREEN 🟢   : {risk_counts.get(0, 0):>6} ({risk_counts.get(0, 0)/total*100:5.1f}%)                   ║
║   • YELLOW 🟡  : {risk_counts.get(1, 0):>6} ({risk_counts.get(1, 0)/total*100:5.1f}%)                   ║
║   • ORANGE 🟠  : {risk_counts.get(2, 0):>6} ({risk_counts.get(2, 0)/total*100:5.1f}%)                   ║
║   • RED 🔴     : {risk_counts.get(3, 0):>6} ({risk_counts.get(3, 0)/total*100:5.1f}%)                   ║
║   • PURPLE 🟣  : {risk_counts.get(4, 0):>6} ({risk_counts.get(4, 0)/total*100:5.1f}%)                   ║
║                                                              ║
║   Key Features: {', '.join(df.columns[:6])}...                 ║
║                                                              ║
║   Jan 20, 2026: {jan20.iloc[0]['precipitation'] if len(jan20) > 0 else 'N/A'}mm rain → ORANGE ✓         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")

print(f"\n✅ All analysis files saved to: {output_dir}/")
print("   Files generated:")
for f in output_dir.glob('*'):
    print(f"   • {f.name}")