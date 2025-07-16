#!/usr/bin/env tsx

import { config } from 'dotenv'
import { cardcomService } from '../lib/services/cardcom-service'

// Load environment variables explicitly for scripts
config({ path: '.env.local' })
config({ path: '.env' })

/**
 * סקריפט בדיקה מהירה של CARDCOM API
 * בודק רק הדברים החיוניים ביותר
 */
async function quickCheck(): Promise<void> {
  console.log('⚡ CARDCOM Quick Health Check\n')

  try {
    // 1. בדיקת הגדרות בסיסיות
    console.log('1️⃣ Checking configuration...')
    const status = cardcomService.getStatus()
    if (!status.configured) {
      throw new Error('❌ CARDCOM not configured properly')
    }
    console.log('✅ Configuration OK')
    console.log(`   Mode: ${status.testMode ? 'TEST' : 'PRODUCTION'}`)
    console.log(`   Terminal: ***${status.terminal?.slice(-3)}`)
    console.log('')

    // 2. בדיקת חיבור
    console.log('2️⃣ Testing connection...')
    const startTime = Date.now()
    const connectionResult = await cardcomService.testConnection()
    const duration = Date.now() - startTime
    
    if (!connectionResult.success) {
      throw new Error(`❌ Connection failed: ${connectionResult.error}`)
    }
    console.log(`✅ Connection OK (${duration}ms)`)
    console.log('')

    // 3. בדיקת יצירת תשלום (במצב TEST או מדומה)
    console.log('3️⃣ Testing payment creation...')
    const paymentStartTime = Date.now()
    
    const paymentResult = await cardcomService.createLowProfilePayment({
      amount: 1,
      description: 'Quick test payment - בדיקה מהירה',
      paymentId: `quick_test_${Date.now()}`,
      customerName: 'Test Customer',
      customerEmail: 'benswissa@gmail.com',
      createDocument: true, // ✅ בדיקה אמיתית של מסמכים
      documentType: 'Order' as const
    })
    
    const paymentDuration = Date.now() - paymentStartTime
    
    if (!paymentResult.success) {
      throw new Error(`❌ Payment creation failed: ${paymentResult.error}`)
    }
    
    console.log(`✅ Payment creation OK (${paymentDuration}ms)`)
    if (paymentResult.data?.url) {
      console.log('   🔗 Payment URL generated')
    }
    if (paymentResult.data?.LowProfileCode) {
      console.log('   🎫 LowProfile code generated')
    }
    console.log('')

    // סיכום
    console.log('🎉 QUICK CHECK PASSED!')
    console.log(`⏱️  Total time: ${Date.now() - (startTime - duration)}ms`)
    
  } catch (error) {
    console.error(`💥 QUICK CHECK FAILED: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  quickCheck()
    .catch(error => {
      console.error('💥 Script crashed:', error)
      process.exit(1)
    })
}

export { quickCheck } 