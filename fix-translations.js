const fs = require('fs');
const path = require('path');

// Function to recursively find all files with specific extensions
function findFiles(dir, extensions, exclude = []) {
  let results = [];
  
  if (exclude.some(ex => dir.includes(ex))) {
    return results;
  }
  
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat && stat.isDirectory()) {
        results = results.concat(findFiles(filePath, extensions, exclude));
      } else if (extensions.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    });
  } catch (err) {
    console.log(`Error reading directory ${dir}:`, err.message);
  }
  
  return results;
}

// Function to extract translation keys from file content
function extractKeysFromContent(content) {
  const keys = new Set();
  
  // Pattern for t('key') or t("key")
  const tPattern = /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g;
  
  // Pattern for useTranslation keys
  const useTranslationPattern = /useTranslation\s*\(\s*['"`]([^'"`]+)['"`]/g;
  
  // Pattern for translation object access like translations.key
  const translationAccessPattern = /translations\.([a-zA-Z][a-zA-Z0-9_.]*)/g;
  
  let match;
  
  // Extract t('key') patterns
  while ((match = tPattern.exec(content)) !== null) {
    keys.add(match[1]);
  }
  
  // Extract useTranslation patterns
  while ((match = useTranslationPattern.exec(content)) !== null) {
    keys.add(match[1]);
  }
  
  // Extract translations.key patterns
  while ((match = translationAccessPattern.exec(content)) !== null) {
    keys.add(match[1]);
  }
  
  return Array.from(keys);
}

// Function to create nested object from dot notation key
function setNestedValue(obj, key, value) {
  const parts = key.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
}

// Function to get nested value from object
function getNestedValue(obj, key) {
  const parts = key.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

// Function to merge translation objects
function mergeTranslations(base, existing) {
  const result = JSON.parse(JSON.stringify(base)); // Deep clone
  
  function mergeRecursive(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        mergeRecursive(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  
  if (existing) {
    mergeRecursive(result, existing);
  }
  
  return result;
}

console.log('🔍 Scanning project for translation keys...');

// Find all relevant files
const extensions = ['.tsx', '.ts', '.js', '.jsx'];
const excludeDirs = ['node_modules', '.git', '.next', 'dist', 'build'];
const files = findFiles('.', extensions, excludeDirs);

console.log(`📁 Found ${files.length} files to scan`);

// Extract all translation keys
const allKeys = new Set();
let fileCount = 0;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const keys = extractKeysFromContent(content);
    
    if (keys.length > 0) {
      console.log(`📄 ${file}: ${keys.length} keys`);
      keys.forEach(key => allKeys.add(key));
      fileCount++;
    }
  } catch (err) {
    console.log(`❌ Error reading ${file}:`, err.message);
  }
});

console.log(`\n✅ Extracted ${allKeys.size} unique translation keys from ${fileCount} files`);

// Read existing translation files
let englishTranslations = {};
let hebrewTranslations = {};

try {
  if (fs.existsSync('lib/translations/en.json')) {
    englishTranslations = JSON.parse(fs.readFileSync('lib/translations/en.json', 'utf8'));
    console.log('📖 Loaded English translations');
  }
} catch (err) {
  console.log('⚠️  Error loading English translations:', err.message);
}

try {
  if (fs.existsSync('lib/translations/he.json')) {
    const content = fs.readFileSync('lib/translations/he.json', 'utf8');
    // Try to fix common JSON issues
    let fixedContent = content
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/([}\]])(\s*)([^,}\]\s])/g, '$1,$2$3'); // Add missing commas
    
    try {
      hebrewTranslations = JSON.parse(fixedContent);
      console.log('📖 Loaded existing Hebrew translations');
    } catch (parseErr) {
      console.log('⚠️  Could not parse Hebrew translations, starting fresh');
    }
  }
} catch (err) {
  console.log('⚠️  Error loading Hebrew translations:', err.message);
}

// Create the final translation object
const finalTranslations = mergeTranslations(englishTranslations, hebrewTranslations);

// Add any missing keys from the extracted keys
const missingKeys = [];
Array.from(allKeys).forEach(key => {
  if (getNestedValue(finalTranslations, key) === undefined) {
    const englishValue = getNestedValue(englishTranslations, key);
    if (englishValue) {
      setNestedValue(finalTranslations, key, englishValue);
      missingKeys.push(key);
    } else {
      // If no English translation exists, use the key itself
      setNestedValue(finalTranslations, key, key);
      missingKeys.push(key);
    }
  }
});

if (missingKeys.length > 0) {
  console.log(`\n🔧 Added ${missingKeys.length} missing keys:`);
  missingKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));
  if (missingKeys.length > 10) {
    console.log(`  ... and ${missingKeys.length - 10} more`);
  }
}

// Create backup of original file
if (fs.existsSync('lib/translations/he.json')) {
  fs.copyFileSync('lib/translations/he.json', 'lib/translations/he.json.backup');
  console.log('💾 Created backup: he.json.backup');
}

// Write the fixed translation file
try {
  const jsonString = JSON.stringify(finalTranslations, null, 2);
  fs.writeFileSync('lib/translations/he.json', jsonString, 'utf8');
  console.log('✅ Successfully created fixed Hebrew translation file!');
  
  // Validate the created JSON
  JSON.parse(jsonString);
  console.log('✅ JSON validation passed!');
  
  // Statistics
  const totalKeys = JSON.stringify(finalTranslations).match(/"/g).length / 2;
  console.log(`\n📊 Translation Statistics:`);
  console.log(`   Total keys: ${totalKeys}`);
  console.log(`   Missing keys added: ${missingKeys.length}`);
  console.log(`   Files scanned: ${fileCount}`);
  
} catch (err) {
  console.log('❌ Error writing translation file:', err.message);
}

console.log('\n🎉 Translation fix completed!'); 