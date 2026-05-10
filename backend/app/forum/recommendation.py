USER_PROFILES = {
    "fisherman":  ["vagues", "mer", "vent", "côte", "storm", "sea"],
    "delivery":   ["route", "pluie", "inondation", "circulation", "flood"],
    "student":    ["cours", "école", "bac", "suspension", "fermeture"],
    "farmer":     ["grêle", "sécheresse", "gelée", "agricole"],
    "general":    [],  # gets everything
}
# Score = keyword match + governorate match + risk_level weight
# Triggers Notification if score > threshold