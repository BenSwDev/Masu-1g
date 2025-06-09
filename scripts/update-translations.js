#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const glob = require('glob')

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

class TranslationUpdater {
  constructor() {
    this.translationKeys = new Set()
    this.existingTranslations = {}
    this.newKeysAdded = []
  }

  /**
   * פונקציה ראשית להרצת הסקריפט
   */
  async run() {
    console.log('🔍 מתחיל סריקה של מפתחות תרגום...\n')
    
    try {
      // שלב 1: קריאת תרגומים קיימים
      await this.loadExistingTranslations()
      
      // שלב 2: סריקת כל הקבצים
      await this.scanAllFiles()
      
      // שלב 3: זיהוי מפתחות חסרים
      const missingKeys = this.findMissingKeys()
      
      // שלב 4: הוספת מפתחות חסרים
      if (missingKeys.length > 0) {
        await this.addMissingKeys(missingKeys)
        await this.saveTranslations()
        
        // שלב 5: יצירת פרומפט לתרגום
        this.generateTranslationPrompt(missingKeys)
      } else {
        console.log('✅ כל מפתחות התרגום קיימים! אין צורך בעדכון.\n')
      }
      
    } catch (error) {
      console.error('❌ שגיאה בהרצת הסקריפט:', error.message)
      process.exit(1)
    }
  }

  /**
   * קריאת קובץ התרגומים הקיים
   */
  async loadExistingTranslations() {
    try {
      if (fs.existsSync(CONFIG.translationFile)) {
        const content = fs.readFileSync(CONFIG.translationFile, 'utf8')
        this.existingTranslations = JSON.parse(content)
        console.log(`📖 נטען קובץ תרגומים: ${CONFIG.translationFile}`)
      } else {
        this.existingTranslations = {}
        console.log(`📝 יוצר קובץ תרגומים חדש: ${CONFIG.translationFile}`)
      }
    } catch (error) {
      throw new Error(`שגיאה בקריאת קובץ התרגומים: ${error.message}`)
    }
  }

  /**
   * סריקת כל הקבצים וחיפוש מפתחות תרגום
   */
  async scanAllFiles() {
    const patterns = CONFIG.scanDirs
    let totalFiles = 0

    for (const pattern of patterns) {
      const files = glob.sync(pattern, { 
        ignore: CONFIG.ignoreDirs.map(dir => `${dir}/**`)
      })
      
      for (const file of files) {
        this.scanFile(file)
        totalFiles++
      }
    }

    console.log(`📁 נסרקו ${totalFiles} קבצים`)
    console.log(`🔑 נמצאו ${this.translationKeys.size} מפתחות תרגום\n`)
  }

  /**
   * סריקת קובץ יחיד לחיפוש מפתחות תרגום
   */
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      
      // דפוסי חיפוש למפתחות תרגום
      const patterns = [
        // t("key") או t('key')
        /\bt\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
        // t("key", {...}) או t('key', {...})
        /\bt\s*\(\s*["'`]([^"'`]+)["'`]\s*,/g,
        // useTranslation().t("key")
        /\.t\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
        // titleKey="key" או descriptionKey="key"
        /(?:title|description|label|placeholder|text)Key\s*=\s*["'`]([^"'`]+)["'`]/g
      ]

      patterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(content)) !== null) {
          const key = match[1].trim()
          if (key && !key.includes('${') && !key.includes('{{')) {
            this.translationKeys.add(key)
          }
        }
      })
    } catch (error) {
      console.warn(`⚠️  שגיאה בקריאת קובץ ${filePath}: ${error.message}`)
    }
  }

  /**
   * מציאת מפתחות חסרים
   */
  findMissingKeys() {
    const missingKeys = []
    
    for (const key of this.translationKeys) {
      if (!this.hasNestedKey(this.existingTranslations, key)) {
        missingKeys.push(key)
      }
    }

    return missingKeys.sort()
  }

  /**
   * בדיקה אם מפתח קיים (תומך ב-nested keys כמו "user.name")
   */
  hasNestedKey(obj, key) {
    const keys = key.split('.')
    let current = obj

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k]
      } else {
        return false
      }
    }

    return true
  }

  /**
   * הוספת מפתחות חסרים לאובייקט התרגומים
   */
  async addMissingKeys(missingKeys) {
    console.log(`➕ מוסיף ${missingKeys.length} מפתחות חסרים:\n`)

    for (const key of missingKeys) {
      this.setNestedKey(this.existingTranslations, key, CONFIG.defaultValue)
      this.newKeysAdded.push(key)
      console.log(`   + ${key}`)
    }
    
    console.log('')
  }

  /**
   * הגדרת ערך ל-nested key (תומך ב-keys כמו "user.name")
   */
  setNestedKey(obj, key, value) {
    const keys = key.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {}
      }
      current = current[k]
    }

    current[keys[keys.length - 1]] = value
  }

  /**
   * שמירת קובץ התרגומים המעודכן
   */
  async saveTranslations() {
    try {
      // יצירת תיקייה אם לא קיימת
      const dir = path.dirname(CONFIG.translationFile)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // מיון האובייקט לפי מפתחות (רקורסיבי)
      const sortedTranslations = this.sortObjectRecursively(this.existingTranslations)

      // שמירה עם פורמט נקי
      const content = JSON.stringify(sortedTranslations, null, 2) + '\n'
      fs.writeFileSync(CONFIG.translationFile, content, 'utf8')
      
      console.log(`💾 קובץ התרגומים נשמר: ${CONFIG.translationFile}\n`)
    } catch (error) {
      throw new Error(`שגיאה בשמירת קובץ התרגומים: ${error.message}`)
    }
  }

  /**
   * מיון אובייקט רקורסיבי לפי מפתחות
   */
  sortObjectRecursively(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    const sorted = {}
    const keys = Object.keys(obj).sort()

    for (const key of keys) {
      sorted[key] = this.sortObjectRecursively(obj[key])
    }

    return sorted
  }

  /**
   * יצירת פרומפט לתרגום
   */
  generateTranslationPrompt(missingKeys) {
    console.log('🤖 פרומפט לתרגום (העתק אותו ל-Cursor):\n')
    console.log('=' .repeat(80))
    console.log()

    const prompt = `אני צריך לתרגם את מפתחות התרגום הבאים לעברית בקובץ lib/translations/he.json.

המפתחות החסרים (${missingKeys.length} מפתחות):

${missingKeys.map((key, index) => `${index + 1}. "${key}"`).join('\n')}

אנא תחליף את הערך "חסר תרגום" בתרגום מתאים בעברית לכל מפתח.

דרישות לתרגום:
- תרגום טבעי ושוטף לעברית
- שמירה על קונטקסט של האפליקציה (אפליקציית הזמנות לטיפולים)
- שימוש במונחים עקביים עם שאר האתר
- תרגום קצר וברור
- שמירה על פורמט JSON תקין

תודה!`

    console.log(prompt)
    console.log()
    console.log('=' .repeat(80))
    console.log(`✅ הסקריפט הושלם! נוספו ${this.newKeysAdded.length} מפתחות חדשים.`)
  }
}

// הרצת הסקריפט
const updater = new TranslationUpdater()
updater.run().catch(console.error) 