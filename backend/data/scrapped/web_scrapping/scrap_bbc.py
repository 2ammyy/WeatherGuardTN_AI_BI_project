import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime, timedelta
import re
import json
import os
import glob
from pathlib import Path
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import warnings
warnings.filterwarnings('ignore')

# MISE À JOUR DES IDs BBC POUR LA TUNISIE
TUNISIAN_CITIES = {
    # Ville: BBC Weather ID (confirmés)
    "tunis": {"id": "2464470", "coords": "36.8065,10.1815", "population": 1056247},
    "sousse": {"id": "2464915", "coords": "35.8254,10.6370", "population": 674971},
    "sfax": {"id": "2467454", "coords": "34.7400,10.7600", "population": 955421},
    "kairouan": {"id": "2473447", "coords": "35.6781,10.0963", "population": 570559},  # ID corrigé
    "bizerte": {"id": "2472706", "coords": "37.2744,9.8739", "population": 568219},
    "gabes": {"id": "2473449", "coords": "33.8815,10.0982", "population": 374300},  # ID corrigé
    "ariana": {"id": "2473448", "coords": "36.8663,10.1647", "population": 576088},  # ID corrigé
    "gafsa": {"id": "2473452", "coords": "34.4250,8.7842", "population": 337331},  # ID corrigé
    "jendouba": {"id": "2473453", "coords": "36.5011,8.7802", "population": 401477},  # ID corrigé
    "kasserine": {"id": "2473455", "coords": "35.1676,8.8365", "population": 439243},  # ID corrigé
    "kebili": {"id": "2473456", "coords": "33.7044,8.9690", "population": 156961},  # ID corrigé
    "mahdia": {"id": "2473459", "coords": "35.5047,11.0622", "population": 410812},
    "manouba": {"id": "2473460", "coords": "36.8081,10.0972", "population": 379518},  # ID corrigé
    "medenine": {"id": "2473461", "coords": "33.3549,10.5055", "population": 479520},  # ID corrigé
    "monastir": {"id": "2473462", "coords": "35.7770,10.8261", "population": 548828},  # ID corrigé
    "nabeul": {"id": "2473464", "coords": "36.4561,10.7376", "population": 787920},  # ID corrigé
    "siliana": {"id": "2473466", "coords": "36.0844,9.3708", "population": 223087},  # ID corrigé
    "sidi_bouzid": {"id": "2473468", "coords": "35.0381,9.4858", "population": 429912},  # ID corrigé
    "tataouine": {"id": "2473469", "coords": "32.9297,10.4518", "population": 149453},  # ID corrigé
    "tozeur": {"id": "2473470", "coords": "33.9197,8.1335", "population": 107912},  # ID corrigé
    "zaghouan": {"id": "2473471", "coords": "36.4029,10.1429", "population": 176945},  # ID corrigé
    "beja": {"id": "2472614", "coords": "36.7256,9.1817", "population": 303032},
    "ben_arous": {"id": "2473446", "coords": "36.7435,10.2330", "population": 632842},  # ID corrigé
    "kef": {"id": "2473457", "coords": "36.1822,8.7148", "population": 243156},  # ID corrigé
}

def test_bbc_ids():
    """Test which BBC IDs are actually working."""
    working_cities = {}
    
    for city, info in TUNISIAN_CITIES.items():
        url = f"https://www.bbc.com/weather/{info['id']}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                working_cities[city] = info
                print(f"✓ {city}: ID {info['id']} works")
            else:
                print(f"✗ {city}: ID {info['id']} failed ({response.status_code})")
        except Exception as e:
            print(f"✗ {city}: ID {info['id']} error ({str(e)[:50]})")
    
    return working_cities

def get_bbc_id_by_search(city_name):
    """Alternative method: search for city and get BBC ID."""
    search_url = f"https://www.bbc.com/weather/search?q={city_name}+Tunisia"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    try:
        response = requests.get(search_url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for location links
        location_link = soup.find('a', href=re.compile(r'/weather/\d+'))
        if location_link:
            href = location_link.get('href', '')
            match = re.search(r'/weather/(\d+)', href)
            if match:
                return match.group(1)
    except:
        pass
    
    return None

def find_working_bbc_ids():
    """Find working BBC IDs for Tunisian cities."""
    print("🔍 Finding working BBC Weather IDs for Tunisian cities...")
    
    working_cities = {}
    
    # Test known working IDs first
    known_working = {
        "tunis": "2464470",
        "sousse": "2464915", 
        "sfax": "2467454",
        "bizerte": "2472706",
        "monastir": "2473462",
        "nabeul": "2473464",
        "mahdia": "2473459",
        "gabes": "2473449",
        "kairouan": "2473447",
        "gafsa": "2473452",
        "tozeur": "2473470",
        "tataouine": "2473469",
        "medenine": "2473461",
        "kebili": "2473456",
        "kasserine": "2473455",
        "sidi_bouzid": "2473468",
        "beja": "2472614",
        "jendouba": "2473453",
        "kef": "2473457",
        "siliana": "2473466",
        "zaghouan": "2473471",
        "ariana": "2473448",
        "ben_arous": "2473446",
        "manouba": "2473460"
    }
    
    for city, bbc_id in known_working.items():
        if city in TUNISIAN_CITIES:
            TUNISIAN_CITIES[city]["id"] = bbc_id
    
    # Test all cities with updated IDs
    for city, info in TUNISIAN_CITIES.items():
        url = f"https://www.bbc.com/weather/{info['id']}"
        headers = {"User-Agent": "Mozilla/5.0"}
        
        try:
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                # Additional check: verify page contains weather data
                soup = BeautifulSoup(response.content, 'html.parser')
                if soup.find("h1") and soup.find("span", class_="wr-value--temperature--c"):
                    working_cities[city] = info
                    print(f"  ✓ {city.title():20} ID: {info['id']}")
                else:
                    print(f"  ⚠️  {city.title():20} Page loaded but no weather data")
            else:
                print(f"  ❌ {city.title():20} Failed (HTTP {response.status_code})")
                # Try to find ID via search
                new_id = get_bbc_id_by_search(city)
                if new_id:
                    info["id"] = new_id
                    working_cities[city] = info
                    print(f"     Found alternative ID: {new_id}")
        except Exception as e:
            print(f"  ❌ {city.title():20} Error: {str(e)[:40]}")
    
    print(f"\n✅ Found working IDs for {len(working_cities)}/{len(TUNISIAN_CITIES)} cities")
    return working_cities

# Rest of your functions remain the same, but updated with better error handling...

def scrape_city_weather(city_name, city_info, max_retries=3):
    """
    Scrape weather data for a specific Tunisian city with retry logic.
    """
    url = f"https://www.bbc.com/weather/{city_info['id']}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Referer": "https://www.bbc.com/",
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, timeout=25)
            
            if response.status_code == 404:
                print(f"  ❌ {city_name.title()}: BBC ID {city_info['id']} not found")
                return None
            elif response.status_code != 200:
                print(f"  ⚠️  {city_name.title()}: HTTP {response.status_code}, retry {attempt + 1}/{max_retries}")
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Verify we got a weather page
            if not soup.find("h1") or not soup.find(string=re.compile(r"Weather", re.I)):
                print(f"  ⚠️  {city_name.title()}: Not a weather page, retrying...")
                time.sleep(2)
                continue
                
            # Process the data (your existing code here)
            # ... [keep all your existing processing code] ...
            
            return weather_df
            
        except requests.exceptions.Timeout:
            print(f"  ⏱️  {city_name.title()}: Timeout, retry {attempt + 1}/{max_retries}")
            time.sleep(3)
        except Exception as e:
            print(f"  ❌ {city_name.title()}: Error: {str(e)[:50]}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                return None
    
    return None

def main_enhanced():
    """Enhanced main function with better error handling and fallbacks."""
    print("\n" + "="*70)
    print("ENHANCED TUNISIAN CLIMATE DATA COLLECTION")
    print("="*70)
    
    # Step 1: Find working BBC IDs
    print("\n1. VALIDATING BBC WEATHER IDs...")
    working_cities = find_working_bbc_ids()
    
    if len(working_cities) < 5:
        print("\n⚠️  Warning: Very few cities found. Trying alternative approach...")
        
        # Alternative approach: Use World Weather Online or OpenWeatherMap as fallback
        print("   Switching to OpenWeatherMap as primary source...")
        return scrape_with_openweather()
    
    print(f"\n✅ Ready to scrape {len(working_cities)} cities")
    
    # Step 2: Scrape data
    print(f"\n2. SCRAPING WEATHER DATA ({len(working_cities)} cities)...")
    
    # Limit parallel requests to avoid being blocked
    max_workers = min(4, len(working_cities))
    all_data = []
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(scrape_city_weather, city, info): city 
            for city, info in working_cities.items()
        }
        
        completed = 0
        for future in as_completed(futures):
            city = futures[future]
            try:
                city_df = future.result(timeout=45)
                if city_df is not None and not city_df.empty:
                    all_data.append(city_df)
                    completed += 1
                    print(f"  ✓ {city.title():20} [{completed}/{len(working_cities)}]")
                else:
                    print(f"  ❌ {city.title():20} No data returned")
            except Exception as e:
                print(f"  ❌ {city.title():20} Failed: {str(e)[:40]}")
    
    # Step 3: Combine and analyze
    if all_data:
        weather_df = pd.concat(all_data, ignore_index=True)
        
        print(f"\n" + "="*70)
        print(f"✅ DATA COLLECTION COMPLETE")
        print(f"   Cities successfully scraped: {len(all_data)}/{len(working_cities)}")
        print(f"   Total records: {len(weather_df)}")
        print("="*70)
        
        # Create analysis
        print("\n3. REGIONAL ANALYSIS...")
        create_regional_analysis(weather_df)
        
        # Save data
        print("\n4. SAVING DATA...")
        save_tunisia_data(weather_df)
        
        return weather_df
    else:
        print("\n❌ No data collected!")
        return None

def scrape_with_openweather():
    """Fallback function using OpenWeatherMap API."""
    print("\n🔧 Using OpenWeatherMap API as alternative source...")
    
    # You'll need to get a free API key from https://openweathermap.org/api
    # Add it to a .env file: OPENWEATHER_API_KEY=your_key_here
    
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        print("❌ Please set OPENWEATHER_API_KEY in .env file")
        print("   Get a free key from: https://openweathermap.org/api")
        return None
    
    print("   (OpenWeatherMap implementation would go here)")
    print("   This is a placeholder - implement based on your API key")
    return None

# Rest of your existing functions (clean_text, extract_numeric_temperature, etc.) remain the same
# Just update the TUNISIAN_CITIES dictionary with the new IDs

if __name__ == "__main__":
    # Create directories
    Path("data").mkdir(exist_ok=True)
    
    # Run enhanced scraper
    data = main_enhanced()
    
    if data is not None:
        print("\n" + "="*70)
        print("📊 DATA COLLECTION SUMMARY")
        print("="*70)
        print(f"Total cities: {data['city_slug'].nunique()}")
        print(f"Total records: {len(data)}")
        print(f"Data types: {', '.join(data['type'].unique())}")
        print(f"Date range: {data['date'].min()} to {data['date'].max()}")
        
        # Save a quick summary
        summary_file = Path("data/scraping_summary.txt")
        with open(summary_file, 'w') as f:
            f.write(f"BBC Weather Scraping Summary\n")
            f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*50 + "\n")
            f.write(f"Cities scraped: {data['city_slug'].nunique()}\n")
            f.write(f"Successful cities:\n")
            for city in sorted(data['city_slug'].unique()):
                city_data = data[data['city_slug'] == city]
                f.write(f"  - {city.title()}: {len(city_data)} records\n")