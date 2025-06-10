import json

# Load the file
with open('lib/translations/he.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix adminBookings.status structure
if 'adminBookings' in data and isinstance(data['adminBookings']['status'], str):
    data['adminBookings']['status'] = {
        'pendingAssignment': 'ממתין להקצאה',
        'confirmed': 'מאושר', 
        'enRoute': 'בדרך',
        'completed': 'הושלם',
        'cancelledByUser': 'בוטל על ידי המשתמש',
        'cancelledByAdmin': 'בוטל על ידי המנהל',
        'noShow': 'לא הגיע'
    }

# Fix common.status structure  
if 'common' in data and isinstance(data['common']['status'], str):
    data['common']['status'] = {
        'unknown': 'לא ידוע'
    }

# Fix purchaseFilters.statuses structure
if 'purchaseFilters' in data and isinstance(data['purchaseFilters']['statuses'], str):
    data['purchaseFilters']['statuses'] = {
        'pending': 'ממתין',
        'completed': 'הושלם',
        'active': 'פעיל',
        'cancelled': 'בוטל',
        'expired': 'פג תוקף',
        'partiallyUsed': 'נוצל חלקית',
        'fullyUsed': 'נוצל במלואו'
    }

# Save the file
with open('lib/translations/he.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Fixed translation structures!') 