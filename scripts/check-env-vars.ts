#!/usr/bin/env tsx

import { config } from 'dotenv'

// Load environment files
config({ path: '.env.local' })
config({ path: '.env' })

console.log('🔍 Environment Variables Check')
console.log('==============================')
console.log('')

console.log('📊 Current Values:')
console.log(`CARDCOM_TERMINAL: ${process.env.CARDCOM_TERMINAL || 'NOT SET'}`)
console.log(`CARDCOM_API_TOKEN: ${process.env.CARDCOM_API_TOKEN ? process.env.CARDCOM_API_TOKEN.substring(0, 10) + '...' : 'NOT SET'}`)
console.log(`CARDCOM_BASE_URL: ${process.env.CARDCOM_BASE_URL || 'NOT SET'}`)
console.log(`CARDCOM_TEST_MODE: ${process.env.CARDCOM_TEST_MODE || 'NOT SET'}`)
console.log('')

console.log('🎯 Target Values:')
console.log('CARDCOM_TERMINAL: 125566')
console.log('CARDCOM_API_TOKEN: Q3ZqTMTZGrSIKjktQrfNC')
console.log('CARDCOM_BASE_URL: https://secure.cardcom.solutions/api/v11')
console.log('CARDCOM_TEST_MODE: true')
console.log('')

// Manual override for testing
process.env.CARDCOM_TERMINAL = '125566'
process.env.CARDCOM_API_TOKEN = 'Q3ZqTMTZGrSIKjktQrfNC'
process.env.CARDCOM_BASE_URL = 'https://secure.cardcom.solutions/api/v11'
process.env.CARDCOM_TEST_MODE = 'true'

console.log('✅ Variables overridden for this session')
console.log('')

// Test the service
import { cardcomService } from '../lib/services/cardcom-service'

console.log('🧪 Testing Service with Override:')
const status = cardcomService.getStatus()
console.log(`Terminal: ${status.terminal}`)
console.log(`Test Mode: ${status.testMode}`)
console.log(`Base URL: ${status.baseUrl}`)
console.log(`Configured: ${status.configured}`)
console.log('')

if (status.testMode) {
  console.log('🎉 SUCCESS: Service is now in TEST mode!')
} else {
  console.log('⚠️  Service is still in PRODUCTION mode')
  console.log('💡 To fix: Create .env.local file with CARDCOM_TEST_MODE=true')
} 