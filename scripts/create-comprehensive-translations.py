import json

# Load current translations
with open('lib/translations/he.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Define all the missing translations that need to be added
additional_translations = {
    # Flat keys that some components use directly
    "adminBookings.status": "סטטוס",
    "common.status": "סטטוס", 
    "purchaseFilters.statuses": "סטטוסים",
    
    # Nested status translations for admin bookings
    "adminBookings.status.pendingAssignment": "ממתין להקצאה",
    "adminBookings.status.confirmed": "מאושר",
    "adminBookings.status.enRoute": "בדרך", 
    "adminBookings.status.completed": "הושלם",
    "adminBookings.status.cancelledByUser": "בוטל על ידי המשתמש",
    "adminBookings.status.cancelledByAdmin": "בוטל על ידי המנהל",
    "adminBookings.status.noShow": "לא הגיע",
    
    # Common status translations
    "common.status.unknown": "לא ידוע",
    
    # Purchase filter status translations  
    "purchaseFilters.statuses.pending": "ממתין",
    "purchaseFilters.statuses.completed": "הושלם",
    "purchaseFilters.statuses.active": "פעיל",
    "purchaseFilters.statuses.cancelled": "בוטל",
    "purchaseFilters.statuses.expired": "פג תוקף",
    "purchaseFilters.statuses.partiallyUsed": "נוצל חלקית",
    "purchaseFilters.statuses.fullyUsed": "נוצל במלואו"
}

def add_translation_to_object(obj, key, value):
    """Add a translation key to the object, creating nested structure as needed"""
    keys = key.split('.')
    current = obj
    
    for i, k in enumerate(keys):
        if i == len(keys) - 1:
            # Last key - set the value
            current[k] = value
        else:
            # Intermediate key - ensure it's an object
            if k not in current:
                current[k] = {}
            elif not isinstance(current[k], dict):
                # If it's not a dict, we need to keep the existing value but also allow nesting
                # This is a complex case - for now, let's convert to dict
                current[k] = {}
            current = current[k]

# Add all the additional translations
for key, value in additional_translations.items():
    add_translation_to_object(data, key, value)

# Save the updated file
with open('lib/translations/he.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Added {len(additional_translations)} translations to he.json")
print("Translation file updated successfully!") 