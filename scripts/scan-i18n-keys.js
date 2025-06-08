const fs = require('fs');
const path = require('path');

// Directories to scan for translation keys
const scanDirs = [
  'app',
  'components', 
  'lib',
  'actions'
];

// Function to recursively find all .tsx, .ts, .jsx, .js files
function findFiles(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (item !== 'node_modules' && item !== '.next' && !item.startsWith('.')) {
        files.push(...findFiles(fullPath, extensions));
      }
    } else if (extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to extract translation keys from file content
function extractKeysFromContent(content) {
  const keys = new Set();
  
  // Pattern for t("key") or t('key') or t(`key`)
  const tCallRegex = /\bt\(\s*["'`]([^"'`]+)["'`]/g;
  
  let match;
  while ((match = tCallRegex.exec(content)) !== null) {
    const key = match[1];
    if (key && !key.includes('${') && !key.includes('{{')) {
      keys.add(key);
    }
  }
  
  // Pattern for titleKey="key" or similar props
  const titleKeyRegex = /(?:titleKey|messageKey|labelKey|placeholderKey|descriptionKey)\s*=\s*["'`]([^"'`]+)["'`]/g;
  
  while ((match = titleKeyRegex.exec(content)) !== null) {
    const key = match[1];
    if (key && !key.includes('${') && !key.includes('{{')) {
      keys.add(key);
    }
  }
  
  return Array.from(keys);
}

// Function to build nested object from dot notation key
function setNestedValue(obj, key, value = key.split('.').pop()) {
  const parts = key.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }
  
  const lastPart = parts[parts.length - 1];
  if (!current[lastPart]) {
    current[lastPart] = value;
  }
}

// Main function to scan and generate required translations
function scanAndGenerateTranslations() {
  console.log('🔍 Scanning codebase for translation keys...');
  
  const allKeys = new Set();
  
  // Scan all directories
  for (const dir of scanDirs) {
    const files = findFiles(dir);
    console.log(`📁 Scanning ${dir}/ - found ${files.length} files`);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const keys = extractKeysFromContent(content);
        
        if (keys.length > 0) {
          console.log(`   📄 ${file}: ${keys.length} keys`);
          keys.forEach(key => allKeys.add(key));
        }
      } catch (error) {
        console.warn(`⚠️  Error reading ${file}:`, error.message);
      }
    }
  }
  
  console.log(`\n✅ Total unique translation keys found: ${allKeys.size}`);
  
  // Sort keys alphabetically
  const sortedKeys = Array.from(allKeys).sort();
  
  // Build nested translation object
  const translations = {};
  
  for (const key of sortedKeys) {
    setNestedValue(translations, key);
  }
  
  // Write required keys to file
  fs.writeFileSync(
    'scripts/required-translations.json',
    JSON.stringify(translations, null, 2),
    'utf-8'
  );
  
  // Write flat list for debugging
  fs.writeFileSync(
    'scripts/all-keys.txt',
    sortedKeys.join('\n'),
    'utf-8'
  );
  
  console.log('📝 Generated files:');
  console.log('   - scripts/required-translations.json (nested structure)');
  console.log('   - scripts/all-keys.txt (flat list)');
  
  return { translations, keys: sortedKeys };
}

// Function to compare with existing translations and find missing keys
function compareWithExisting(requiredTranslations) {
  console.log('\n🔍 Comparing with existing translations...');
  
  const existingHe = JSON.parse(fs.readFileSync('lib/translations/he.json', 'utf-8'));
  const existingEn = JSON.parse(fs.readFileSync('lib/translations/en.json', 'utf-8'));
  const existingRu = JSON.parse(fs.readFileSync('lib/translations/ru.json', 'utf-8'));
  
  function findMissingKeys(obj, existing, prefix = '') {
    const missing = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        if (!existing[key] || typeof existing[key] !== 'object') {
          missing.push(fullKey);
        } else {
          missing.push(...findMissingKeys(value, existing[key], fullKey));
        }
      } else {
        if (!existing[key]) {
          missing.push(fullKey);
        }
      }
    }
    
    return missing;
  }
  
  const missingHe = findMissingKeys(requiredTranslations, existingHe);
  const missingEn = findMissingKeys(requiredTranslations, existingEn);
  const missingRu = findMissingKeys(requiredTranslations, existingRu);
  
  console.log(`🇮🇱 Hebrew missing: ${missingHe.length} keys`);
  console.log(`🇺🇸 English missing: ${missingEn.length} keys`);
  console.log(`🇷🇺 Russian missing: ${missingRu.length} keys`);
  
  if (missingHe.length > 0) {
    console.log('\n❌ Missing Hebrew keys:');
    missingHe.forEach(key => console.log(`   - ${key}`));
  }
  
  if (missingEn.length > 0) {
    console.log('\n❌ Missing English keys:');
    missingEn.forEach(key => console.log(`   - ${key}`));
  }
  
  if (missingRu.length > 0) {
    console.log('\n❌ Missing Russian keys:');
    missingRu.forEach(key => console.log(`   - ${key}`));
  }
  
  return { missingHe, missingEn, missingRu };
}

// Main execution
if (require.main === module) {
  try {
    // Create scripts directory if it doesn't exist
    if (!fs.existsSync('scripts')) {
      fs.mkdirSync('scripts');
    }
    
    const { translations } = scanAndGenerateTranslations();
    const missing = compareWithExisting(translations);
    
    console.log('\n✅ Scan complete! Check the generated files for details.');
    
    if (missing.missingHe.length === 0 && missing.missingEn.length === 0 && missing.missingRu.length === 0) {
      console.log('🎉 All translation keys are present!');
    } else {
      console.log('⚠️  Some translation keys are missing. Run the fix script to add them.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  scanAndGenerateTranslations,
  compareWithExisting,
  extractKeysFromContent,
  findFiles
};
