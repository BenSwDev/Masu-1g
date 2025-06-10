const fs = require('fs')

function addRemainingTranslations() {
  console.log('🔄 Adding remaining missing translations...\n')
  
  // Read current Hebrew translations
  const heTranslations = JSON.parse(fs.readFileSync('./lib/translations/he.json', 'utf8'))
  
  function addTranslationToObject(obj, key, value) {
    const keys = key.split('.')
    let current = obj
    
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]
      if (i === keys.length - 1) {
        current[k] = value
      } else {
        if (!current[k]) {
          current[k] = {}
        }
        current = current[k]
      }
    }
  }
  
  // Add the missing nested translations
  const remainingTranslations = {
    // Common status
    "common.status.unknown": "לא ידוע",
    
    // Purchase filter statuses
    "purchaseFilters.statuses.pending": "ממתין",
    "purchaseFilters.statuses.completed": "הושלם",
    "purchaseFilters.statuses.active": "פעיל",
    "purchaseFilters.statuses.cancelled": "בוטל",
    "purchaseFilters.statuses.expired": "פג תוקף",
    "purchaseFilters.statuses.partiallyUsed": "נוצל חלקית",
    "purchaseFilters.statuses.fullyUsed": "נוצל במלואו",
    
    // Admin booking statuses
    "adminBookings.status.pendingAssignment": "ממתין להקצאה",
    "adminBookings.status.confirmed": "מאושר",
    "adminBookings.status.enRoute": "בדרך",
    "adminBookings.status.completed": "הושלם",
    "adminBookings.status.cancelledByUser": "בוטל על ידי המשתמש",
    "adminBookings.status.cancelledByAdmin": "בוטל על ידי המנהל",
    "adminBookings.status.noShow": "לא הגיע"
  }
  
  let addedCount = 0
  
  // Add each missing translation
  for (const [key, value] of Object.entries(remainingTranslations)) {
    addTranslationToObject(heTranslations, key, value)
    addedCount++
    console.log(`✅ Added: ${key} -> ${value}`)
  }
  
  // Write updated file
  fs.writeFileSync('./lib/translations/he.json', JSON.stringify(heTranslations, null, 2), 'utf8')
  
  console.log(`\n✅ Successfully added ${addedCount} remaining translations!`)
  console.log('📝 Updated he.json file with all remaining translations.')
  
  return addedCount
}

// Run the script
if (require.main === module) {
  addRemainingTranslations()
}

module.exports = { addRemainingTranslations } 