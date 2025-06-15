#!/usr/bin/env ts-node

import { TreatmentBookingTest } from './treatment-booking-test';
import { SubscriptionTest } from './subscription-test';
import { GiftVoucherTest } from './gift-voucher-test';
import { TestResult, TestScenario } from './types';
import * as fs from 'fs';
import * as path from 'path';

class TestRunner {
  private allResults: TestResult[] = [];
  private allScenarios: TestScenario[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting MASU E2E Test Suite');
    console.log('=====================================');

    const tests = [
      { name: 'Treatment Booking', test: new TreatmentBookingTest() },
      { name: 'Subscription Purchase', test: new SubscriptionTest() },
      { name: 'Gift Voucher Purchase', test: new GiftVoucherTest() }
    ];

    for (const { name, test } of tests) {
      console.log(`\n🧪 Running ${name} Tests...`);
      console.log('-'.repeat(50));

      try {
        const scenarios = await test.runTests();
        this.allScenarios.push(...scenarios);
        this.allResults.push(...test.getResults());
        
        console.log(`✅ ${name} tests completed`);
      } catch (error) {
        console.error(`❌ ${name} tests failed:`, (error as Error).message);
        this.allResults.push(...test.getResults());
      } finally {
        // Ensure proper cleanup between tests
        try {
          await test.cleanup();
          // Add small delay between tests to ensure cleanup is complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (cleanupError) {
          console.error(`⚠️ Cleanup error for ${name}:`, (cleanupError as Error).message);
        }
      }
    }

    this.printSummary();
    this.generateReports();
  }

  private printSummary(): void {
    const total = this.allResults.length;
    const passed = this.allResults.filter(r => r.status === 'PASS').length;
    const failed = this.allResults.filter(r => r.status === 'FAIL').length;
    const skipped = this.allResults.filter(r => r.status === 'SKIP').length;

    console.log('\n' + '='.repeat(80));
    console.log('🏁 FINAL TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed} (${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%)`);
    console.log(`❌ Failed: ${failed} (${total > 0 ? ((failed / total) * 100).toFixed(1) : 0}%)`);
    console.log(`⏭️  Skipped: ${skipped} (${total > 0 ? ((skipped / total) * 100).toFixed(1) : 0}%)`);
    console.log(`🎯 Success Rate: ${total > 0 ? ((passed / total) * 100).toFixed(2) : 0}%`);
    console.log('='.repeat(80));

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.allResults.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`   • ${result.scenario} > ${result.step}`);
        if (result.message) {
          console.log(`     ${result.message}`);
        }
      });
    }

    console.log('\n📄 Reports generated:');
    console.log('   • test-report.html (Detailed HTML report)');
    console.log('   • test-results.json (Raw JSON data)');
  }

  private generateReports(): void {
    // Generate JSON report
    const jsonReport = {
      summary: {
        total: this.allResults.length,
        passed: this.allResults.filter(r => r.status === 'PASS').length,
        failed: this.allResults.filter(r => r.status === 'FAIL').length,
        skipped: this.allResults.filter(r => r.status === 'SKIP').length,
        successRate: this.allResults.length > 0 ? ((this.allResults.filter(r => r.status === 'PASS').length / this.allResults.length) * 100).toFixed(2) : 0,
        executionTime: new Date().toISOString()
      },
      scenarios: this.allScenarios,
      results: this.allResults
    };

    fs.writeFileSync(
      path.join(__dirname, 'test-results.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate HTML report
    this.generateHtmlReport(jsonReport);
  }

  private generateHtmlReport(jsonReport: any): void {
    const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MASU E2E Test Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            direction: rtl;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            transition: transform 0.3s ease;
        }
        
        .summary-card:hover {
            transform: translateY(-5px);
        }
        
        .summary-card h3 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .summary-card p {
            color: #666;
            font-size: 1.1em;
        }
        
        .passed { color: #27ae60; }
        .failed { color: #e74c3c; }
        .skipped { color: #f39c12; }
        .total { color: #3498db; }
        
        .content {
            padding: 30px;
        }
        
        .scenario {
            margin-bottom: 40px;
            border: 1px solid #e1e8ed;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .scenario-header {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #e1e8ed;
        }
        
        .scenario-title {
            font-size: 1.4em;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .scenario-description {
            color: #666;
            font-size: 1em;
        }
        
        .test-results {
            background: white;
        }
        
        .test-result {
            padding: 20px;
            border-bottom: 1px solid #f1f3f4;
            transition: background-color 0.3s ease;
        }
        
        .test-result:hover {
            background-color: #f8f9fa;
        }
        
        .test-result:last-child {
            border-bottom: none;
        }
        
        .test-step {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .status-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            flex-shrink: 0;
            margin-top: 2px;
        }
        
        .status-pass {
            background: #27ae60;
            color: white;
        }
        
        .status-fail {
            background: #e74c3c;
            color: white;
        }
        
        .status-skip {
            background: #f39c12;
            color: white;
        }
        
        .test-info {
            flex: 1;
        }
        
        .test-name {
            font-weight: 600;
            font-size: 1.1em;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .user-action {
            background: #e8f4fd;
            border-left: 4px solid #3498db;
            padding: 12px 15px;
            margin: 10px 0;
            border-radius: 0 5px 5px 0;
            font-style: italic;
        }
        
        .user-action::before {
            content: "👤 ";
            font-style: normal;
        }
        
        .test-message {
            color: #666;
            margin-bottom: 8px;
            line-height: 1.5;
        }
        
        .test-meta {
            display: flex;
            gap: 20px;
            font-size: 0.9em;
            color: #888;
        }
        
        .duration {
            font-weight: 500;
        }
        
        .timestamp {
            opacity: 0.8;
        }
        
        .error-message {
            background: #fdf2f2;
            border: 1px solid #fecaca;
            border-radius: 5px;
            padding: 12px;
            margin-top: 10px;
            color: #dc2626;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
        }
        
        .footer {
            background: #2c3e50;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .summary {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .test-step {
                flex-direction: column;
                gap: 10px;
            }
            
            .test-meta {
                flex-direction: column;
                gap: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 MASU E2E Test Report</h1>
            <p>Comprehensive End-to-End Testing Results</p>
            <p>Generated on ${new Date().toLocaleString('he-IL')}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3 class="total">${jsonReport.summary.total}</h3>
                <p>Total Tests</p>
            </div>
            <div class="summary-card">
                <h3 class="passed">${jsonReport.summary.passed}</h3>
                <p>Passed</p>
            </div>
            <div class="summary-card">
                <h3 class="failed">${jsonReport.summary.failed}</h3>
                <p>Failed</p>
            </div>
            <div class="summary-card">
                <h3 class="total">${jsonReport.summary.successRate}%</h3>
                <p>Success Rate</p>
            </div>
        </div>
        
        <div class="content">
            ${this.generateScenariosHtml()}
        </div>
        
        <div class="footer">
            <p>MASU Automated Testing Suite | Generated ${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(__dirname, 'test-report.html'), html);
  }

  private generateScenariosHtml(): string {
    const scenarioGroups = this.groupResultsByScenario();
    
    return Object.entries(scenarioGroups).map(([scenarioName, results]) => {
      const scenario = this.allScenarios.find(s => s.name === scenarioName);
      
      return `
        <div class="scenario">
            <div class="scenario-header">
                <div class="scenario-title">${scenarioName}</div>
                <div class="scenario-description">${scenario?.description || 'Test scenario execution'}</div>
            </div>
            <div class="test-results">
                ${results.map(result => this.generateTestResultHtml(result)).join('')}
            </div>
        </div>
      `;
    }).join('');
  }

  private generateTestResultHtml(result: TestResult): string {
    const statusClass = result.status.toLowerCase();
    const statusIcon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⏭';
    
    return `
      <div class="test-result">
          <div class="test-step">
              <div class="status-icon status-${statusClass}">${statusIcon}</div>
              <div class="test-info">
                  <div class="test-name">${result.step}</div>
                  ${result.userAction ? `<div class="user-action">${result.userAction}</div>` : ''}
                  <div class="test-message">${result.message || ''}</div>
                  ${result.status === 'FAIL' && result.message?.includes('Error:') ? 
                    `<div class="error-message">${result.message.split('Error: ')[1] || result.message}</div>` : ''}
                  <div class="test-meta">
                      <span class="duration">⏱️ ${result.duration}ms</span>
                      <span class="timestamp">🕒 ${new Date(result.timestamp).toLocaleString('he-IL')}</span>
                  </div>
              </div>
          </div>
      </div>
    `;
  }

  private groupResultsByScenario(): Record<string, TestResult[]> {
    return this.allResults.reduce((groups, result) => {
      if (!groups[result.scenario]) {
        groups[result.scenario] = [];
      }
      groups[result.scenario].push(result);
      return groups;
    }, {} as Record<string, TestResult[]>);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

export { TestRunner }; 