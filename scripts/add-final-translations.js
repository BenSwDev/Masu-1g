const fs = require('fs')

function addFinalTranslations() {
  console.log('🔄 Adding final missing translations...\n')
  
  // Read current Hebrew translations
  const heTranslations = JSON.parse(fs.readFileSync('./lib/translations/he.json', 'utf8'))
  
  // Add the missing translations
  const finalTranslations = {
    "purchaseFilters.statuses": "סטטוסים",
    "adminBookings.status": "סטטוס",
    "common.status": "סטטוס", 
    "bookings.confirmation.status": "סטטוס"
  }
  
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
  
  let addedCount = 0
  
  // Add each missing translation
  for (const [key, value] of Object.entries(finalTranslations)) {
    addTranslationToObject(heTranslations, key, value)
    addedCount++
    console.log(`✅ Added: ${key} -> ${value}`)
  }
  
  // Write updated file
  fs.writeFileSync('./lib/translations/he.json', JSON.stringify(heTranslations, null, 2), 'utf8')
  
  console.log(`\n✅ Successfully added ${addedCount} final translations!`)
  console.log('📝 Updated he.json file with remaining translations.')
  
  return addedCount
}

// Run the script
if (require.main === module) {
  addFinalTranslations()
}

module.exports = { addFinalTranslations } 