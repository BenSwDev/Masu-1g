#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 מתחיל ניתוח שגיאות TypeScript...\n');

// Function to run type check and capture output
function runTypeCheck() {
  try {
    const output = execSync('npm run type-check 2>&1', { encoding: 'utf8' });
    return output;
  } catch (error) {
    return error.stdout || error.stderr || '';
  }
}

// Function to parse errors by category
function categorizeErrors(errorOutput) {
  const lines = errorOutput.split('\n');
  const errors = [];
  
  for (const line of lines) {
    // Improved regex to catch more error patterns
    const patterns = [
      /(.+\.tsx?)\((\d+),(\d+)\): error TS(\d+): (.+)/,
      /(.+\.tsx?)\((\d+),(\d+)\): (.+)/,
      /error TS(\d+): (.+)/,
      /(.+\.tsx?)\((\d+)\): (.+)/
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        if (match.length >= 5) {
          // Full pattern with file, line, column, code, message
          const [, file, line, column, code, message] = match;
          errors.push({
            file: file.trim(),
            line: parseInt(line),
            column: parseInt(column),
            code: parseInt(code),
            message: message.trim(),
            fullLine: line.trim()
          });
        } else if (match.length >= 3) {
          // Pattern with just error code and message
          const [, code, message] = match;
          errors.push({
            file: 'unknown',
            line: 0,
            column: 0,
            code: parseInt(code),
            message: message.trim(),
            fullLine: line.trim()
          });
        }
        break;
      }
    }
  }
  
  return errors;
}

// Function to categorize errors by type
function categorizeByType(errors) {
  const categories = {
    'Type Mismatches': [],
    'Schema/Model Issues': [],
    'Undefined/Null Issues': [],
    'Translation Issues': [],
    'ObjectId/Unknown Issues': [],
    'Property Missing': [],
    'Interface Issues': [],
    'Other': []
  };
  
  for (const error of errors) {
    const message = error.message.toLowerCase();
    
    if (message.includes('type') && (message.includes('not assignable') || message.includes('incompatible'))) {
      categories['Type Mismatches'].push(error);
    } else if (message.includes('property') && message.includes('does not exist')) {
      categories['Schema/Model Issues'].push(error);
    } else if (message.includes('possibly') && (message.includes('undefined') || message.includes('null'))) {
      categories['Undefined/Null Issues'].push(error);
    } else if (message.includes('t(') || message.includes('translation')) {
      categories['Translation Issues'].push(error);
    } else if (message.includes('objectid') || message.includes('unknown')) {
      categories['ObjectId/Unknown Issues'].push(error);
    } else if (message.includes('property') && message.includes('missing')) {
      categories['Property Missing'].push(error);
    } else if (message.includes('interface') || message.includes('extends')) {
      categories['Interface Issues'].push(error);
    } else {
      categories['Other'].push(error);
    }
  }
  
  return categories;
}

// Function to generate detailed report
function generateReport(categories) {
  let report = '# 📊 דוח שגיאות TypeScript - ניתוח מפורט\n\n';
  
  // Summary
  const totalErrors = Object.values(categories).reduce((sum, arr) => sum + arr.length, 0);
  report += `## 📈 סיכום כללי\n`;
  report += `- **סה"כ שגיאות:** ${totalErrors}\n`;
  report += `- **קטגוריות:** ${Object.keys(categories).length}\n\n`;
  
  // Category breakdown
  report += `### 📋 פירוט לפי קטגוריות:\n`;
  for (const [category, errors] of Object.entries(categories)) {
    if (errors.length > 0) {
      report += `- **${category}:** ${errors.length} שגיאות\n`;
    }
  }
  report += '\n';
  
  // Detailed analysis
  for (const [category, errors] of Object.entries(categories)) {
    if (errors.length === 0) continue;
    
    report += `## 🔧 ${category} (${errors.length} שגיאות)\n\n`;
    
    // Group by file
    const byFile = {};
    for (const error of errors) {
      if (!byFile[error.file]) byFile[error.file] = [];
      byFile[error.file].push(error);
    }
    
    for (const [file, fileErrors] of Object.entries(byFile)) {
      report += `### 📁 ${file}\n\n`;
      
      for (const error of fileErrors) {
        report += `**שורה ${error.line}:${error.column}** - ${error.message}\n`;
        report += `\`\`\`typescript\n// קובץ: ${error.file}\n// שורה: ${error.line}\n// שגיאה: ${error.message}\n\`\`\`\n\n`;
      }
    }
  }
  
  return report;
}

// Function to analyze models and types
function analyzeModelsAndTypes() {
  const modelsDir = path.join(__dirname, '../lib/db/models');
  const typesDir = path.join(__dirname, '../types');
  
  let analysis = '\n## 🏗️ ניתוח מודלים וטיפוסים\n\n';
  
  // Analyze models
  if (fs.existsSync(modelsDir)) {
    analysis += '### 📦 מודלים (lib/db/models/):\n\n';
    const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));
    
    for (const file of modelFiles) {
      const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
      const interfaces = content.match(/export interface (\w+)/g) || [];
      const types = content.match(/export type (\w+)/g) || [];
      
      analysis += `#### ${file}\n`;
      if (interfaces.length > 0) {
        analysis += `**Interfaces:** ${interfaces.map(i => i.replace('export interface ', '')).join(', ')}\n`;
      }
      if (types.length > 0) {
        analysis += `**Types:** ${types.map(t => t.replace('export type ', '')).join(', ')}\n`;
      }
      analysis += '\n';
    }
  }
  
  // Analyze types
  if (fs.existsSync(typesDir)) {
    analysis += '### 🎯 טיפוסים (types/):\n\n';
    const typeFiles = fs.readdirSync(typesDir).filter(f => f.endsWith('.d.ts'));
    
    for (const file of typeFiles) {
      const content = fs.readFileSync(path.join(typesDir, file), 'utf8');
      const interfaces = content.match(/export interface (\w+)/g) || [];
      const types = content.match(/export type (\w+)/g) || [];
      
      analysis += `#### ${file}\n`;
      if (interfaces.length > 0) {
        analysis += `**Interfaces:** ${interfaces.map(i => i.replace('export interface ', '')).join(', ')}\n`;
      }
      if (types.length > 0) {
        analysis += `**Types:** ${types.map(t => t.replace('export type ', '')).join(', ')}\n`;
      }
      analysis += '\n';
    }
  }
  
  return analysis;
}

// Function to generate action plan
function generateActionPlan(categories) {
  let plan = '\n## 🎯 תוכנית פעולה מומלצת\n\n';
  
  plan += '### 1️⃣ תיקון שגיאות קריטיות (עדיפות גבוהה)\n';
  plan += '- **Schema/Model Issues:** תיקון מודלים שלא תואמים לשימוש\n';
  plan += '- **Type Mismatches:** יישור טיפוסים בין קבצים שונים\n';
  plan += '- **ObjectId/Unknown Issues:** תיקון בעיות עם MongoDB ObjectId\n\n';
  
  plan += '### 2️⃣ תיקון שגיאות פונקציונליות (עדיפות בינונית)\n';
  plan += '- **Undefined/Null Issues:** הוספת בדיקות null/undefined\n';
  plan += '- **Property Missing:** הוספת properties חסרות למודלים\n';
  plan += '- **Interface Issues:** תיקון הרחבות interface\n\n';
  
  plan += '### 3️⃣ תיקון שגיאות UI (עדיפות נמוכה)\n';
  plan += '- **Translation Issues:** תיקון קריאות פונקציות translation\n';
  plan += '- **Other:** שגיאות נוספות\n\n';
  
  plan += '### 📝 הנחיות כלליות:\n';
  plan += '1. **תמיד בדוק את המודל המקורי** לפני שינוי טיפוסים\n';
  plan += '2. **השתמש ב-optional chaining (?.)** עבור properties שעלולות להיות undefined\n';
  plan += '3. **וודא ייבוא נכון** של כל הטיפוסים והמודלים\n';
  plan += '4. **בדוק עקביות** בין קבצים שונים שמשתמשים באותם טיפוסים\n';
  plan += '5. **השתמש ב-TypeScript strict mode** כדי למנוע שגיאות עתידיות\n\n';
  
  return plan;
}

// Main execution
try {
  console.log('🔄 מריץ בדיקת טיפוסים...');
  const typeCheckOutput = runTypeCheck();
  
  console.log('📊 מנתח שגיאות...');
  const errors = categorizeErrors(typeCheckOutput);
  const categories = categorizeByType(errors);
  
  console.log('📝 יוצר דוח...');
  let fullReport = generateReport(categories);
  fullReport += analyzeModelsAndTypes();
  fullReport += generateActionPlan(categories);
  
  // Save report
  const reportPath = path.join(__dirname, '../ERROR_ANALYSIS_REPORT.md');
  fs.writeFileSync(reportPath, fullReport, 'utf8');
  
  console.log(`✅ הדוח נוצר בהצלחה: ${reportPath}`);
  console.log(`📊 סה"כ שגיאות שנמצאו: ${errors.length}`);
  
  // Print summary to console
  console.log('\n📋 סיכום מהיר:');
  for (const [category, categoryErrors] of Object.entries(categories)) {
    if (categoryErrors.length > 0) {
      console.log(`  ${category}: ${categoryErrors.length} שגיאות`);
    }
  }
  
} catch (error) {
  console.error('❌ שגיאה בניתוח:', error.message);
  process.exit(1);
} 