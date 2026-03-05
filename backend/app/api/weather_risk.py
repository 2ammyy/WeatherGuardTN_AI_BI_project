# test_flood.py
import requests

response = requests.post(
    "http://localhost:8000/predict",
    json={
        "temp_max": 11.1,
        "temp_min": 9.7,
        "temp_avg": 10.4,
        "wind_speed": 20.1,
        "humidity": 99.8,
        "precipitation": 71.9,
        "city": "Tunis"
    }
)
print(response.json())