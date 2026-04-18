#  Check what's available in Tunisia
import requests

def check_tunisia_coverage():
    endpoints = [
        ('traffic.accident', 'Accidents'),
        ('weather.warning', 'Weather warnings'),
        ('traffic.roadwork', 'Roadworks'),
        ('traffic.jam', 'Traffic jams')
    ]
    
    for event_type, label in endpoints:
        url = "https://api.openeventdatabase.org/event"
        params = {
            'what': event_type,
            'bbox': '7.5,30.0,11.5,37.5',  # Tunisia
            'when': 'now'
        }
        try:
            resp = requests.get(url, params=params, timeout=10)
            count = len(resp.json().get('features', []))
            print(f"{label}: {count} events found")
        except Exception as e:
            print(f"{label}: Error - {e}")

if __name__ == "__main__":
    check_tunisia_coverage()