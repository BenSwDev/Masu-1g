#!/usr/bin/env node

/**
 * Script to analyze remaining functions that need refactoring
 * Helps prioritize which files to refactor next
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing Remaining Refactoring Opportunities...\n');

// Function to count revalidatePath calls in a file
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Count actual revalidatePath calls (not in comments)
    const revalidateCallLines = lines.filter(line => 
      line.trim().startsWith('revalidatePath(') && 
      !line.trim().startsWith('//') && 
      !line.includes('// REMOVED') &&
      !line.includes('// REPLACED')
    );
    
    // Count notification-related imports/calls
    const notificationCalls = lines.filter(line =>
      (line.includes('notificationManager') || 
       line.includes('sendNotification') ||
       line.includes('unifiedNotificationService')) &&
      !line.trim().startsWith('//')
    );
    
    // Estimate function complexity
    const functionCount = (content.match(/export async function /g) || []).length;
    const totalLines = lines.length;
    
    return {
      filePath,
      revalidatePaths: revalidateCallLines.length,
      notifications: notificationCalls.length,
      functions: functionCount,
      totalLines,
      content: content
    };
  } catch (error) {
    return {
      filePath,
      error: error.message
    };
  }
}

// Analyze all action files
async function analyzeAllActions() {
  const actionsDir = path.join(__dirname, '../actions');
  const files = fs.readdirSync(actionsDir).filter(file => file.endsWith('.ts'));
  
  console.log('📊 ANALYZING ACTION FILES:');
  console.log('=' .repeat(80));
  
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(actionsDir, file);
    const analysis = analyzeFile(filePath);
    
    if (!analysis.error) {
      results.push(analysis);
      
      const priority = calculatePriority(analysis);
      console.log(`📁 ${file}`);
      console.log(`   📏 Lines: ${analysis.totalLines}`);
      console.log(`   🔄 revalidatePath calls: ${analysis.revalidatePaths}`);
      console.log(`   📧 Notification calls: ${analysis.notifications}`);
      console.log(`   ⚡ Functions: ${analysis.functions}`);
      console.log(`   🎯 Priority: ${priority}`);
      console.log('');
    }
  }
  
  // Sort by priority (highest first)
  results.sort((a, b) => calculatePriority(b) - calculatePriority(a));
  
  console.log('🏆 REFACTORING PRIORITY RANKING:');
  console.log('=' .repeat(80));
  
  results.slice(0, 10).forEach((result, index) => {
    const fileName = path.basename(result.filePath);
    const priority = calculatePriority(result);
    const status = getRefactoringStatus(result);
    
    console.log(`${index + 1}. ${fileName} - Priority: ${priority} ${status}`);
    console.log(`   📏 ${result.totalLines} lines, 🔄 ${result.revalidatePaths} revalidations, 📧 ${result.notifications} notifications`);
  });
  
  return results;
}

// Calculate refactoring priority score
function calculatePriority(analysis) {
  let score = 0;
  
  // High impact: revalidatePath calls
  score += analysis.revalidatePaths * 10;
  
  // Medium impact: notification calls  
  score += analysis.notifications * 5;
  
  // Low impact: file size and complexity
  score += Math.floor(analysis.totalLines / 100);
  score += analysis.functions * 2;
  
  return score;
}

// Determine refactoring status
function getRefactoringStatus(analysis) {
  const fileName = path.basename(analysis.filePath);
  
  if (fileName === 'booking-actions.ts') {
    return '✅ COMPLETED';
  }
  
  if (analysis.revalidatePaths === 0 && analysis.notifications === 0) {
    return '✅ CLEAN';
  }
  
  if (analysis.revalidatePaths > 10 || analysis.notifications > 5) {
    return '🔥 HIGH PRIORITY';
  }
  
  if (analysis.revalidatePaths > 5 || analysis.notifications > 2) {
    return '⚡ MEDIUM PRIORITY';
  }
  
  return '📝 LOW PRIORITY';
}

// Suggest next refactoring steps
function suggestNextSteps(results) {
  console.log('\n🎯 RECOMMENDED NEXT STEPS:');
  console.log('=' .repeat(80));
  
  const highPriority = results.filter(r => 
    calculatePriority(r) > 20 && 
    path.basename(r.filePath) !== 'booking-actions.ts'
  );
  
  if (highPriority.length > 0) {
    console.log('1. 🔥 HIGH PRIORITY FILES TO REFACTOR:');
    highPriority.slice(0, 3).forEach(result => {
      const fileName = path.basename(result.filePath);
      console.log(`   📁 ${fileName}`);
      console.log(`      🔄 ${result.revalidatePaths} revalidatePath calls to move to event system`);
      console.log(`      📧 ${result.notifications} notification calls to centralize`);
      
      // Suggest specific improvements
      if (result.revalidatePaths > 0) {
        console.log(`      💡 Create ${fileName.replace('-actions.ts', '')} events`);
      }
      if (result.notifications > 0) {
        console.log(`      💡 Move notifications to unified service`);
      }
    });
  }
  
  console.log('\n2. ✅ FILES ALREADY CLEAN:');
  const cleanFiles = results.filter(r => 
    r.revalidatePaths === 0 && r.notifications === 0
  );
  cleanFiles.forEach(result => {
    const fileName = path.basename(result.filePath);
    console.log(`   ✅ ${fileName}`);
  });
  
  console.log('\n3. 🎯 OVERALL PROGRESS:');
  const totalFiles = results.length;
  const cleanFilesCount = cleanFiles.length;
  const progress = Math.round((cleanFilesCount / totalFiles) * 100);
  
  console.log(`   📊 ${cleanFilesCount}/${totalFiles} files are clean (${progress}%)`);
  console.log(`   🔄 Total revalidatePath calls remaining: ${results.reduce((sum, r) => sum + r.revalidatePaths, 0)}`);
  console.log(`   📧 Total notification calls remaining: ${results.reduce((sum, r) => sum + r.notifications, 0)}`);
}

// Main analysis
async function runAnalysis() {
  console.log('🚀 Starting Action Files Analysis\n');
  
  const results = await analyzeAllActions();
  suggestNextSteps(results);
  
  console.log('\n🏁 Analysis Complete!');
  console.log('\n💡 TIP: Focus on high priority files first for maximum impact!');
}

// Run if called directly
if (require.main === module) {
  runAnalysis();
}

module.exports = { analyzeAllActions, calculatePriority }; 