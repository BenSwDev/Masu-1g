import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Load translation files
async function loadTranslations() {
  const translations = {};
  const files = ['en', 'he', 'ru'];
  
  for (const lang of files) {
    try {
      const content = await fs.promises.readFile(`./lib/translations/${lang}.json`, 'utf8');
      translations[lang] = JSON.parse(content);
    } catch (error) {
      console.error(`Error loading ${lang}.json:`, error.message);
      translations[lang] = {};
    }
  }
  
  return translations;
}

// Check if a key exists in any translation file
function keyExistsInTranslations(key, translations) {
  for (const lang in translations) {
    if (keyExistsInObject(translations[lang], key)) {
      return true;
    }
  }
  return false;
}

// Check if a key exists in an object (handles nested paths)
function keyExistsInObject(obj, path) {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (!current || !current[part]) return false;
    current = current[part];
  }
  
  return true;
}

// Extract translation keys from file content
function extractTranslationKeys(content) {
  const keys = new Set();
  
  // Match patterns like t('key.subkey') or t("key.subkey") or useTranslation('namespace')
  const translationCalls = [
    /t\(['"]([^'"]+)['"]\)/g,                 // t('key')
    /t\(['"]([^'"]+)['"],[^)]+\)/g,          // t('key', {})
    /useTranslation\(\s*['"]([^'"]+)['"]\s*\)/g, // useTranslation('namespace')
    /\{\s*t\(['"]([^'"]+)['"]\)\s*\}/g,       // {t('key')}
    /\{\s*t\(['"]([^'"]+)['"],[^)]+\)\s*\}/g // {t('key', {})}
  ];
  
  for (const pattern of translationCalls) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      keys.add(match[1]);
    }
  }
  
  return Array.from(keys);
}

// Add missing keys to translations
function addMissingKeys(translations, missingKeys) {
  for (const lang in translations) {
    for (const key of missingKeys) {
      const parts = key.split('.');
      let current = translations[lang];
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // Use the key as the default value
          current[part] = part;
        } else {
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }
  }
  return translations;
}

// Save translations back to files
async function saveTranslations(translations) {
  for (const lang in translations) {
    const filePath = `./lib/translations/${lang}.json`;
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(translations[lang], null, 2),
      'utf8'
    );
    console.log(`Updated ${filePath}`);
  }
}

// Main function to find and add missing translation keys
async function findAndAddMissingTranslationKeys() {
  try {
    // Load translations
    const translations = await loadTranslations();
    
    // Find all TypeScript and TypeScript React files
    const files = await glob('./app/**/*.{ts,tsx}');
    files.push(...await glob('./components/**/*.{ts,tsx}'));
    
    // Track all used keys and missing keys
    const usedKeys = new Set();
    const missingKeys = new Set();
    const fileKeyMap = {};
    
    // Process each file
    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf8');
      const keys = extractTranslationKeys(content);
      
      if (keys.length > 0) {
        fileKeyMap[file] = [];
        
        for (const key of keys) {
          usedKeys.add(key);
          
          if (!keyExistsInTranslations(key, translations)) {
            missingKeys.add(key);
            fileKeyMap[file].push(key);
          }
        }
      }
    }
    
    if (missingKeys.size > 0) {
      console.log(`Found ${missingKeys.size} missing translation keys:`);
      console.log('----------------------------------------');
      
      // Group by file for easier debugging
      for (const file in fileKeyMap) {
        if (fileKeyMap[file].length > 0) {
          console.log(`\nIn ${file}:`);
          for (const key of fileKeyMap[file]) {
            console.log(`  - "${key}"`);
          }
        }
      }
      
      // Add missing keys to translations
      const updatedTranslations = addMissingKeys(translations, missingKeys);
      
      // Save updated translations
      await saveTranslations(updatedTranslations);
      
      console.log('\n----------------------------------------');
      console.log('Added missing keys to all translation files.');
    } else {
      console.log('No missing translation keys found.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
findAndAddMissingTranslationKeys();