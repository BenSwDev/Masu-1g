#!/usr/bin/env tsx

import { config } from 'dotenv'
import { cardcomService } from '../lib/services/cardcom-service'
import { logger } from '../lib/logs/logger'

// Load environment variables explicitly for scripts
config({ path: '.env.local' })
config({ path: '.env' })

/**
 * 🧪 בדיקה אמיתית של זרימת תשלום מלאה ב-CARDCOM
 * הסקריפט הזה בודק באמת מה שיקרה עם לקוח אמיתי!
 */
class CardcomRealWorldTest {

  async testFullPaymentFlow(): Promise<void> {
    console.log('🎯 Testing REAL WORLD Payment Flow with CARDCOM\n')
    console.log('This test simulates what happens when a real customer pays!')
    console.log('=' .repeat(60))

    // 1. בדיקת הגדרות
    console.log('\n1️⃣ Checking Real Production Configuration...')
    const status = cardcomService.getStatus()
    
    console.log(`   Mode: ${status.testMode ? '⚠️ TEST' : '✅ PRODUCTION'}`)
    console.log(`   Terminal: ***${status.terminal?.slice(-3)}`)
    console.log(`   Configured: ${status.configured ? '✅' : '❌'}`)
    
    if (status.testMode) {
      console.log('   ⚠️  WARNING: Running in TEST mode - not fully realistic!')
    }

    // 2. יצירת תשלום אמיתי עם מסמך
    console.log('\n2️⃣ Creating REAL payment with document...')
    
    const testPayment = {
      amount: 49.90, // מחיר אמיתי 
      description: 'טיפול מסאז׳ שוודי - 60 דקות',
      paymentId: `real_test_${Date.now()}`,
      customerName: 'בן כהן',
      customerEmail: 'test.customer@example.com',
      customerPhone: '+972501234567',
      createDocument: true, // ✅ מסמך אמיתי!
      documentType: 'Order' as const
    }

    console.log('   Payment Details:')
    console.log(`   💰 Amount: ₪${testPayment.amount}`)
    console.log(`   📄 Description: ${testPayment.description}`)
    console.log(`   👤 Customer: ${testPayment.customerName}`)
    console.log(`   📧 Email: ${testPayment.customerEmail}`)
    console.log(`   📋 Document: ${testPayment.documentType} (${testPayment.createDocument ? 'YES' : 'NO'})`)

    const startTime = Date.now()
    const result = await cardcomService.createLowProfilePayment(testPayment)
    const duration = Date.now() - startTime

    if (!result.success) {
      console.log('   ❌ FAILED to create payment!')
      console.log(`   Error: ${result.error}`)
      process.exit(1)
    }

    console.log(`   ✅ Payment created successfully (${duration}ms)`)
    console.log(`   Response Code: ${result.data?.ResponseCode}`)
    console.log(`   Description: ${result.data?.Description}`)

    // 3. בדיקת URL ותגובה
    console.log('\n3️⃣ Analyzing CARDCOM Response...')
    
    const hasUrl = !!result.data?.url
    const hasLowProfileCode = !!result.data?.LowProfileCode
    
    console.log(`   Has Payment URL: ${hasUrl ? '✅' : '❌'}`)
    console.log(`   Has LowProfile Code: ${hasLowProfileCode ? '✅' : '❌'}`)
    
    if (result.data?.url) {
      console.log(`   🔗 URL Preview: ${result.data.url.substring(0, 80)}...`)
      
      // בדיקת URL structure
      const url = new URL(result.data.url)
      console.log(`   🌐 Domain: ${url.hostname}`)
      console.log(`   📍 Path: ${url.pathname}`)
      
      // בדיקת parameters חשובים
      const params = new URLSearchParams(url.search)
      console.log(`   🎫 Has Token: ${params.has('token') ? '✅' : '❌'}`)
      console.log(`   🆔 Has Payment ID: ${params.has('ReturnValue') || params.get('ReturnValue') === testPayment.paymentId ? '✅' : '❌'}`)
      
    } else if (!status.testMode) {
      console.log('   ⚠️  WARNING: No URL returned in PRODUCTION mode!')
      console.log('   This might indicate a real issue with CARDCOM integration')
    }

    // 4. בדיקת callback URLs
    console.log('\n4️⃣ Validating Callback Configuration...')
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    console.log(`   Base URL: ${baseUrl}`)
    console.log(`   Success Callback: ${baseUrl}/api/payments/callback?status=success&paymentId=${testPayment.paymentId}`)
    console.log(`   Error Callback: ${baseUrl}/api/payments/callback?status=error&paymentId=${testPayment.paymentId}`)
    
    // בדיקת נגישות callback
    try {
      const callbackUrl = `${baseUrl}/api/payments/callback`
      console.log(`   🔍 Testing callback accessibility...`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${callbackUrl}?test=1`, { 
        method: 'GET',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log(`   Callback accessible: ${response.ok ? '✅' : '❌'} (${response.status})`)
      
    } catch (error) {
      console.log(`   ⚠️  Callback test failed: ${error instanceof Error ? error.message : error}`)
    }

    // 5. סיכום ודוח מציאותי
    console.log('\n5️⃣ Real World Assessment...')
    
    const realWorldScore = this.calculateRealWorldScore({
      hasUrl,
      hasLowProfileCode,
      isProduction: !status.testMode,
      responseTime: duration,
      hasDocument: testPayment.createDocument
    })

    console.log(`   🎯 Real World Readiness Score: ${realWorldScore}/100`)
    
    if (realWorldScore >= 90) {
      console.log('   🎉 EXCELLENT! Ready for real customers')
    } else if (realWorldScore >= 70) {
      console.log('   ✅ GOOD! Should work for real customers with minor issues')
    } else if (realWorldScore >= 50) {
      console.log('   ⚠️  WARNING! Might have issues with real customers')
    } else {
      console.log('   ❌ CRITICAL! NOT ready for real customers')
    }

    // המלצות
    console.log('\n📋 Recommendations for Real World Usage:')
    
    if (!hasUrl && !status.testMode) {
      console.log('   ❗ URGENT: No payment URL returned in production mode')
      console.log('     → Contact CARDCOM support immediately')
    }
    
    if (duration > 3000) {
      console.log('   ⚠️  Slow response time - customers might get impatient')
      console.log('     → Consider adding loading indicators')
    }
    
    if (status.testMode) {
      console.log('   🔧 Switch to PRODUCTION mode for real testing:')
      console.log('     → Set CARDCOM_TEST_MODE=false in environment')
    }
    
    console.log('   ✅ Test with real credit card numbers (use test cards)')
    console.log('   ✅ Verify email delivery of generated documents')
    console.log('   ✅ Test full customer journey end-to-end')

    console.log('\n🚀 Real World Test Completed!')
  }

  private calculateRealWorldScore(factors: {
    hasUrl: boolean,
    hasLowProfileCode: boolean,
    isProduction: boolean,
    responseTime: number,
    hasDocument: boolean
  }): number {
    let score = 0
    
    // URL או LowProfile code (חובה לזרימה)
    if (factors.hasUrl || factors.hasLowProfileCode) score += 40
    
    // מצב פרודקשן (אמיתיות)
    if (factors.isProduction) score += 20
    
    // זמן תגובה טוב
    if (factors.responseTime < 2000) score += 20
    else if (factors.responseTime < 5000) score += 10
    
    // מסמכים פעילים
    if (factors.hasDocument) score += 15
    
    // בונוס לביצועים מעולים
    if (factors.responseTime < 1000) score += 5
    
    return score
  }

  async testErrorRecovery(): Promise<void> {
    console.log('\n🔥 Testing Real World Error Scenarios...')
    
    // בדיקת תגובה לסכום לא תקין
    console.log('\n   Testing invalid amount...')
    const invalidResult = await cardcomService.createLowProfilePayment({
      amount: -50, // סכום שלילי
      description: 'Invalid payment test',
      paymentId: `error_test_${Date.now()}`,
      customerEmail: 'error@test.com'
    })
    
    if (invalidResult.success) {
      console.log('   ❌ DANGER: Invalid payment was accepted!')
    } else {
      console.log('   ✅ GOOD: Invalid payment properly rejected')
      console.log(`   Error: ${invalidResult.error}`)
    }
  }
}

// הפעלה ישירה
if (require.main === module) {
  const tester = new CardcomRealWorldTest()
  
  console.log('🌍 CARDCOM Real World Integration Test')
  console.log('======================================')
  console.log('This test simulates real customer behavior!')
  console.log('')
  
  tester.testFullPaymentFlow()
    .then(() => tester.testErrorRecovery())
    .then(() => {
      console.log('\n✨ All real world tests completed!')
      console.log('Now test with a real browser and credit card!')
    })
    .catch(error => {
      console.error('💥 Real world test failed:', error)
      process.exit(1)
    })
}

export { CardcomRealWorldTest } 