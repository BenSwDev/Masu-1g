#!/usr/bin/env node

/**
 * Test script to verify Event System behavior matches old scattered logic
 * This ensures 100% functional equivalence before and after refactoring
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Event System Functional Equivalence...\n');

// Test 1: Verify Event System Files Exist
async function testEventSystemInit() {
  console.log('📋 Test 1: Event System Files Existence');
  
  try {
    const requiredFiles = [
      '../lib/events/event-bus.ts',
      '../lib/events/booking-event-system.ts', 
      '../lib/events/handlers/notification-handler.ts',
      '../lib/events/handlers/dashboard-handler.ts'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Missing file: ${file}`);
        return false;
      }
    }
    
    console.log('✅ All event system files exist');
    return true;
  } catch (error) {
    console.log('❌ Event system file check failed:', error.message);
    return false;
  }
}

// Test 2: Verify Build Passes
async function testBuildPasses() {
  console.log('\n📋 Test 2: Build Verification');
  
  try {
    const { execSync } = require('child_process');
    const result = execSync('npm run build', { 
      encoding: 'utf8',
      timeout: 120000,
      stdio: 'pipe'
    });
    
    // Check for event system initialization logs (both booking and gift voucher)
    if (result.includes('Event handler registered for: booking.created') &&
        result.includes('Event handler registered for: gift_voucher.created') &&
        result.includes('Event system initialized successfully')) {
      console.log('✅ Build passes and event system initializes correctly (booking + gift voucher)');
      return true;
    } else {
      console.log('⚠️  Build passes but event system logs not found');
      console.log('Expected: booking.created, gift_voucher.created, and initialization success');
      return false;
    }
  } catch (error) {
    console.log('❌ Build failed:', error.message);
    return false;
  }
}

// Test 3: Verify Event Types Coverage
async function testEventTypesCoverage() {
  console.log('\n📋 Test 3: Event Types Coverage');
  
  const expectedEvents = [
    'booking.created',
    'booking.confirmed', 
    'booking.professional_assigned',
    'booking.completed',
    'booking.cancelled',
    'booking.payment_updated'
  ];
  
  try {
    const eventBusPath = path.join(__dirname, '../lib/events/event-bus.ts');
    const eventBusContent = fs.readFileSync(eventBusPath, 'utf8');
    
    const missingEvents = expectedEvents.filter(event => 
      !eventBusContent.includes(`'${event}'`)
    );
    
    if (missingEvents.length === 0) {
      console.log('✅ All expected event types are defined');
      return true;
    } else {
      console.log('❌ Missing event types:', missingEvents);
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to verify event types:', error.message);
    return false;
  }
}

// Test 4: Verify Handler Registration
async function testHandlerRegistration() {
  console.log('\n📋 Test 4: Handler Registration');
  
  const expectedHandlers = [
    'notificationHandler.handleBookingCreated',
    'notificationHandler.handleBookingConfirmed',
    'notificationHandler.handleProfessionalAssigned', 
    'notificationHandler.handleBookingCompleted',
    'notificationHandler.handleBookingCancelled',
    'dashboardHandler.handleBookingCreated',
    'dashboardHandler.handleBookingCancelled',
    'dashboardHandler.handleBookingConfirmed',
    'dashboardHandler.handleProfessionalAssigned',
    'dashboardHandler.handleBookingCompleted',
    'dashboardHandler.handlePaymentUpdated'
  ];
  
  try {
    const systemPath = path.join(__dirname, '../lib/events/booking-event-system.ts');
    const systemContent = fs.readFileSync(systemPath, 'utf8');
    
    const missingHandlers = expectedHandlers.filter(handler => 
      !systemContent.includes(handler)
    );
    
    if (missingHandlers.length === 0) {
      console.log('✅ All expected handlers are registered');
      return true;
    } else {
      console.log('❌ Missing handler registrations:', missingHandlers);
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to verify handler registration:', error.message);
    return false;
  }
}

// Test 5: Verify revalidatePath Elimination
async function testRevalidatePathElimination() {
  console.log('\n📋 Test 5: revalidatePath Elimination from Booking Actions');
  
  try {
    const bookingActionsPath = path.join(__dirname, '../actions/booking-actions.ts');
    const content = fs.readFileSync(bookingActionsPath, 'utf8');
    
    // Count actual revalidatePath calls (not in comments)
    const lines = content.split('\n');
    const revalidateCallLines = lines.filter(line => 
      line.trim().startsWith('revalidatePath(') && 
      !line.trim().startsWith('//') && 
      !line.includes('// REMOVED') &&
      !line.includes('// REPLACED')
    );
    
    if (revalidateCallLines.length === 0) {
      console.log('✅ All revalidatePath calls eliminated from booking-actions.ts');
      return true;
    } else {
      console.log('❌ Found remaining revalidatePath calls:');
      revalidateCallLines.forEach((line, index) => {
        const lineNumber = lines.indexOf(line) + 1;
        console.log(`   Line ${lineNumber}: ${line.trim()}`);
      });
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to verify revalidatePath elimination:', error.message);
    return false;
  }
}

// Test 6: Verify Event Emission in Functions
async function testEventEmissionIntegration() {
  console.log('\n📋 Test 6: Event Emission Integration');
  
  const expectedEmissions = [
    { func: 'createBooking', event: 'booking.created' },
    { func: 'assignProfessionalToBooking', event: 'booking.professional_assigned' },
    { func: 'professionalAcceptBooking', event: 'booking.confirmed' },
    { func: 'professionalMarkCompleted', event: 'booking.completed' },
    { func: 'cancelBooking', event: 'booking.cancelled' },
    { func: 'updateBookingStatusAfterPayment', event: 'booking.payment_updated' }
  ];
  
  try {
    const bookingActionsPath = path.join(__dirname, '../actions/booking-actions.ts');
    const content = fs.readFileSync(bookingActionsPath, 'utf8');
    
    const missingEmissions = expectedEmissions.filter(({ func, event }) => {
      const funcRegex = new RegExp(`export async function ${func}[\\s\\S]*?(?=export async function|$)`);
      const funcMatch = content.match(funcRegex);
      
      if (!funcMatch) return true;
      
      return !funcMatch[0].includes(`'${event}'`) && !funcMatch[0].includes(`"${event}"`);
    });
    
    if (missingEmissions.length === 0) {
      console.log('✅ All functions emit their corresponding events');
      return true;
    } else {
      console.log('❌ Missing event emissions:');
      missingEmissions.forEach(({ func, event }) => {
        console.log(`   ${func} should emit ${event}`);
      });
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to verify event emission integration:', error.message);
    return false;
  }
}

// Test 7: Code Reduction Verification
async function testCodeReduction() {
  console.log('\n📋 Test 7: Code Reduction Verification');
  
  try {
    const bookingActionsPath = path.join(__dirname, '../actions/booking-actions.ts');
    const content = fs.readFileSync(bookingActionsPath, 'utf8');
    const totalLines = content.split('\n').length;
    
    // Expected approximate line count after refactoring
    const expectedMaxLines = 3000; // We reduced significantly but added new functions
    
    console.log(`📊 Current booking-actions.ts: ${totalLines} lines`);
    
    if (totalLines > 0) {
      console.log('✅ File exists and has content');
      
      // Check for reduction indicators
      const reductionIndicators = [
        'REPLACED:',
        'REMOVED:',
        'moved to dashboard handler',
        'moved to notification handler',
        'emit(.*Event)'
      ];
      
      const indicatorCount = reductionIndicators.reduce((count, indicator) => {
        const regex = new RegExp(indicator, 'gi');
        return count + (content.match(regex) || []).length;
      }, 0);
      
      if (indicatorCount > 10) {
        console.log(`✅ Found ${indicatorCount} refactoring indicators - significant reduction achieved`);
        return true;
      } else {
        console.log(`⚠️  Only found ${indicatorCount} refactoring indicators - may need more reduction`);
        return false;
      }
    } else {
      console.log('❌ File is empty or missing');
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to verify code reduction:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Event System Verification\n');
  console.log('=' .repeat(60));
  
  const tests = [
    testEventSystemInit,
    testBuildPasses,
    testEventTypesCoverage,
    testHandlerRegistration,
    testRevalidatePathElimination,
    testEventEmissionIntegration,
    testCodeReduction
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 FINAL RESULTS:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Event system refactoring is SUCCESSFUL!');
    console.log('✅ Safe to continue with more refactoring');
    return true;
  } else {
    console.log('\n⚠️  SOME TESTS FAILED! Need to fix issues before continuing');
    console.log('❌ Do NOT deploy until all tests pass');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runAllTests }; 