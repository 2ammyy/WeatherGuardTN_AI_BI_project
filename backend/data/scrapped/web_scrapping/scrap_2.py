# scrap_clean.py - Scraper avec nettoyage HTML
import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
import re
import html

def clean_html_text(text):
    """Nettoyer le texte HTML"""
    if not text:
        return ""
    
    # Décoder les entités HTML
    text = html.unescape(text)
    
    # Supprimer les balises HTML
    text = re.sub(r'<[^>]+>', ' ', text)
    
    # Supprimer les espaces multiples
    text = re.sub(r'\s+', ' ', text)
    
    # Nettoyer les caractères spéciaux
    text = text.replace('"', '').replace("'", "")
    
    return text.strip()

def scrape_meteo_clean():
    """Scrape Meteo.tn avec nettoyage"""
    url = "https://www.meteo.tn/fr/vigilance-meterologique"
    
    try:
        r = requests.get(url, timeout=5)
        soup = BeautifulSoup(r.content, 'html.parser')
        
        # Chercher dans le texte nettoyé
        text = soup.get_text(separator=' ', strip=True)
        
        # Chercher dates
        dates = re.findall(r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})', text)
        
        # Chercher description - méthode plus robuste
        desc_match = re.search(r'Description de la situation météorologique(.+?)(?:Conséquences et conseils|$)', 
                              text, re.DOTALL | re.IGNORECASE)
        
        if desc_match:
            description = clean_html_text(desc_match.group(1))
            
            # Extraire juste la première phrase (avant le point)
            first_sentence = description.split('.')[0] + '.' if '.' in description else description
            
            return {
                "source": "meteo_tn",
                "type": "alert",
                "diffusion": dates[0] if dates else "",
                "validity": dates[1] if len(dates) > 1 else "",
                "description": first_sentence[:200],
                "scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
    except Exception as e:
        print(f"Error scraping Meteo.tn: {e}")
    return None

def scrape_bbc_clean():
    """Scrape BBC Weather avec nettoyage"""
    url = "https://www.bbc.com/weather/623"  # Tunis
    
    try:
        r = requests.get(url, timeout=5)
        soup = BeautifulSoup(r.content, 'html.parser')
        
        # Température - chercher dans plusieurs endroits
        temp_selectors = [
            'span.wr-value--temperature',
            'div.wr-value--temperature',
            'span[class*="temperature"]',
            'div[class*="temperature"]'
        ]
        
        temp = ""
        for selector in temp_selectors:
            elem = soup.select_one(selector)
            if elem:
                temp = elem.get_text(strip=True)
                break
        
        # Condition météo
        condition_selectors = [
            'div.wr-day__weather-type-description',
            'div.wr-day__details-container',
            'div.wr-day__body'
        ]
        
        condition = ""
        for selector in condition_selectors:
            elem = soup.select_one(selector)
            if elem:
                condition = elem.get_text(strip=True)[:100]
                break
        
        # Nettoyer la température
        temp = temp.replace('°', '').replace('C', '').strip()
        
        return {
            "source": "bbc",
            "type": "current",
            "city": "Tunis",
            "temperature": temp,
            "condition": condition,
            "scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        print(f"Error scraping BBC: {e}")
    return None

def scrape_multiple_cities():
    """Scrape plusieurs villes sur BBC"""
    cities = {
        "Tunis": "623",
        "Sfax": "2467466",
        "Sousse": "2464915"
    }
    
    all_data = []
    
    for city_name, city_code in cities.items():
        try:
            url = f"https://www.bbc.com/weather/{city_code}"
            r = requests.get(url, timeout=5)
            soup = BeautifulSoup(r.content, 'html.parser')
            
            # Température actuelle
            temp_elem = soup.find('span', {'class': 'wr-value--temperature'})
            temp = temp_elem.get_text(strip=True) if temp_elem else ""
            temp = temp.replace('°', '').replace('C', '').strip()
            
            # Prévisions pour aujourd'hui
            today_forecast = soup.find('li', {'class': 'wr-day--active'})
            if today_forecast:
                max_temp = today_forecast.find('span', {'class': 'wr-day__temperature--max'})
                min_temp = today_forecast.find('span', {'class': 'wr-day__temperature--min'})
                
                max_temp = max_temp.get_text(strip=True).replace('°', '') if max_temp else ""
                min_temp = min_temp.get_text(strip=True).replace('°', '') if min_temp else ""
            
            all_data.append({
                "source": "bbc",
                "type": "current",
                "city": city_name,
                "temperature": temp,
                "temp_max": max_temp if 'max_temp' in locals() else "",
                "temp_min": min_temp if 'min_temp' in locals() else "",
                "scraped": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })
            
            print(f"  ✓ {city_name}: {temp}°C")
            
        except Exception as e:
            print(f"  ✗ {city_name}: {e}")
            continue
    
    return all_data

def main():
    """Scrape proprement et sauvegarde"""
    print("=== CLEAN WEATHER SCRAPING ===")
    print("Scraping Meteo.tn and BBC Weather...\n")
    
    data = []
    
    # 1. Scrape Meteo.tn
    print("1. Meteo.tn Alerts:")
    meteo = scrape_meteo_clean()
    if meteo:
        data.append(meteo)
        print(f"   ✓ Alert: {meteo['description'][:50]}...")
    else:
        print("   ✗ No alert found")
    
    # 2. Scrape BBC Weather (multiple cities)
    print("\n2. BBC Weather:")
    bbc_data = scrape_multiple_cities()
    data.extend(bbc_data)
    
    # 3. Sauvegarder
    if data:
        df = pd.DataFrame(data)
        
        # Créer dossier
        import os
        os.makedirs("data/scrap_clean", exist_ok=True)
        
        # Fichier avec timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        csv_file = f"scrapped_data/scrap_clean/weather_clean_{timestamp}.csv"
        json_file = f"scrapped_data/scrap_clean/weather_clean_{timestamp}.json"
        
        # Sauvegarder CSV
        df.to_csv(csv_file, index=False, encoding='utf-8-sig')
        
        # Sauvegarder JSON
        df.to_json(json_file, orient='records', indent=2)
        
        print(f"\n✅ Saved {len(data)} records")
        print(f"   CSV: {csv_file}")
        print(f"   JSON: {json_file}")
        
        # Afficher un aperçu
        print("\n📊 Data preview:")
        print(df[['source', 'type', 'city', 'temperature', 'description']].head())
    else:
        print("\n❌ No data scraped")

if __name__ == "__main__":
    main()