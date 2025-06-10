const fs = require('fs')
const path = require('path')

// Read the current Hebrew translations
const heTranslations = JSON.parse(fs.readFileSync('./lib/translations/he.json', 'utf8'))

// Function to check if a translation key exists in the JSON
function hasTranslation(key, obj) {
  const keys = key.split('.')
  let current = obj
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k]
    } else {
      return false
    }
  }
  
  return typeof current === 'string'
}

// Function to recursively search for files
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath)
  
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      // Skip node_modules and .next directories
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles)
      }
    } else {
      // Only check .tsx, .ts, .jsx, .js files
      if (/\.(tsx?|jsx?)$/.test(file)) {
        arrayOfFiles.push(fullPath)
      }
    }
  })
  
  return arrayOfFiles
}

// Function to extract translation keys from file content
function extractTranslationKeys(content) {
  const keys = new Set()
  
  // Match patterns like t("key") or t('key') or t(`key`)
  const patterns = [
    /t\(["'`]([^"'`]+)["'`]\)/g,
    /t\(\s*["'`]([^"'`]+)["'`]\s*\)/g
  ]
  
  patterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      keys.add(match[1])
    }
  })
  
  return Array.from(keys)
}

// Main function
function findMissingTranslations() {
  console.log('🔍 Searching for missing translations...\n')
  
  const allFiles = getAllFiles('.')
  const missingKeys = new Set()
  const foundKeys = new Set()
  
  allFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8')
    const keys = extractTranslationKeys(content)
    
    keys.forEach(key => {
      foundKeys.add(key)
      if (!hasTranslation(key, heTranslations)) {
        missingKeys.add(key)
        console.log(`❌ Missing: "${key}" in ${filePath}`)
      }
    })
  })
  
  console.log(`\n📊 Summary:`)
  console.log(`   Total translation keys found: ${foundKeys.size}`)
  console.log(`   Missing translations: ${missingKeys.size}`)
  
  if (missingKeys.size > 0) {
    console.log(`\n📝 Missing keys:`)
    Array.from(missingKeys).sort().forEach(key => {
      console.log(`   - ${key}`)
    })
    
    // Create a structure for missing keys
    const missingStructure = {}
    Array.from(missingKeys).forEach(key => {
      const keys = key.split('.')
      let current = missingStructure
      
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i]
        if (i === keys.length - 1) {
          current[k] = key // Use the full key as placeholder
        } else {
          if (!current[k]) {
            current[k] = {}
          }
          current = current[k]
        }
      }
    })
    
    console.log(`\n🔧 JSON structure for missing translations:`)
    console.log(JSON.stringify(missingStructure, null, 2))
    
    return Array.from(missingKeys)
  } else {
    console.log(`\n✅ All translations are present!`)
    return []
  }
}

// Run the script
if (require.main === module) {
  findMissingTranslations()
}

module.exports = { findMissingTranslations } 