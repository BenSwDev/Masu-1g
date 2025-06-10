#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const glob = require('glob')
const { findMissingTranslations } = require('./find-missing-translations')

/**
 * סקריפט לעדכון תרגומים אוטומטי
 * סורק את כל קבצי הקוד, מוצא מפתחות תרגום חסרים ומוסיף אותם לקובץ he.json
 */

// קונפיגורציה
const CONFIG = {
  // תיקיות לסריקה
  scanDirs: [
    'app/**/*.{ts,tsx,js,jsx}',
    'components/**/*.{ts,tsx,js,jsx}',
    'lib/**/*.{ts,tsx,js,jsx}',
    'actions/**/*.{ts,tsx,js,jsx}',
    'hooks/**/*.{ts,tsx,js,jsx}'
  ],
  // קובץ התרגומים
  translationFile: 'lib/translations/he.json',
  // ערך ברירת מחדל למפתחות חסרים
  defaultValue: 'חסר תרגום',
  // תיקיות להתעלמות
  ignoreDirs: ['node_modules', '.next', 'dist', 'build']
}

function addTranslationToObject(obj, key, value) {
  const keys = key.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    if (i === keys.length - 1) {
      // Only add if it doesn't exist
      if (!current[k]) {
        current[k] = value
      }
    } else {
      if (!current[k]) {
        current[k] = {}
      }
      current = current[k]
    }
  }
}

function updateHebrewTranslations() {
  console.log('🔄 Updating Hebrew translations...\n')
  
  // Find missing translations
  const missingKeys = findMissingTranslations()
  
  if (missingKeys.length === 0) {
    console.log('✅ No missing translations found!')
    return
  }
  
  // Read current Hebrew translations
  const heTranslations = JSON.parse(fs.readFileSync('./lib/translations/he.json', 'utf8'))
  
  // Add placeholder translations for missing keys
  missingKeys.forEach(key => {
    addTranslationToObject(heTranslations, key, key) // Use key as placeholder
  })
  
  // Write updated file
  fs.writeFileSync('./lib/translations/he.json', JSON.stringify(heTranslations, null, 2), 'utf8')
  
  console.log(`\n✅ Added ${missingKeys.length} missing translation keys to he.json`)
  console.log('📝 Keys have been added with their original key as placeholder text.')
  console.log('🔤 Now we need to translate these keys from English to Hebrew.\n')
  
  // Display the missing keys
  console.log('🔤 Keys that need Hebrew translation:')
  missingKeys.sort().forEach(key => {
    console.log(`   - ${key}`)
  })
  
  return missingKeys
}

// Run the script
if (require.main === module) {
  updateHebrewTranslations()
}

module.exports = { updateHebrewTranslations } 