from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime
import os
import httpx

import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["predictions"])

# class PredictRequest(BaseModel):
#     city: str
#     date: Optional[str] = None
#     temp_max_fb: Optional[float] = None  
#     temp_min_fb: Optional[float] = None  
#     humidity_percent_hist_fb: Optional[float] = None  
#     wind_speed_kmh_hist_fb: Optional[float] = None  
    
# class PredictResponse(BaseModel):
#     risk_level: str
#     probability: float
#     recommendation: str
#     model_used: str
#     details: Dict

# # City encoding mapping (you should load this from your training data)
# # This is a placeholder - you should save and load the actual encoder
# CITY_ENCODING = {
#     "tunis": 1, "ariana": 2, "ben arous": 3, "bizerte": 4,
#     "sousse": 5, "sfax": 6, "nabeul": 7, "monastir": 8,
#     "kairouan": 9, "gabes": 10, "gafsa": 11, "jendouba": 12,
#     "kasserine": 12, "kebili": 13, "le kef": 14, "mahdia": 15,
#     "manouba": 16, "medenine": 17, "sidi bouzid": 18, "siliana": 19,
#     "tataouine": 20, "tozeur": 21, "zaghouan": 22
# }

# @router.get("/health")
# async def health_check():
#     """Health check endpoint"""
#     model_status = "loaded" if best_model is not None else "not_loaded"
#     return {
#         "status": "healthy",
#         "model": model_status,
#         "model_type": model_type
#     }

# @router.get("/governorates")
# async def get_governorates():
#     """List all Tunisian governorates"""
#     return sorted([
#         "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba",
#         "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia", "Manouba",
#         "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana",
#         "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"
#     ])

# @router.post("/predict", response_model=PredictResponse)
# async def predict_danger(request: PredictRequest):
#     try:
#         # Check if model is loaded
#         if best_model is None:
#             raise HTTPException(status_code=503, detail="Model not loaded")
        
#         # Parse date if provided
#         pred_date = datetime.strptime(request.date, "%Y-%m-%d") if request.date else datetime.now()
        
#         # Encode city (case-insensitive)
#         city_lower = request.city.lower()
#         city_encoded = CITY_ENCODING.get(city_lower, 0)
        
#         # Use provided values or reasonable defaults
#         # IMPORTANT: Use the exact feature names from training with _fb suffix
#         temp_max_fb = request.temp_max if request.temp_max is not None else 25.0
#         temp_min_fb = request.temp_min if request.temp_min is not None else 18.0
#         humidity_percent_hist_fb = request.humidity if request.humidity is not None else 60.0
#         wind_speed_kmh_hist_fb = request.wind_speed if request.wind_speed is not None else 15.0
        
#         # Create feature array with EXACT order from training
#         # Order: temp_max_fb, temp_min_fb, humidity_percent_hist_fb, wind_speed_kmh_hist_fb, city_encoded
#         features = np.array([[
#             temp_max_fb,                    # temp_max_fb
#             temp_min_fb,                     # temp_min_fb
#             humidity_percent_hist_fb,         # humidity_percent_hist_fb
#             wind_speed_kmh_hist_fb,           # wind_speed_kmh_hist_fb
#             city_encoded                      # city_encoded
#         ]], dtype=np.float32)
        
#         logger.info(f"Prediction features: {features}")
#         logger.info(f"Feature names: ['temp_max_fb', 'temp_min_fb', 'humidity_percent_hist_fb', 'wind_speed_kmh_hist_fb', 'city_encoded']")
        
#         # Make prediction
#         if hasattr(best_model, "predict_proba"):
#             proba = best_model.predict_proba(features)[0]
#             # Get probability of positive class (danger)
#             probability = float(proba[1]) if len(proba) > 1 else float(proba[0])
#         else:
#             # If no predict_proba, use predict and convert to probability
#             pred = best_model.predict(features)[0]
#             probability = 1.0 if pred == 1 else 0.0
        
#         logger.info(f"Prediction probability: {probability}")
        
#         # Map probability to risk levels
#         if probability < 0.2:
#             level = "green"
#             rec = "Conditions normales - aucune mesure particulière"
#         elif probability < 0.4:
#             level = "yellow"
#             rec = "Soyez vigilant - conditions potentiellement dangereuses"
#         elif probability < 0.6:
#             level = "orange"
#             rec = "Risque élevé - limitez les déplacements non essentiels"
#         elif probability < 0.8:
#             level = "orange_red"
#             rec = "Risque très élevé - préparez-vous à des mesures d'urgence"
#         else:
#             level = "red"
#             rec = "DANGER EXTRÊME - suivez les instructions des autorités"
        
#         return PredictResponse(
#             risk_level=level,
#             probability=round(probability, 3),
#             recommendation=rec,
#             model_used=model_type,
#             details={
#                 "city": request.city,
#                 "date": str(pred_date.date()),
#                 "temperature_max_fb": temp_max_fb,
#                 "temperature_min_fb": temp_min_fb,
#                 "humidity_percent_hist_fb": humidity_percent_hist_fb,
#                 "wind_speed_kmh_hist_fb": wind_speed_kmh_hist_fb,
#                 "city_encoded": city_encoded,
#                 "raw_probability": probability
#             }
#         )
        
#     except Exception as e:
#         logger.error(f"Prediction error: {e}")
#         raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {str(e)}")



from fastapi import APIRouter, HTTPException
import mlflow
import numpy as np
from typing import Dict, Any
import os
from pydantic import BaseModel
from datetime import datetime
import random

router = APIRouter()

@router.get("/predict")
async def predict():
    """
    Exemple d'endpoint de prédiction avec logging MLflow
    """
    try:
        # Démarrer un run MLflow
        with mlflow.start_run(run_name="api_prediction") as run:
            # Loguer des paramètres
            mlflow.log_param("model_type", "LightGBM")
            mlflow.log_param("api_call", "predict")
            
            # Simulation de prédiction (à remplacer par votre vrai modèle)
            prediction = np.random.random()
            
            # Loguer la métrique
            mlflow.log_metric("prediction_value", float(prediction))
            
            return {
                "prediction": float(prediction),
                "run_id": run.info.run_id,
                "status": "success"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/experiments")
async def list_experiments():
    """
    Liste toutes les expériences MLflow
    """
    try:
        experiments = mlflow.search_experiments()
        return [
            {
                "experiment_id": exp.experiment_id,
                "name": exp.name,
                "artifact_location": exp.artifact_location,
                "tags": exp.tags
            }
            for exp in experiments
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/runs/{experiment_id}")
async def list_runs(experiment_id: str):
    """
    Liste tous les runs d'une expérience
    """
    try:
        runs = mlflow.search_runs(experiment_ids=[experiment_id])
        return runs.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/test")
async def test():
    return {"message": "API is working"}

@router.get("/governorates")
async def get_governorates():
    """Liste des gouvernorats de Tunisie"""
    governorates = [
        "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa",
        "Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia",
        "La Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid",
        "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"
    ]
    return {"governorates": governorates}



# Modèles de données
class ForecastRequest(BaseModel):
    date: str
    city: str

class ForecastResponse(BaseModel):
    forecast_date: str
    city: str
    risk_level: str
    confidence: int
    probabilities: Dict[str, int]
    weather: Dict[str, float]

@router.post("/forecast-by-date", response_model=ForecastResponse)
async def forecast_by_date(request: ForecastRequest):
    """
    Prédiction personnalisée pour une date et une ville spécifiques
    """
    try:
        # Valider la date
        try:
            parsed_date = datetime.strptime(request.date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Format de date invalide. Utilisez YYYY-MM-DD")
        
        # Ici, vous appellerez votre vrai modèle ML
        # Pour l'instant, on utilise des données simulées
        # Mais basées sur la ville et la date pour que ce soit cohérent
        
        # Utiliser la ville et la date pour générer une prédiction semi-déterministe
        city_seed = sum(ord(c) for c in request.city)
        date_seed = parsed_date.timetuple().tm_yday
        random.seed(city_seed + date_seed)
        
        # Générer les probabilités
        probs = {
            "GREEN": random.randint(0, 100),
            "YELLOW": random.randint(0, 100),
            "ORANGE": random.randint(0, 100),
            "RED": random.randint(0, 100),
            "PURPLE": random.randint(0, 100)
        }
        
        # Normaliser pour que la somme = 100
        total = sum(probs.values())
        probs = {k: int(v * 100 / total) for k, v in probs.items()}
        
        # Ajuster pour que la somme soit exactement 100
        diff = 100 - sum(probs.values())
        if diff != 0:
            # Ajouter la différence au plus grand
            max_key = max(probs, key=probs.get)
            probs[max_key] += diff
        
        # Déterminer le niveau de risque dominant
        risk_level = max(probs, key=probs.get)
        
        # Générer les conditions météo (simulées)
        weather = {
            "temp_max": round(random.uniform(15, 35), 1),
            "temp_min": round(random.uniform(5, 20), 1),
            "temp_avg": round(random.uniform(10, 25), 1),
            "wind_speed": round(random.uniform(0, 30), 1),
            "humidity": random.randint(30, 90)
        }
        
        # Réinitialiser le seed aléatoire
        random.seed()
        
        return {
            "forecast_date": request.date,
            "city": request.city,
            "risk_level": risk_level,
            "confidence": random.randint(65, 95),
            "probabilities": probs,
            "weather": weather
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la prédiction: {str(e)}")

# Optionnel: endpoint pour les dates disponibles
@router.get("/available-dates/{city}")
async def get_available_dates(city: str):
    """
    Retourne les dates disponibles pour une ville
    """
    from datetime import datetime, timedelta
    
    today = datetime.now()
    dates = []
    for i in range(5):  # 5 jours à l'avance
        date = today + timedelta(days=i)
        dates.append(date.strftime("%Y-%m-%d"))
    
    return {"city": city, "available_dates": dates}
class WeatherRequest(BaseModel):
    city: str
    date: str = None

@router.post('/current-weather')
async def current_weather(request: WeatherRequest):
    import random
    from datetime import datetime
    city_seed = sum(ord(c) for c in request.city)
    random.seed(city_seed + datetime.now().timetuple().tm_yday)
    risk_levels = ['GREEN', 'YELLOW', 'ORANGE', 'RED']
    risk_level = random.choice(risk_levels)
    weather = {
        'temp_max': round(random.uniform(15, 38), 1),
        'temp_min': round(random.uniform(8, 20), 1),
        'temp_avg': round(random.uniform(12, 28), 1),
        'wind_speed': round(random.uniform(5, 45), 1),
        'humidity': random.randint(30, 90),
        'precipitation': round(random.uniform(0, 20), 1)
    }
    random.seed()
    return {'city': request.city, 'risk_level': risk_level, 'weather': weather, 'date': request.date or str(datetime.now().date())}

# ══════════════════════════════════════════════════════════════════════════════
# ROUTING PROXY (OSRM + Photon — free, no key needed)
# ══════════════════════════════════════════════════════════════════════════════

from urllib.parse import quote as url_quote
PHOTON_BASE = 'https://photon.komoot.io/api'
OSRM_BASE = 'https://router.project-osrm.org/route/v1'
PHOTON_HEADERS = {'User-Agent': 'WeatherGuardTN/1.0'}


class RouteRequest(BaseModel):
    origin: str
    destination: str
    profile: str = 'driving'


def _build_geocode_url(query: str) -> str:
    q = f'{query}, Tunisia'
    return f'{PHOTON_BASE}?q={url_quote(q)}&limit=1'


TUNISIAN_CITIES = [
    {'name': 'Tunis', 'lat': 36.8065, 'lng': 10.1815},
    {'name': 'Sfax', 'lat': 34.7400, 'lng': 10.7600},
    {'name': 'Sousse', 'lat': 35.8256, 'lng': 10.6411},
    {'name': 'Bizerte', 'lat': 37.2744, 'lng': 9.8739},
    {'name': 'Gabes', 'lat': 33.8815, 'lng': 10.0982},
    {'name': 'Gafsa', 'lat': 34.4250, 'lng': 8.7842},
    {'name': 'Kairouan', 'lat': 35.6781, 'lng': 10.0963},
    {'name': 'Monastir', 'lat': 35.7833, 'lng': 10.8333},
    {'name': 'Nabeul', 'lat': 36.4561, 'lng': 10.7378},
    {'name': 'Jendouba', 'lat': 36.5011, 'lng': 8.7803},
    {'name': 'Kasserine', 'lat': 35.1676, 'lng': 8.8365},
    {'name': 'Tozeur', 'lat': 33.9197, 'lng': 8.1335},
    {'name': 'Medenine', 'lat': 33.3549, 'lng': 10.5055},
    {'name': 'Beja', 'lat': 36.7256, 'lng': 9.1817},
    {'name': 'Le Kef', 'lat': 36.1741, 'lng': 8.7049},
]

@router.get('/hazards/realtime')
async def get_realtime_hazards():
    """Aggregate real-time hazards from free open sources."""
    hazards = []

    async with httpx.AsyncClient(timeout=15, headers={'User-Agent': 'WeatherGuardTN/1.0'}) as client:
        # 1. Open-Meteo severe weather warnings for Tunisia regions
        open_meteo_regions = [
            (36.8, 10.2, 'Tunis'), (34.7, 10.8, 'Sfax'), (35.8, 10.6, 'Sousse'),
            (37.3, 9.9, 'Bizerte'), (33.9, 10.1, 'Gabes'), (34.4, 8.8, 'Gafsa'),
            (35.7, 10.1, 'Kairouan'), (36.5, 8.8, 'Jendouba'), (35.2, 8.8, 'Kasserine'),
            (33.9, 8.1, 'Tozeur'), (36.7, 9.2, 'Beja'), (36.2, 8.7, 'Le Kef'),
        ]
        for lat, lng, city in open_meteo_regions:
            try:
                url = f'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=wind_speed_10m,precipitation,weathercode&daily=weathercode&forecast_days=1'
                resp = await client.get(url)
                data = resp.json()
                daily_code = data.get('daily', {}).get('weathercode', [])
                hourly_precip = data.get('hourly', {}).get('precipitation', [])
                hourly_wind = data.get('hourly', {}).get('wind_speed_10m', [])

                if daily_code and daily_code[0] >= 80:
                    sev = 4 if daily_code[0] >= 95 else 3
                    evt = 'Thunderstorm' if daily_code[0] >= 95 else 'Heavy Rain'
                    hazards.append({
                        'properties': {'what': f'{evt} warning — {city}', 'severity': sev},
                        'geometry': {'coordinates': [lng, lat]},
                        'type': 'weather',
                        'severity': sev,
                        'source': 'open-meteo',
                    })

                max_wind = max(hourly_wind) if hourly_wind else 0
                if max_wind > 60:
                    sev = 4 if max_wind > 80 else 3
                    hazards.append({
                        'properties': {'what': f'Strong wind warning ({max_wind:.0f} km/h) — {city}', 'severity': sev},
                        'geometry': {'coordinates': [lng, lat]},
                        'type': 'wind',
                        'severity': sev,
                        'source': 'open-meteo',
                    })

                max_precip = max(hourly_precip) if hourly_precip else 0
                if max_precip > 20:
                    sev = 4 if max_precip > 40 else 3
                    hazards.append({
                        'properties': {'what': f'Heavy precipitation ({max_precip:.0f} mm/h) — {city}', 'severity': sev},
                        'geometry': {'coordinates': [lng, lat]},
                        'type': 'flood',
                        'severity': sev,
                        'source': 'open-meteo',
                    })
            except Exception:
                pass

        # 2. GDACS global disaster alerts (filter for Tunisia/North Africa)
        try:
            resp = await client.get('https://www.gdacs.org/gdacs/xml/VO_EVENTSONLY.xml')
            if resp.status_code == 200:
                import xml.etree.ElementTree as ET
                root = ET.fromstring(resp.text)
                for event in root.findall('.//{http://gdacs.org}event'):
                    country = event.find('{http://gdacs.org}country')
                    if country is not None and country.text and any(c in country.text.upper() for c in ['TN', 'TUN', 'DZ', 'LY']):
                        event_type = event.find('{http://gdacs.org}eventtype')
                        subtype = event.find('{http://gdacs.org}subtype')
                        alert = event.find('{http://gdacs.org}alertlevel')
                        lat_el = event.find('{http://gdacs.org}eventlatitude')
                        lng_el = event.find('{http://gdacs.org}eventlongitude')
                        lat = float(lat_el.text) if lat_el is not None and lat_el.text else 34.0
                        lng = float(lng_el.text) if lng_el is not None and lng_el.text else 9.0
                        sev_map = {'Red': 5, 'Orange': 4, 'Green': 3}
                        sev = sev_map.get(alert.text if alert is not None else '', 2)
                        hazards.append({
                            'properties': {'what': f'{event_type.text or "Disaster"} — {subtype.text or ""}', 'severity': sev},
                            'geometry': {'coordinates': [lng, lat]},
                            'type': (event_type.text or 'disaster').lower(),
                            'severity': sev,
                            'source': 'gdacs',
                        })
        except Exception:
            pass

        # 3. EMSC earthquakes (Mediterranean region)
        try:
            url = 'https://www.seismicportal.eu/fdsnws/event/1/query'
            params = {'format': 'geojson', 'minlatitude': 30, 'maxlatitude': 40, 'minlongitude': 5, 'maxlongitude': 15, 'orderby': 'time', 'limit': 30, 'minmagnitude': 2.0}
            resp = await client.get(url, params=params)
            data = resp.json()
            for feat in data.get('features', []):
                mag = feat.get('properties', {}).get('mag', 0) or 0
                if mag >= 2.0:
                    coords = feat.get('geometry', {}).get('coordinates', [0, 0, 0])
                    sev = min(5, max(1, int(mag)))
                    place = feat.get('properties', {}).get('flynn_region', 'Mediterranean')
                    hazards.append({
                        'properties': {'what': f'Earthquake M{mag:.1f} — {place}', 'severity': sev},
                        'geometry': {'coordinates': [coords[0], coords[1]]},
                        'type': 'earthquake',
                        'severity': sev,
                        'source': 'emsc',
                        'timestamp': feat.get('properties', {}).get('time', 0),
                    })
        except Exception:
            pass

    return {'hazards': hazards, 'count': len(hazards), 'sources': ['open-meteo', 'gdacs', 'emsc'], 'timestamp': datetime.now().isoformat()}


@router.get('/tmaps/geocode')
async def tmaps_geocode(q: str = Query(..., min_length=1)):
    """Proxy Photon geocoding endpoint."""
    url = _build_geocode_url(q)
    async with httpx.AsyncClient(timeout=10, headers=PHOTON_HEADERS) as client:
        try:
            resp = await client.get(url)
            data = resp.json()
            results = []
            for feat in data.get('features', []):
                p = feat.get('properties', {})
                coords = feat.get('geometry', {}).get('coordinates', [])
                if p.get('countrycode') == 'TN':
                    results.append({
                        'lat': coords[1] if len(coords) > 1 else 0,
                        'lng': coords[0] if len(coords) > 0 else 0,
                        'formatted': p.get('name', ''),
                        'confidence': 0.9,
                    })
            return {'results': results}
        except Exception as e:
            raise HTTPException(502, f'Geocoding failed: {str(e)}')


@router.post('/tmaps/route')
async def tmaps_route(req: RouteRequest):
    """Proxy OSRM routing endpoint with city name resolution via Photon."""
    CITY_COORDS = {
        'tunis': (36.8065, 10.1815), 'ariana': (36.8625, 10.1956),
        'ben arous': (36.7459, 10.2214), 'manouba': (36.8081, 10.0972),
        'sfax': (34.7400, 10.7600), 'sousse': (35.8256, 10.6411),
        'bizerte': (37.2744, 9.8739), 'nabeul': (36.4561, 10.7378),
        'monastir': (35.7833, 10.8333), 'mahdia': (35.5047, 11.0622),
        'kairouan': (35.6781, 10.0963), 'jendouba': (36.5011, 8.7803),
        'gafsa': (34.4250, 8.7842), 'gabes': (33.8815, 10.0982),
        'medenine': (33.3549, 10.5055), 'tataouine': (32.9297, 10.4518),
        'tozeur': (33.9197, 8.1335), 'kebili': (33.7044, 8.9692),
        'beja': (36.7256, 9.1817), 'le kef': (36.1741, 8.7049),
        'siliana': (36.0849, 9.3708), 'zaghouan': (36.4029, 10.1429),
        'kasserine': (35.1676, 8.8365),
    }

    def resolve(name):
        lower = name.lower().strip()
        if lower in CITY_COORDS:
            return CITY_COORDS[lower]
        return None

    async with httpx.AsyncClient(timeout=15, headers=PHOTON_HEADERS) as client:
        o_coords = resolve(req.origin)
        d_coords = resolve(req.destination)

        if not o_coords:
            try:
                url = _build_geocode_url(req.origin)
                resp = await client.get(url)
                data = resp.json()
                for feat in data.get('features', []):
                    p = feat.get('properties', {})
                    coords = feat.get('geometry', {}).get('coordinates', [])
                    if p.get('countrycode') == 'TN' and len(coords) == 2:
                        o_coords = (coords[1], coords[0])
                        break
            except Exception:
                pass

        if not d_coords:
            try:
                url = _build_geocode_url(req.destination)
                resp = await client.get(url)
                data = resp.json()
                for feat in data.get('features', []):
                    p = feat.get('properties', {})
                    coords = feat.get('geometry', {}).get('coordinates', [])
                    if p.get('countrycode') == 'TN' and len(coords) == 2:
                        d_coords = (coords[1], coords[0])
                        break
            except Exception:
                pass

    if not o_coords or not d_coords:
        raise HTTPException(400, f"Could not resolve {'origin' if not o_coords else 'destination'}: {req.origin if not o_coords else req.destination}")

    # OSRM uses lng,lat ordering
    url = f'{OSRM_BASE}/driving/{o_coords[1]},{o_coords[0]};{d_coords[1]},{d_coords[0]}'
    params = {'steps': True, 'geometries': 'geojson', 'overview': 'full'}

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, params=params)
            data = resp.json()

            routes = data.get('routes', [])
            if not routes:
                raise HTTPException(404, f'OSRM: {data.get("code", "No route found")}')

            route = routes[0]
            coords = route.get('geometry', {}).get('coordinates', [])

            steps = []
            for leg in route.get('legs', []):
                for step in leg.get('steps', []):
                    steps.append({
                        'instruction': step.get('maneuver', {}).get('instruction', '') or step.get('name', ''),
                        'distance_m': step.get('distance', 0),
                        'duration_s': step.get('duration', 0),
                    })

            return {
                'distance_km': round(route.get('distance', 0) / 1000, 1),
                'duration_min': round(route.get('duration', 0) / 60),
                'coordinates': coords,
                'origin': {'name': req.origin, 'lat': o_coords[0], 'lng': o_coords[1]},
                'destination': {'name': req.destination, 'lat': d_coords[0], 'lng': d_coords[1]},
                'steps': steps,
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(502, f'Routing failed: {str(e)}')

@router.post('/current-weather')
async def current_weather(request: WeatherRequest):
    import random
    from datetime import datetime
    city_seed = sum(ord(c) for c in request.city)
    random.seed(city_seed + datetime.now().timetuple().tm_yday)
    risk_levels = ['GREEN', 'YELLOW', 'ORANGE', 'RED']
    risk_level = random.choice(risk_levels)
    weather = {
        'temp_max': round(random.uniform(15, 38), 1),
        'temp_min': round(random.uniform(8, 20), 1),
        'temp_avg': round(random.uniform(12, 28), 1),
        'wind_speed': round(random.uniform(5, 45), 1),
        'humidity': random.randint(30, 90),
        'precipitation': round(random.uniform(0, 20), 1)
    }
    random.seed()
    return {
        'city': request.city,
        'risk_level': risk_level,
        'weather': weather,
        'date': request.date or str(datetime.now().date())
    }
