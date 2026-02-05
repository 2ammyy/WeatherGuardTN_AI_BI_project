# scrap_openweather.py
import requests
import pandas as pd
from datetime import datetime
import re
import json
from pathlib import Path
import time
import os

class SimpleWeatherScraper:
    def __init__(self):
        # Créer dossier data
        self.data_dir = Path("data/weather_data")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Charger API key depuis .env
        from dotenv import load_dotenv
        load_dotenv()
        self.api_key = os.getenv('OPENWEATHER_API_KEY')
        
    def run_scraper(self):
        """Exécuter le scraper"""
        print("🌤️  Weather Data Scraper")
        print("-" * 40)
        
        if not self.api_key:
            print("❌ API key missing. Create .env file with:")
            print("   OPENWEATHER_API_KEY=your_key")
            return
        
        all_data = []
        
        # 1. OpenWeatherMap API
        print("\n1. OpenWeatherMap API...")
        api_data = self.get_weather_api()
        all_data.extend(api_data)
        
        # 2. Meteo.tn alerts
        print("\n2. Meteo.tn Alerts...")
        alert_data = self.get_meteo_alerts()
        all_data.extend(alert_data)
        
        # 3. Save
        self.save_results(all_data)
        
        return all_data
    
    def get_weather_api(self):
        """Get data from OpenWeatherMap API"""
        cities = [
            {"name": "Tunis", "lat": 36.8065, "lon": 10.1815},
            {"name": "Sfax", "lat": 34.7406, "lon": 10.7603},
            {"name": "Sousse", "lat": 35.8256, "lon": 10.6411},
        ]
        
        data = []
        
        for city in cities:
            try:
                # Current weather
                url = "https://api.openweathermap.org/data/2.5/weather"
                params = {
                    "lat": city["lat"],
                    "lon": city["lon"],
                    "appid": self.api_key,
                    "units": "metric",
                    "lang": "fr"
                }
                
                r = requests.get(url, params=params, timeout=5)
                if r.status_code == 200:
                    weather = r.json()
                    
                    data.append({
                        "source": "openweathermap",
                        "type": "current",
                        "city": city["name"],
                        "temp": weather["main"]["temp"],
                        "humidity": weather["main"]["humidity"],
                        "wind": weather["wind"]["speed"],
                        "condition": weather["weather"][0]["description"],
                        "time": datetime.fromtimestamp(weather["dt"]).strftime("%H:%M"),
                        "scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    })
                    
                    print(f"   ✓ {city['name']}: {weather['main']['temp']}°C")
                
                time.sleep(1)
                
            except Exception as e:
                print(f"   ✗ {city['name']}: {e}")
                continue
        
        return data
    
    def get_meteo_alerts(self):
        """Scrape Meteo.tn alerts"""
        try:
            url = "https://www.meteo.tn/fr/vigilance-meterologique"
            r = requests.get(url, timeout=5)
            text = r.text
            
            # Simple regex for alert text
            import re
            match = re.search(r'Description de la situation météorologique(.+?)</p>', text, re.DOTALL)
            
            if match:
                desc = re.sub(r'<[^>]+>', ' ', match.group(1))
                desc = re.sub(r'\s+', ' ', desc).strip()
                
                # Find wind speed
                wind = re.search(r'(\d+)\s*km/h', desc)
                
                return [{
                    "source": "meteo_tn",
                    "type": "alert",
                    "description": desc[:200],
                    "wind_kmh": wind.group(1) if wind else "",
                    "scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }]
        
        except Exception as e:
            print(f"   ✗ Error: {e}")
        
        return []
    
    def save_results(self, data):
        """Save scraped data"""
        if not data:
            print("\n❌ No data to save")
            return
        
        df = pd.DataFrame(data)
        
        # Timestamp for filename
        ts = datetime.now().strftime("%Y%m%d_%H%M")
        
        # Save CSV
        csv_file = self.data_dir / f"weather_{ts}.csv"
        df.to_csv(csv_file, index=False, encoding='utf-8-sig')
        
        # Save JSON
        json_file = self.data_dir / f"weather_{ts}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ Saved {len(data)} records")
        print(f"📄 {csv_file}")
        print(f"📄 {json_file}")

# Version SANS dotenv (plus simple)
def scrape_simple():
    """Scraper simple sans .env"""
    print("🌤️  Simple Weather Scraper")
    print("-" * 40)
    
    # Demander API key directement
    api_key = input("Enter OpenWeatherMap API key (or press Enter to skip): ").strip()
    
    data = []
    
    if api_key:
        print("\n1. Getting weather data...")
        # Simple API call for Tunis
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?q=Tunis&appid={api_key}&units=metric&lang=fr"
            r = requests.get(url, timeout=5)
            
            if r.status_code == 200:
                w = r.json()
                data.append({
                    "source": "openweathermap",
                    "city": "Tunis",
                    "temp": w["main"]["temp"],
                    "condition": w["weather"][0]["description"],
                    "time": datetime.now().strftime("%H:%M:%S")
                })
                print(f"   ✓ Tunis: {w['main']['temp']}°C - {w['weather'][0]['description']}")
        except:
            print("   ✗ API error")
    
    # Meteo.tn (toujours)
    print("\n2. Checking Meteo.tn alerts...")
    try:
        r = requests.get("https://www.meteo.tn/fr/vigilance-meterologique", timeout=5)
        if "vigilance" in r.text.lower():
            data.append({
                "source": "meteo_tn",
                "alert": "active",
                "time": datetime.now().strftime("%H:%M:%S")
            })
            print("   ⚠️  Alert active")
    except:
        print("   ✗ Could not check alerts")
    
    # Save
    if data:
        df = pd.DataFrame(data)
        Path("data").mkdir(exist_ok=True)
        
        ts = datetime.now().strftime("%Y%m%d_%H%M")
        filepath = f"data/weather_simple_{ts}.csv"
        df.to_csv(filepath, index=False)
        
        print(f"\n✅ Saved to {filepath}")
        print("\n" + df.to_string(index=False))
    
    return data

# EXÉCUTER
if __name__ == "__main__":
    # Option 1: Avec .env file
    # scraper = SimpleWeatherScraper()
    # scraper.run_scraper()
    
    # Option 2: Simple version (sans .env)
    scrape_simple()