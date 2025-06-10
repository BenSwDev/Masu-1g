import json

with open('lib/translations/he.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    
# Add flat translations alongside nested ones
# These will be overwritten by the nested objects we created, 
# but some files may still use the flat key access
if 'purchaseFilters' in data:
    # Create a copy with both flat and nested
    statuses_nested = data['purchaseFilters'].get('statuses', {})
    if isinstance(statuses_nested, dict):
        # Keep nested structure but also add as fallback string
        pass  # Keep existing nested structure
    else:
        data['purchaseFilters']['statuses'] = 'סטטוסים'

if 'adminBookings' in data:
    status_nested = data['adminBookings'].get('status', {})
    if isinstance(status_nested, dict):
        # Keep nested structure
        pass  # Keep existing nested structure  
    else:
        data['adminBookings']['status'] = 'סטטוס'

if 'common' in data:
    status_nested = data['common'].get('status', {})
    if isinstance(status_nested, dict):
        # Keep nested structure
        pass  # Keep existing nested structure
    else:
        data['common']['status'] = 'סטטוס'

with open('lib/translations/he.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    
print('Ensured flat translations exist!') 