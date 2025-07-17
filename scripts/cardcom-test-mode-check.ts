#!/usr/bin/env tsx

/**
 * CARDCOM Test Mode Configuration Checker
 * 
 * This script helps you understand and configure CARDCOM test mode correctly
 */

import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

interface TestModeConfig {
  envValue: string | undefined
  testMode: boolean
  expected: 'TEST' | 'PRODUCTION'
  isCorrect: boolean
}

function checkTestModeConfig(): TestModeConfig {
  const envValue = process.env.CARDCOM_TEST_MODE
  const testMode = envValue === "true"
  
  // User's intended mode based on CARDCOM_TEST_MODE setting
  // If not set, default to TEST for safety
  const expected: 'TEST' | 'PRODUCTION' = envValue === "false" ? 'PRODUCTION' : 'TEST'
  
  const isCorrect = (expected === 'TEST' && testMode) || (expected === 'PRODUCTION' && !testMode)
  
  return {
    envValue,
    testMode,
    expected,
    isCorrect
  }
}

function printConfig() {
  console.log('🏦 CARDCOM Test Mode Configuration Checker')
  console.log('=' .repeat(50))
  
  const config = checkTestModeConfig()
  
  // Current configuration
  console.log('\n📋 Current Configuration:')
  console.log(`Environment Variable: CARDCOM_TEST_MODE = "${config.envValue}"`)
  console.log(`Calculated Test Mode: ${config.testMode ? 'TRUE' : 'FALSE'}`)
  console.log(`Expected Mode: ${config.expected}`)
  console.log(`Configuration Status: ${config.isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`)
  
  // Environment context
  console.log('\n🌍 Environment Context:')
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`)
  console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV || 'undefined'}`)
  console.log(`NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'undefined'}`)
  console.log(`CARDCOM_TERMINAL: ${process.env.CARDCOM_TERMINAL || 'undefined'}`)
  
  // CARDCOM credentials check
  console.log('\n🔑 CARDCOM Credentials:')
  const hasTerminal = !!process.env.CARDCOM_TERMINAL
  const hasApiToken = !!process.env.CARDCOM_API_TOKEN
  const hasBaseUrl = !!process.env.CARDCOM_BASE_URL
  
  console.log(`Terminal: ${hasTerminal ? '✅ SET' : '❌ MISSING'}`)
  console.log(`API Token: ${hasApiToken ? '✅ SET' : '❌ MISSING'}`)
  console.log(`Base URL: ${hasBaseUrl ? '✅ SET' : '❌ MISSING'}`)
  
  // Recommendations
  console.log('\n💡 Recommendations:')
  
  if (!config.isCorrect) {
    if (config.expected === 'TEST') {
      console.log('❌ For TEST mode, set: CARDCOM_TEST_MODE=true')
      console.log('   This will enable safe testing without real charges')
    } else {
      console.log('❌ For PRODUCTION mode, set: CARDCOM_TEST_MODE=false')
      console.log('   This will enable real payment processing')
    }
  } else {
    console.log(`✅ Configuration is correct for ${config.expected} mode`)
  }
  
  if (!hasTerminal || !hasApiToken) {
    console.log('❌ Missing CARDCOM credentials - payments will fail')
    console.log('   Contact CARDCOM support to get your Terminal and API Token')
  }
  
  // Test mode explanation
  console.log('\n📚 Test Mode Explanation:')
  console.log('TEST MODE (CARDCOM_TEST_MODE=true):')
  console.log('  ✅ Safe testing environment')
  console.log('  ✅ No real money charges')
  console.log('  ✅ Test credit card numbers work')
  console.log('  ✅ All features work normally')
  console.log('  ⚠️  Transactions are simulated')
  
  console.log('\nPRODUCTION MODE (CARDCOM_TEST_MODE=false):')
  console.log('  💰 Real money transactions')
  console.log('  ✅ Live payment processing')
  console.log('  ✅ Real customer charges')
  console.log('  ⚠️  Use with caution!')
  
  // Test card numbers
  console.log('\n💳 Test Card Numbers (TEST MODE only):')
  console.log('Visa: 4111111111111111')
  console.log('MasterCard: 5555555555554444')
  console.log('Amex: 378282246310005')
  console.log('Expiry: Any future date (e.g., 12/25)')
  console.log('CVV: Any 3 digits (e.g., 123)')
  
  console.log('\n' + '=' .repeat(50))
  
  if (config.isCorrect) {
    console.log('🎉 Your CARDCOM configuration is ready!')
    process.exit(0)
  } else {
    console.log('🚨 Please fix your CARDCOM configuration before proceeding')
    process.exit(1)
  }
}

// Run the checker
printConfig() 