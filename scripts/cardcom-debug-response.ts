#!/usr/bin/env tsx

import { config } from 'dotenv'
import { cardcomService } from '../lib/services/cardcom-service'

// Load environment variables explicitly for scripts
config({ path: '.env.local' })
config({ path: '.env' })

/**
 * 🔍 דיבוג תגובות CARDCOM - מראה בדיוק מה מתקבל
 */
class CardcomResponseDebugger {

  async debugLowProfileResponse(): Promise<void> {
    console.log('🔍 CARDCOM Response Debugging\n')
    console.log('This will show EXACTLY what CARDCOM returns!')
    console.log('=' .repeat(50))

    try {
      // בקשה פשוטה לבדיקה
      const testPayment = {
        amount: 10.99,
        description: 'Debug Test Payment',
        paymentId: `debug_${Date.now()}`,
        customerName: 'Debug Customer',
        customerEmail: 'debug@test.com',
        createDocument: false // לא ניצור מסמך בדיבוג
      }

      console.log('\n📤 Sending request with payload:')
      console.log(JSON.stringify(testPayment, null, 2))

      console.log('\n⏳ Calling CARDCOM API...')
      const result = await cardcomService.createLowProfilePayment(testPayment)

      console.log('\n📨 FULL CARDCOM RESPONSE:')
      console.log('============================')
      console.log('Success:', result.success)
      console.log('Error:', result.error)
      
      if (result.data) {
        console.log('\n📋 Response Data:')
        console.log('Raw Response:', JSON.stringify(result.data, null, 2))
        
        console.log('\n🔍 Response Analysis:')
        console.log('ResponseCode:', result.data.ResponseCode, `(type: ${typeof result.data.ResponseCode})`)
        console.log('Description:', result.data.Description)
        console.log('Has URL:', !!result.data.url, result.data.url ? `"${result.data.url}"` : 'undefined')
        console.log('Has LowProfileCode:', !!result.data.LowProfileCode, result.data.LowProfileCode ? `"${result.data.LowProfileCode}"` : 'undefined')
        
        // בדיקת שדות נוספים שעלולים להיות בתגובה
        console.log('\n🕵️ Other fields in response:')
        Object.keys(result.data).forEach(key => {
          if (!['ResponseCode', 'Description', 'url', 'LowProfileCode'].includes(key)) {
            console.log(`${key}:`, result.data[key], `(type: ${typeof result.data[key]})`)
          }
        })
        
        // אם יש ResponseCode 0 אבל אין URL, זה בעיה
        if ((result.data.ResponseCode === "0" || result.data.ResponseCode === 0) && !result.data.url && !result.data.LowProfileCode) {
          console.log('\n🚨 CRITICAL ISSUE DETECTED:')
          console.log('   ✅ CARDCOM says SUCCESS (ResponseCode: 0)')
          console.log('   ❌ But NO URL or LowProfileCode returned')
          console.log('   🤔 This means payment was created but customer cannot pay!')
        }
      }

    } catch (error) {
      console.error('\n💥 Debug failed:', error)
    }
  }

  async debugWithDocument(): Promise<void> {
    console.log('\n\n🧾 Testing with Document Creation...')
    console.log('=' .repeat(40))

    try {
      const testPayment = {
        amount: 25.50,
        description: 'Debug Test with Document',
        paymentId: `debug_doc_${Date.now()}`,
        customerName: 'Debug Customer',
        customerEmail: 'debug@test.com',
        createDocument: true,
        documentType: 'Order' as const
      }

      console.log('\n📤 Sending request with document:')
      console.log('Create Document:', testPayment.createDocument)
      console.log('Document Type:', testPayment.documentType)

      const result = await cardcomService.createLowProfilePayment(testPayment)

      console.log('\n📨 Response with Document:')
      console.log('Success:', result.success)
      
      if (result.data) {
        console.log('ResponseCode:', result.data.ResponseCode)
        console.log('Description:', result.data.Description)
        console.log('Has URL:', !!result.data.url)
        console.log('Has LowProfileCode:', !!result.data.LowProfileCode)
        
        // בדיקת שדות הקשורים למסמך
        console.log('\n📋 Document-related fields:')
        Object.keys(result.data).forEach(key => {
          if (key.toLowerCase().includes('document') || key.toLowerCase().includes('invoice') || key.toLowerCase().includes('receipt')) {
            console.log(`${key}:`, result.data[key])
          }
        })
      }

    } catch (error) {
      console.error('\n💥 Document debug failed:', error)
    }
  }

  async checkApiAccess(): Promise<void> {
    console.log('\n\n🔐 Testing API Access...')
    console.log('=' .repeat(30))

    const status = cardcomService.getStatus()
    console.log('Service Status:', status)
    
    console.log('\n🌐 Environment Check:')
    console.log('Terminal:', process.env.CARDCOM_TERMINAL ? `***${process.env.CARDCOM_TERMINAL.slice(-3)}` : 'NOT SET')
    console.log('API Token:', process.env.CARDCOM_API_TOKEN ? `***${process.env.CARDCOM_API_TOKEN.slice(-8)}` : 'NOT SET')
    console.log('Base URL:', process.env.CARDCOM_BASE_URL)
    console.log('Test Mode:', process.env.CARDCOM_TEST_MODE)
    console.log('App URL:', process.env.NEXT_PUBLIC_APP_URL)

    // בדיקת חיבור
    try {
      console.log('\n🧪 Testing connection...')
      const connectionResult = await cardcomService.testConnection()
      console.log('Connection Test:', connectionResult)
    } catch (error) {
      console.error('Connection test failed:', error)
    }
  }
}

// הפעלה
if (require.main === module) {
  const responseDebugger = new CardcomResponseDebugger()
  
  console.log('🔬 CARDCOM API Response Debugger')
  console.log('==================================')
  console.log('This will help us understand what CARDCOM actually returns!')
  console.log('')
  
  responseDebugger.checkApiAccess()
    .then(() => responseDebugger.debugLowProfileResponse())
    .then(() => responseDebugger.debugWithDocument())
    .then(() => {
      console.log('\n✅ Debug completed!')
      console.log('If you see ResponseCode 0 but no URL, that\'s the bug we need to fix!')
    })
    .catch(error => {
      console.error('💥 Debug session failed:', error)
      process.exit(1)
    })
}

export { CardcomResponseDebugger } 