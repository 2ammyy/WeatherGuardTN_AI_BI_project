import requests
import json
from tabulate import tabulate

base_url = "http://127.0.0.1:8000/api"

def test_scenarios():
    """Test various weather scenarios"""
    
    scenarios = [
        {
            "name": "Normal day",
            "data": {
                "city": "Tunis",
                "temp_max": 25.0,
                "temp_min": 18.0,
                "humidity": 60,
                "wind_speed": 15
            }
        },
        {
            "name": "Hot and humid",
            "data": {
                "city": "Sfax",
                "temp_max": 38.0,
                "temp_min": 24.0,
                "humidity": 85,
                "wind_speed": 20
            }
        },
        {
            "name": "Storm conditions",
            "data": {
                "city": "Bizerte",
                "temp_max": 28.0,
                "temp_min": 20.0,
                "humidity": 95,
                "wind_speed": 45
            }
        },
        {
            "name": "Cold front",
            "data": {
                "city": "Kasserine",
                "temp_max": 12.0,
                "temp_min": 5.0,
                "humidity": 70,
                "wind_speed": 30
            }
        },
        {
            "name": "Desert heat",
            "data": {
                "city": "Tozeur",
                "temp_max": 42.0,
                "temp_min": 28.0,
                "humidity": 20,
                "wind_speed": 25
            }
        }
    ]
    
    results = []
    
    for scenario in scenarios:
        print(f"\nTesting: {scenario['name']}")
        response = requests.post(f"{base_url}/predict", json=scenario['data'])
        
        if response.status_code == 200:
            result = response.json()
            results.append([
                scenario['name'],
                result['risk_level'],
                result['probability'],
                result['recommendation'][:30] + "..."
            ])
            print(f"  Risk: {result['risk_level']} (prob: {result['probability']})")
        else:
            print(f"  Error: {response.status_code}")
    
    # Print summary table
    print("\n" + "="*80)
    print("SUMMARY OF PREDICTIONS")
    print("="*80)
    headers = ["Scenario", "Risk Level", "Probability", "Recommendation"]
    print(tabulate(results, headers=headers, tablefmt="grid"))

def test_all_governorates():
    """Test prediction for all governorates with same weather"""
    print("\n" + "="*80)
    print("TESTING ALL GOVERNORATES")
    print("="*80)
    
    # Get list of governorates
    response = requests.get(f"{base_url}/governorates")
    governorates = response.json()
    
    results = []
    base_weather = {
        "temp_max": 32.0,
        "temp_min": 22.0,
        "humidity": 70,
        "wind_speed": 20
    }
    
    for gov in governorates[:10]:  # Test first 10 to avoid too many calls
        data = {"city": gov, **base_weather}
        response = requests.post(f"{base_url}/predict", json=data)
        
        if response.status_code == 200:
            result = response.json()
            results.append([
                gov,
                result['risk_level'],
                result['probability'],
                result['details']['city_encoded']
            ])
    
    headers = ["Governorate", "Risk Level", "Probability", "City Encoded"]
    print(tabulate(results, headers=headers, tablefmt="grid"))

def test_extreme_values():
    """Test edge cases"""
    print("\n" + "="*80)
    print("TESTING EXTREME VALUES")
    print("="*80)
    
    edge_cases = [
        ("Very hot", {"city": "Tunis", "temp_max": 50.0, "humidity": 10, "wind_speed": 5}),
        ("Very cold", {"city": "Tunis", "temp_max": -5.0, "humidity": 90, "wind_speed": 10}),
        ("Hurricane", {"city": "Tunis", "temp_max": 25.0, "humidity": 100, "wind_speed": 120}),
        ("Drought", {"city": "Tunis", "temp_max": 40.0, "humidity": 5, "wind_speed": 15}),
        ("Missing data", {"city": "Tunis"}),  # Only city provided
    ]
    
    for name, data in edge_cases:
        print(f"\n{name}:")
        response = requests.post(f"{base_url}/predict", json=data)
        if response.status_code == 200:
            result = response.json()
            print(f"  Risk: {result['risk_level']} (prob: {result['probability']:.3f})")
            print(f"  Rec: {result['recommendation']}")
            print(f"  Details: {json.dumps(result['details'], indent=4)}")
        else:
            print(f"  Error: {response.status_code}")

if __name__ == "__main__":
    # First check health
    health = requests.get(f"{base_url}/health")
    print(f"API Health: {health.json()}")
    
    # Run tests
    test_scenarios()
    test_all_governorates()
    test_extreme_values()