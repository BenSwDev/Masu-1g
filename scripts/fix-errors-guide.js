#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎯 מדריך תיקון שגיאות TypeScript\n');

// Read the error report
const reportPath = path.join(__dirname, '../ERROR_ANALYSIS_REPORT.md');
if (!fs.existsSync(reportPath)) {
  console.error('❌ לא נמצא דוח שגיאות. הרץ קודם את error-analysis.js');
  process.exit(1);
}

const report = fs.readFileSync(reportPath, 'utf8');

// Parse the report to extract specific errors
function parseReport(reportContent) {
  const sections = reportContent.split('## 🔧 ');
  const errors = {};
  
  for (const section of sections) {
    if (section.includes('שגיאות)')) {
      const categoryMatch = section.match(/([^(]+) \((\d+) שגיאות\)/);
      if (categoryMatch) {
        const category = categoryMatch[1].trim();
        const errorCount = parseInt(categoryMatch[2]);
        
        // Extract file-specific errors
        const fileSections = section.split('### 📁 ');
        const fileErrors = {};
        
        for (const fileSection of fileSections.slice(1)) {
          const lines = fileSection.split('\n');
          const fileName = lines[0].trim();
          const fileErrorList = [];
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('**שורה') && line.includes(':**')) {
              const errorMatch = line.match(/\*\*שורה (\d+):(\d+)\*\* - (.+)/);
              if (errorMatch) {
                fileErrorList.push({
                  line: parseInt(errorMatch[1]),
                  column: parseInt(errorMatch[2]),
                  message: errorMatch[3].trim()
                });
              }
            }
          }
          
          if (fileErrorList.length > 0) {
            fileErrors[fileName] = fileErrorList;
          }
        }
        
        errors[category] = {
          count: errorCount,
          files: fileErrors
        };
      }
    }
  }
  
  return errors;
}

// Generate specific fix guidance
function generateFixGuidance(errors) {
  let guidance = '# 🛠️ מדריך תיקון שגיאות מפורט\n\n';
  
  guidance += '## 📋 סיכום מהיר\n';
  for (const [category, data] of Object.entries(errors)) {
    guidance += `- **${category}:** ${data.count} שגיאות\n`;
  }
  guidance += '\n';
  
  // Type Mismatches
  if (errors['Type Mismatches']) {
    guidance += '## 🔧 Type Mismatches - תיקון\n\n';
    guidance += '### 🎯 בעיות נפוצות:\n';
    guidance += '1. **string | undefined** - השתמש ב-optional chaining או בדיקת null\n';
    guidance += '2. **ObjectId | null** - השתמש ב-`new mongoose.Types.ObjectId()` או בדיקת null\n';
    guidance += '3. **Array type mismatches** - וודא שהמערך מכיל את הטיפוס הנכון\n\n';
    
    guidance += '### 📝 דוגמאות תיקון:\n';
    guidance += '```typescript\n';
    guidance += '// לפני:\n';
    guidance += 'const userId = user.id; // string | undefined\n';
    guidance += 'await User.findById(userId); // שגיאה\n\n';
    guidance += '// אחרי:\n';
    guidance += 'const userId = user.id;\n';
    guidance += 'if (userId) {\n';
    guidance += '  await User.findById(userId);\n';
    guidance += '}\n';
    guidance += '```\n\n';
  }
  
  // Schema/Model Issues
  if (errors['Schema/Model Issues']) {
    guidance += '## 🏗️ Schema/Model Issues - תיקון\n\n';
    guidance += '### 🎯 בעיות נפוצות:\n';
    guidance += '1. **Property does not exist** - הוסף את ה-property למודל\n';
    guidance += '2. **Missing required fields** - וודא שכל השדות הנדרשים קיימים\n';
    guidance += '3. **Interface mismatch** - עדכן את ה-interface או את השימוש\n\n';
    
    guidance += '### 📝 דוגמאות תיקון:\n';
    guidance += '```typescript\n';
    guidance += '// לפני:\n';
    guidance += 'interface IUser {\n';
    guidance += '  name: string;\n';
    guidance += '  email: string;\n';
    guidance += '}\n\n';
    guidance += '// אחרי:\n';
    guidance += 'interface IUser {\n';
    guidance += '  name: string;\n';
    guidance += '  email: string;\n';
    guidance += '  phone?: string; // הוספת שדה חסר\n';
    guidance += '}\n';
    guidance += '```\n\n';
  }
  
  // Undefined/Null Issues
  if (errors['Undefined/Null Issues']) {
    guidance += '## ⚠️ Undefined/Null Issues - תיקון\n\n';
    guidance += '### 🎯 בעיות נפוצות:\n';
    guidance += '1. **Property is possibly undefined** - השתמש ב-optional chaining\n';
    guidance += '2. **Variable is possibly null** - הוסף בדיקת null\n\n';
    
    guidance += '### 📝 דוגמאות תיקון:\n';
    guidance += '```typescript\n';
    guidance += '// לפני:\n';
    guidance += 'const name = user.name; // user.name is possibly undefined\n';
    guidance += 'console.log(name.length); // שגיאה\n\n';
    guidance += '// אחרי:\n';
    guidance += 'const name = user.name;\n';
    guidance += 'if (name) {\n';
    guidance += '  console.log(name.length);\n';
    guidance += '}\n';
    guidance += '// או:\n';
    guidance += 'console.log(user.name?.length);\n';
    guidance += '```\n\n';
  }
  
  // ObjectId/Unknown Issues
  if (errors['ObjectId/Unknown Issues']) {
    guidance += '## 🆔 ObjectId/Unknown Issues - תיקון\n\n';
    guidance += '### 🎯 בעיות נפוצות:\n';
    guidance += '1. **Type is unknown** - הוסף type assertion או בדיקת טיפוס\n';
    guidance += '2. **ObjectId conversion** - השתמש ב-`new mongoose.Types.ObjectId()`\n\n';
    
    guidance += '### 📝 דוגמאות תיקון:\n';
    guidance += '```typescript\n';
    guidance += '// לפני:\n';
    guidance += 'const id = doc._id; // unknown type\n';
    guidance += 'await Model.findById(id); // שגיאה\n\n';
    guidance += '// אחרי:\n';
    guidance += 'const id = doc._id?.toString();\n';
    guidance += 'if (id) {\n';
    guidance += '  await Model.findById(id);\n';
    guidance += '}\n';
    guidance += '```\n\n';
  }
  
  // Translation Issues
  if (errors['Translation Issues']) {
    guidance += '## 🌐 Translation Issues - תיקון\n\n';
    guidance += '### 🎯 בעיות נפוצות:\n';
    guidance += '1. **Function expects 1 parameter but receiving 2** - הסר את הפרמטר השני\n';
    guidance += '2. **Translation key not found** - וודא שהמפתח קיים בקובץ התרגום\n\n';
    
    guidance += '### 📝 דוגמאות תיקון:\n';
    guidance += '```typescript\n';
    guidance += '// לפני:\n';
    guidance += 't("key", "fallback"); // שגיאה - יותר מדי פרמטרים\n\n';
    guidance += '// אחרי:\n';
    guidance += 't("key"); // נכון\n';
    guidance += '// או:\n';
    guidance += 't("key") || "fallback";\n';
    guidance += '```\n\n';
  }
  
  // Specific file guidance
  guidance += '## 📁 הנחיות לפי קבצים\n\n';
  
  for (const [category, data] of Object.entries(errors)) {
    if (data.count > 0) {
      guidance += `### ${category}\n\n`;
      
      for (const [fileName, fileErrors] of Object.entries(data.files)) {
        guidance += `#### ${fileName}\n`;
        guidance += `**${fileErrors.length} שגיאות**\n\n`;
        
        for (const error of fileErrors.slice(0, 5)) { // Show first 5 errors per file
          guidance += `- **שורה ${error.line}:** ${error.message}\n`;
        }
        
        if (fileErrors.length > 5) {
          guidance += `- ... ועוד ${fileErrors.length - 5} שגיאות\n`;
        }
        guidance += '\n';
      }
    }
  }
  
  // Action plan
  guidance += '## 🎯 תוכנית פעולה מומלצת\n\n';
  guidance += '### 1️⃣ שלב ראשון - שגיאות קריטיות (עדיפות גבוהה)\n';
  guidance += '1. **Schema/Model Issues** - תיקון מודלים שלא תואמים\n';
  guidance += '2. **Type Mismatches** - יישור טיפוסים בסיסיים\n';
  guidance += '3. **ObjectId/Unknown Issues** - תיקון בעיות MongoDB\n\n';
  
  guidance += '### 2️⃣ שלב שני - שגיאות פונקציונליות (עדיפות בינונית)\n';
  guidance += '1. **Undefined/Null Issues** - הוספת בדיקות null/undefined\n';
  guidance += '2. **Property Missing** - הוספת properties חסרות\n';
  guidance += '3. **Interface Issues** - תיקון הרחבות interface\n\n';
  
  guidance += '### 3️⃣ שלב שלישי - שגיאות UI (עדיפות נמוכה)\n';
  guidance += '1. **Translation Issues** - תיקון קריאות translation\n';
  guidance += '2. **Other** - שגיאות נוספות\n\n';
  
  guidance += '## 💡 טיפים כלליים\n\n';
  guidance += '1. **תמיד בדוק את המודל המקורי** לפני שינוי טיפוסים\n';
  guidance += '2. **השתמש ב-optional chaining (?.)** עבור properties שעלולות להיות undefined\n';
  guidance += '3. **וודא ייבוא נכון** של כל הטיפוסים והמודלים\n';
  guidance += '4. **בדוק עקביות** בין קבצים שונים שמשתמשים באותם טיפוסים\n';
  guidance += '5. **השתמש ב-TypeScript strict mode** כדי למנוע שגיאות עתידיות\n';
  guidance += '6. **תקן שגיאה אחת בכל פעם** ובדוק שהקוד עדיין עובד\n';
  guidance += '7. **השתמש ב-IDE** עם TypeScript support טוב לזיהוי שגיאות בזמן אמת\n\n';
  
  return guidance;
}

// Main execution
try {
  console.log('📖 מנתח דוח שגיאות...');
  const parsedErrors = parseReport(report);
  
  console.log('📝 יוצר מדריך תיקון...');
  const guidance = generateFixGuidance(parsedErrors);
  
  // Save guidance
  const guidancePath = path.join(__dirname, '../ERROR_FIX_GUIDE.md');
  fs.writeFileSync(guidancePath, guidance, 'utf8');
  
  console.log(`✅ המדריך נוצר בהצלחה: ${guidancePath}`);
  
  // Print summary
  console.log('\n📊 סיכום שגיאות לפי קטגוריות:');
  for (const [category, data] of Object.entries(parsedErrors)) {
    console.log(`  ${category}: ${data.count} שגיאות`);
  }
  
  console.log('\n🎯 המלצות:');
  console.log('1. התחל עם Schema/Model Issues (הכי קריטי)');
  console.log('2. המשך עם Type Mismatches');
  console.log('3. תקן ObjectId/Unknown Issues');
  console.log('4. סיים עם Undefined/Null Issues');
  
} catch (error) {
  console.error('❌ שגיאה ביצירת המדריך:', error.message);
  process.exit(1);
} 