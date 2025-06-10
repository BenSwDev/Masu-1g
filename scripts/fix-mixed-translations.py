import json

# Load current translations
with open('lib/translations/he.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# The issue is that some files expect flat keys like "common.status" to return a string,
# while others expect nested access like "common.status.unknown"
# The solution is to add the flat keys explicitly as strings alongside the nested structure

# For common.status, we need both the flat key and nested keys
if 'common' in data:
    # If status is currently an object, keep the nested structure but also add flat access
    if isinstance(data['common'].get('status'), dict):
        # Keep existing nested structure
        status_nested = data['common']['status']
        # But we need to be able to access "common.status" as a flat key too
        # In this case, we'll add a special "_value" key that contains the flat translation
        # Actually, let's restructure this properly
        pass
    
    # The cleanest solution is to add a separate flat key
    # Since the i18n system looks for exact key matches, we need "status" to be a string
    # when accessed as "common.status", and also support "common.status.unknown"
    
    # Let's replace the object with a string and add the nested keys separately
    data['common']['status'] = "סטטוס"
    
    # Add the nested status keys at the same level  
    if 'status' in data['common'] and isinstance(data['common']['status'], str):
        # Add nested keys as separate entries
        data['common']['status.unknown'] = "לא ידוע"

# For adminBookings.status
if 'adminBookings' in data:
    # Same approach - flat key as string, nested as separate entries
    data['adminBookings']['status'] = "סטטוס"
    
    # Add nested status keys
    nested_admin_statuses = {
        'status.pendingAssignment': 'ממתין להקצאה',
        'status.confirmed': 'מאושר', 
        'status.enRoute': 'בדרך',
        'status.completed': 'הושלם',
        'status.cancelledByUser': 'בוטל על ידי המשתמש',
        'status.cancelledByAdmin': 'בוטל על ידי המנהל',
        'status.noShow': 'לא הגיע'
    }
    
    for key, value in nested_admin_statuses.items():
        data['adminBookings'][key] = value

# For purchaseFilters.statuses  
if 'purchaseFilters' in data:
    data['purchaseFilters']['statuses'] = "סטטוסים"
    
    # Add nested statuses
    nested_filter_statuses = {
        'statuses.pending': 'ממתין',
        'statuses.completed': 'הושלם', 
        'statuses.active': 'פעיל',
        'statuses.cancelled': 'בוטל',
        'statuses.expired': 'פג תוקף',
        'statuses.partiallyUsed': 'נוצל חלקית',
        'statuses.fullyUsed': 'נוצל במלואו'
    }
    
    for key, value in nested_filter_statuses.items():
        data['purchaseFilters'][key] = value

# Save the updated file
with open('lib/translations/he.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Fixed translation structure to support both flat and nested access!")
print("- common.status: string")
print("- common.status.unknown: nested access") 
print("- adminBookings.status: string")
print("- adminBookings.status.*: nested access")
print("- purchaseFilters.statuses: string")
print("- purchaseFilters.statuses.*: nested access") 