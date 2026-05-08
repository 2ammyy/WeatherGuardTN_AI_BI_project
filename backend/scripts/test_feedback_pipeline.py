"""Test priority feedback API endpoints."""
import requests
import json

s = requests.Session()
login = s.post("http://localhost:8000/admin/login",
               data={"username": "admin@weatherguard.com", "password": "admin123"},
               allow_redirects=False)
print("Login:", login.status_code)

# Log feedback
fb = s.post("http://localhost:8000/api/admin/priority/feedback", json={
    "input_text": "This user is posting spam links to fake websites",
    "ai_predicted_priority": "low",
    "ai_predicted_score": 45,
    "ai_probabilities": json.dumps({"high": 0.1, "medium": 0.3, "low": 0.6}),
    "admin_corrected_priority": "medium",
    "notes": "Spam with malicious intent should be medium priority"
})
print("Feedback log:", fb.status_code, fb.json())

# List feedback
lst = s.get("http://localhost:8000/api/admin/priority/feedback")
print("Feedback list:", lst.status_code)
data = lst.json()
if isinstance(data, list):
    print(f"  {len(data)} entries")
    if data:
        print(f"  First: {data[0]['input_text'][:60]}... → ai: {data[0]['ai_predicted_priority']}, admin: {data[0]['admin_corrected_priority']}")

# Log more feedback entries for retrain testing
for text, wrong, correct in [
    ("Fraud alert - someone is impersonating an admin", "low", "high"),
    ("Post is in the wrong category, should be under alerts", "low", "medium"),
    ("This comment is a minor typo, nothing serious", "medium", "low"),
]:
    s.post("http://localhost:8000/api/admin/priority/feedback", json={
        "input_text": text,
        "ai_predicted_priority": wrong,
        "ai_predicted_score": 40,
        "admin_corrected_priority": correct,
    })
    print(f"  Logged: '{text[:50]}...' {wrong}→{correct}")

# Retrain
rt = s.post("http://localhost:8000/api/admin/priority/retrain")
print("\nRetrain:", rt.status_code, rt.json())

# Verify model improved
from app.admin.priority import classify_priority
for text, expected in [
    ("Fraud alert - someone is impersonating an admin", "high"),
    ("Post is in the wrong category, should be under alerts", "medium"),
]:
    result = classify_priority(text)
    ok = "✓" if result["priority"] == expected else "✗"
    print(f"  {ok} '{text[:50]}...' → {result['priority']} (expected {expected})")

print("\n✅ All feedback pipeline tests complete")
