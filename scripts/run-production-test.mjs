#!/usr/bin/env node

/**
 * Simple runner for the production payment flow test
 * Usage: node scripts/run-production-test.mjs
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('🚀 Starting Production Payment Flow Test...')
console.log('📧 Email: benswissa@gmail.com')
console.log('📱 Phone: +972525131777')
console.log('')

// Run the TypeScript test file using tsx
const testProcess = spawn('npx', ['tsx', 'scripts/test-production-payment-flow.ts'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
})

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Test completed successfully!')
  } else {
    console.log(`\n❌ Test failed with exit code ${code}`)
    process.exit(code)
  }
})

testProcess.on('error', (error) => {
  console.error(`\n❌ Failed to start test: ${error.message}`)
  process.exit(1)
}) 