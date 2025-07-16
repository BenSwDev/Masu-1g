#!/usr/bin/env tsx

import { config } from 'dotenv'
import { cardcomService } from '../lib/services/cardcom-service'

// Load environment variables explicitly for scripts  
config({ path: '.env.local' })
config({ path: '.env' })

/**
 * בודק endpoints ספציפיים של CARDCOM
 */
class CardcomEndpointTester {
  
  async testLowProfileCreate(): Promise<void> {
    console.log('🧪 Testing LowProfile/Create endpoint...')
    
    const testPayment = {
      amount: 10.50,
      description: 'Test LowProfile Payment',
      paymentId: `test_lp_${Date.now()}`,
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '+972501234567',
      createDocument: true,
      documentType: 'Order' as const
    }

    const result = await cardcomService.createLowProfilePayment(testPayment)
    
    console.log('📊 LowProfile/Create Result:')
    console.log('   Success:', result.success)
    
    if (result.success && result.data) {
      console.log('   Response Code:', result.data.ResponseCode)
      console.log('   Description:', result.data.Description)
      console.log('   Has URL:', !!result.data.url)
      console.log('   Has LowProfile Code:', !!result.data.LowProfileCode)
      
      if (result.data.url) {
        console.log('   URL Preview:', result.data.url.substring(0, 100) + '...')
      }
    } else {
      console.log('   Error:', result.error)
    }
    console.log('')
  }

  async testDirectTransaction(): Promise<void> {
    console.log('🧪 Testing Transactions/Transaction endpoint...')
    
    // This would normally require a real token or card details
    // In test mode, it should return a mock response
    try {
      const result = await cardcomService.chargeToken({
        amount: 25.99,
        description: 'Test Direct Transaction',
        paymentId: `test_direct_${Date.now()}`,
        token: 'test_token_123' // Mock token
      })

      console.log('📊 Transactions/Transaction Result:')
      console.log('   Success:', result.success)
      
      if (result.success && result.data) {
        console.log('   Response Code:', result.data.ResponseCode)
        console.log('   Transaction ID:', result.data.TransactionID)
        console.log('   Internal Deal Number:', result.data.InternalDealNumber)
      } else {
        console.log('   Error:', result.error)
      }
    } catch (error) {
      console.log('   Expected error (no real token):', error instanceof Error ? error.message : error)
    }
    console.log('')
  }

  async testRefund(): Promise<void> {
    console.log('🧪 Testing Transactions/RefundByTransactionId endpoint...')
    
    try {
      const result = await cardcomService.refund({
        amount: 5.00,
        description: 'Test refund transaction',
        paymentId: `test_refund_${Date.now()}`,
        token: 'test_token_123' // Mock token for test
      })

      console.log('📊 Transactions/RefundByTransactionId Result:')
      console.log('   Success:', result.success)
      
      if (result.success && result.data) {
        console.log('   Response Code:', result.data.ResponseCode)
        console.log('   Description:', result.data.Description)
      } else {
        console.log('   Error:', result.error)
      }
    } catch (error) {
      console.log('   Expected error (no real transaction):', error instanceof Error ? error.message : error)
    }
    console.log('')
  }

  async testErrorScenarios(): Promise<void> {
    console.log('🧪 Testing Error Scenarios...')
    
    // Test with missing required fields
    console.log('   Testing missing required fields...')
    const invalidResult = await cardcomService.createLowProfilePayment({
      amount: 0, // Invalid amount
      description: '',
      paymentId: '',
      customerEmail: 'invalid-email-format'
    })
    
    console.log('   Invalid data result - Success:', invalidResult.success)
    console.log('   Invalid data result - Error:', invalidResult.error)
    console.log('')
  }

  async testResponseValidation(): Promise<void> {
    console.log('🧪 Testing Response Validation...')
    
    const result = await cardcomService.createLowProfilePayment({
      amount: 1.23,
      description: 'Response validation test',
      paymentId: `test_validation_${Date.now()}`,
      customerEmail: 'validation@test.com'
    })

    if (result.success && result.data) {
      console.log('📋 Response Structure Validation:')
      console.log('   ✅ Has ResponseCode:', typeof result.data.ResponseCode)
      console.log('   ✅ Has Description:', typeof result.data.Description)
      console.log('   ✅ Has url field:', typeof result.data.url)
      console.log('   ✅ Has LowProfileCode:', typeof result.data.LowProfileCode)
      
      // Validate response code format
      if (result.data.ResponseCode === "0") {
        console.log('   ✅ Response code indicates success')
      } else {
        console.log(`   ⚠️ Response code: ${result.data.ResponseCode}`)
      }
    }
    console.log('')
  }

  async runAllEndpointTests(): Promise<void> {
    console.log('🚀 CARDCOM Endpoint Testing Suite\n')
    console.log('=' .repeat(50))
    console.log(`Mode: ${process.env.CARDCOM_TEST_MODE === 'true' ? 'TEST' : 'PRODUCTION'}`)
    console.log(`Terminal: ***${process.env.CARDCOM_TERMINAL?.slice(-3)}`)
    console.log('=' .repeat(50))
    console.log('')

    try {
      await this.testLowProfileCreate()
      await this.testDirectTransaction()
      await this.testRefund()
      await this.testErrorScenarios()
      await this.testResponseValidation()
      
      console.log('🎉 All endpoint tests completed!')
      
    } catch (error) {
      console.error('💥 Endpoint testing failed:', error)
      process.exit(1)
    }
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2)
  const tester = new CardcomEndpointTester()
  
  if (args.length === 0) {
    // Run all tests
    tester.runAllEndpointTests()
  } else {
    // Run specific test
    const testName = args[0]
    
    switch (testName) {
      case 'lowprofile':
        tester.testLowProfileCreate()
        break
      case 'transaction':
        tester.testDirectTransaction()
        break
      case 'refund':
        tester.testRefund()
        break
      case 'errors':
        tester.testErrorScenarios()
        break
      case 'validation':
        tester.testResponseValidation()
        break
      default:
        console.log('Available tests: lowprofile, transaction, refund, errors, validation')
        console.log('Usage: npm run cardcom:test-endpoints [test-name]')
        process.exit(1)
    }
  }
}

export { CardcomEndpointTester } 