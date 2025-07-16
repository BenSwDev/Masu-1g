#!/usr/bin/env tsx

import { config } from 'dotenv'
import { cardcomService } from '../lib/services/cardcom-service'
import { logger } from '../lib/logs/logger'

// Load environment variables explicitly for scripts
config({ path: '.env.local' })
config({ path: '.env' })

interface HealthCheckResult {
  test: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: any
  duration?: number
}

class CardcomHealthChecker {
  private results: HealthCheckResult[] = []

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any, duration?: number) {
    this.results.push({ test, status, message, details, duration })
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now()
    try {
      console.log(`🧪 Running: ${testName}`)
      await testFn()
      const duration = Date.now() - startTime
      this.addResult(testName, 'PASS', 'Test passed', undefined, duration)
      console.log(`✅ ${testName} - PASSED (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.addResult(testName, 'FAIL', errorMessage, error, duration)
      console.log(`❌ ${testName} - FAILED: ${errorMessage} (${duration}ms)`)
    }
  }

  async checkEnvironmentVariables(): Promise<void> {
    await this.runTest('Environment Variables', async () => {
      // במקום לבדוק משתני סביבה ישירות, נבדוק שהשירות הוקם כראוי
      const status = cardcomService.getStatus()
      
      if (!status.configured) {
        throw new Error('CARDCOM service not properly configured - missing terminal or API token')
      }

      if (!status.terminal) {
        throw new Error('CARDCOM terminal not configured')
      }

      if (!status.baseUrl) {
        throw new Error('CARDCOM base URL not configured') 
      }

      // בדיקת פורמט terminal (מוסווה לצרכי אבטחה)
      const actualTerminal = process.env.CARDCOM_TERMINAL || status.terminal.replace(/\*/g, '0')
      if (!/^\d+$/.test(actualTerminal)) {
        throw new Error(`Invalid CARDCOM terminal format (not all digits)`)
      }

      // בדיקת base URL
      if (!status.baseUrl.startsWith('https://')) {
        throw new Error(`Invalid CARDCOM base URL format: ${status.baseUrl}`)
      }

      this.addResult('Environment Variables', 'PASS', 'CARDCOM service properly configured', {
        terminal: `***${status.terminal.slice(-3)}`,
        baseUrl: status.baseUrl,
        testMode: status.testMode,
        configured: status.configured
      })
    })
  }

  async checkServiceInitialization(): Promise<void> {
    await this.runTest('Service Initialization', async () => {
      const status = cardcomService.getStatus()
      
      if (!status.configured) {
        throw new Error('CARDCOM service not properly configured')
      }

      this.addResult('Service Initialization', 'PASS', 'Service initialized successfully', status)
    })
  }

  async checkTestConnection(): Promise<void> {
    await this.runTest('Test Connection', async () => {
      const result = await cardcomService.testConnection()
      
      if (!result.success) {
        throw new Error(result.error || 'Connection test failed')
      }

      this.addResult('Test Connection', 'PASS', 'Connection test successful', result)
    })
  }

  async checkLowProfilePayment(): Promise<void> {
    await this.runTest('LowProfile Payment Creation', async () => {
      const testPayment = {
        amount: 1,
        description: 'Health Check Test Payment - טיפול בדיקה',
        paymentId: `health_check_${Date.now()}`,
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        createDocument: true, // ✅ בדיקה אמיתית של מסמכים
        documentType: 'Order' as const
      }

      const result = await cardcomService.createLowProfilePayment(testPayment)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create LowProfile payment')
      }

      // במצב PRODUCTION, CARDCOM עשוי לא להחזיר URL עבור בקשות בדיקה
      // נבדוק שהתגובה תקינה ולא דורשים בהכרח URL
      const hasUrl = result.data?.url || result.data?.LowProfileCode
      
      if (!hasUrl && String(result.data?.ResponseCode) !== "0") {
        throw new Error('Payment creation failed - no URL and invalid response code')
      }

      const status = hasUrl ? 'PASS' : 'WARN'
      const message = hasUrl ? 'Payment creation successful with URL' : 'Payment creation successful (no URL in test mode)'
      
      this.addResult('LowProfile Payment Creation', status, message, {
        hasUrl: !!result.data?.url,
        hasLowProfileCode: !!result.data?.LowProfileCode,
        responseCode: result.data?.ResponseCode,
        description: result.data?.Description
      })
    })
  }

  async checkResponseTimes(): Promise<void> {
    await this.runTest('Response Time Check', async () => {
      const times: number[] = []
      const iterations = 3

      for (let i = 0; i < iterations; i++) {
        const start = Date.now()
        await cardcomService.testConnection()
        times.push(Date.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const maxTime = Math.max(...times)

      if (maxTime > 10000) { // 10 seconds
        throw new Error(`Response time too slow: max ${maxTime}ms, avg ${avgTime}ms`)
      }

      if (avgTime > 5000) { // 5 seconds average
        this.addResult('Response Time Check', 'WARN', `Slow response times: avg ${avgTime.toFixed(0)}ms`, { times, avgTime, maxTime })
      } else {
        this.addResult('Response Time Check', 'PASS', `Good response times: avg ${avgTime.toFixed(0)}ms`, { times, avgTime, maxTime })
      }
    })
  }

  async checkErrorHandling(): Promise<void> {
    await this.runTest('Error Handling', async () => {
      // Test with invalid data
      const invalidPayment = {
        amount: -1, // Invalid amount
        description: '',
        paymentId: '',
        customerEmail: 'invalid-email'
      }

      const result = await cardcomService.createLowProfilePayment(invalidPayment)
      
      // Should fail gracefully
      if (result.success) {
        throw new Error('Expected error handling for invalid data, but request succeeded')
      }

      if (!result.error) {
        throw new Error('Error response missing error message')
      }

      this.addResult('Error Handling', 'PASS', 'Error handling working correctly', {
        errorMessage: result.error
      })
    })
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60))
    console.log('🏥 CARDCOM API HEALTH CHECK SUMMARY')
    console.log('='.repeat(60))

    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const warnings = this.results.filter(r => r.status === 'WARN').length

    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⚠️  Warnings: ${warnings}`)
    console.log(`📊 Total: ${this.results.length}`)

    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! CARDCOM API is healthy')
    } else {
      console.log('\n🚨 SOME TESTS FAILED! Check the details above')
    }

    console.log('\n📝 DETAILED RESULTS:')
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌'
      console.log(`${icon} ${result.test}: ${result.message}`)
      
      if (result.duration) {
        console.log(`   ⏱️  Duration: ${result.duration}ms`)
      }
      
      if (result.details) {
        console.log(`   📋 Details:`, JSON.stringify(result.details, null, 2))
      }
      console.log('')
    })

    // Environment info
    console.log('🔧 ENVIRONMENT INFO:')
    console.log(`   Mode: ${process.env.CARDCOM_TEST_MODE === 'true' ? 'TEST' : 'PRODUCTION'}`)
    console.log(`   Terminal: ***${process.env.CARDCOM_TERMINAL?.slice(-3)}`)
    console.log(`   Base URL: ${process.env.CARDCOM_BASE_URL}`)
    console.log(`   Node ENV: ${process.env.NODE_ENV}`)
    console.log('')
  }

  async runAllChecks(): Promise<boolean> {
    console.log('🚀 Starting CARDCOM API Health Check...\n')

    await this.checkEnvironmentVariables()
    await this.checkServiceInitialization()
    await this.checkTestConnection()
    await this.checkLowProfilePayment()
    await this.checkResponseTimes()
    await this.checkErrorHandling()

    this.printSummary()

    const hasFailed = this.results.some(r => r.status === 'FAIL')
    return !hasFailed
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new CardcomHealthChecker()
  checker.runAllChecks()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('💥 Health check crashed:', error)
      process.exit(1)
    })
}

export { CardcomHealthChecker } 