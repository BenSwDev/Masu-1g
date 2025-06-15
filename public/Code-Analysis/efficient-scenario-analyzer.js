const fs = require('fs');
const path = require('path');

class EfficientScenarioAnalyzer {
    constructor() {
        this.projectRoot = path.resolve('../../');
        this.results = {
            totalFiles: 0,
            totalScenarios: 0,
            fileAnalysis: [],
            keyFindings: [],
            testScenarios: []
        };
    }

    async analyzeProject() {
        console.log('🎯 Starting Efficient Scenario Analysis...');
        
        // Focus on key files only
        const keyFiles = this.getKeyFiles();
        console.log(`📁 Analyzing ${keyFiles.length} key files`);
        
        for (const filePath of keyFiles) {
            try {
                const analysis = this.analyzeKeyFile(filePath);
                if (analysis.scenarios.length > 0) {
                    this.results.fileAnalysis.push(analysis);
                    this.results.totalScenarios += analysis.scenarios.length;
                }
            } catch (error) {
                console.warn(`⚠️  Could not analyze ${filePath}: ${error.message}`);
            }
        }
        
        this.results.totalFiles = keyFiles.length;
        this.generateKeyFindings();
        this.generateTestScenarios();
        this.generateReport();
        
        console.log('✅ Efficient Analysis Complete!');
        console.log(`📊 Found ${this.results.totalScenarios} scenarios in ${this.results.totalFiles} files`);
    }

    getKeyFiles() {
        const keyPatterns = [
            'booking',
            'wizard',
            'professional',
            'payment',
            'validation',
            'actions',
            'api',
            'auth'
        ];
        
        const allFiles = this.scanForFiles(this.projectRoot);
        return allFiles.filter(file => 
            keyPatterns.some(pattern => 
                file.toLowerCase().includes(pattern)
            )
        );
    }

    scanForFiles(dir, files = []) {
        try {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                if (this.shouldSkip(item)) continue;
                
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    this.scanForFiles(fullPath, files);
                } else if (this.isAnalyzableFile(item)) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Skip directories we can't read
        }
        
        return files;
    }

    shouldSkip(name) {
        const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage'];
        return skipDirs.includes(name) || name.startsWith('.');
    }

    isAnalyzableFile(filename) {
        return /\.(ts|tsx|js|jsx)$/.test(filename) && !filename.endsWith('.d.ts');
    }

    analyzeKeyFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        
        const analysis = {
            fileName,
            filePath: filePath.replace(this.projectRoot, ''),
            scenarios: [],
            conditions: 0,
            validations: 0,
            userRoles: [],
            complexity: 0
        };

        const lines = content.split('\n');
        
        // Count key elements
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            const trimmedLine = line.trim().toLowerCase();
            
            // Count conditions
            if (trimmedLine.includes('if (') || trimmedLine.includes('if(') || 
                trimmedLine.includes('switch (') || trimmedLine.includes('switch(')) {
                analysis.conditions++;
            }
            
            // Count validations
            if (trimmedLine.includes('validate') || trimmedLine.includes('check') || 
                trimmedLine.includes('verify') || trimmedLine.includes('required')) {
                analysis.validations++;
            }
            
            // Find user roles
            ['guest', 'member', 'professional', 'admin', 'partner'].forEach(role => {
                if (trimmedLine.includes(role) && !analysis.userRoles.includes(role)) {
                    analysis.userRoles.push(role);
                }
            });
        });

        // Calculate complexity
        analysis.complexity = analysis.conditions + analysis.validations;
        
        // Generate scenarios based on file type and content
        analysis.scenarios = this.generateScenariosForFile(fileName, content, analysis);
        
        return analysis;
    }

    generateScenariosForFile(fileName, content, analysis) {
        const scenarios = [];
        
        // Booking-related scenarios
        if (fileName.includes('booking')) {
            scenarios.push(...this.generateBookingScenarios(content, analysis));
        }
        
        // Professional-related scenarios
        if (fileName.includes('professional')) {
            scenarios.push(...this.generateProfessionalScenarios(content, analysis));
        }
        
        // Payment-related scenarios
        if (fileName.includes('payment')) {
            scenarios.push(...this.generatePaymentScenarios(content, analysis));
        }
        
        // Validation scenarios
        if (fileName.includes('validation') || analysis.validations > 0) {
            scenarios.push(...this.generateValidationScenarios(content, analysis));
        }
        
        // Auth scenarios
        if (fileName.includes('auth') || fileName.includes('login')) {
            scenarios.push(...this.generateAuthScenarios(content, analysis));
        }
        
        return scenarios;
    }

    generateBookingScenarios(content, analysis) {
        const scenarios = [];
        
        // Basic booking scenarios
        scenarios.push({
            id: 'booking_guest_happy_path',
            name: 'Guest Booking - Happy Path',
            type: 'end_to_end',
            userRoles: ['guest'],
            steps: [
                'User fills booking form',
                'System validates data',
                'User selects treatment',
                'User chooses date/time',
                'User enters address',
                'User makes payment',
                'System creates booking',
                'System notifies professionals'
            ],
            validations: ['email', 'phone', 'address', 'payment'],
            expectedResult: 'Booking created successfully'
        });

        scenarios.push({
            id: 'booking_member_subscription',
            name: 'Member Booking with Subscription',
            type: 'end_to_end',
            userRoles: ['member'],
            steps: [
                'Member logs in',
                'Member selects subscription treatment',
                'System checks subscription credits',
                'Member chooses date/time',
                'System deducts credit',
                'System creates booking'
            ],
            validations: ['session', 'subscription_validity', 'credit_availability'],
            expectedResult: 'Booking created using subscription credit'
        });

        // Error scenarios
        scenarios.push({
            id: 'booking_validation_errors',
            name: 'Booking with Validation Errors',
            type: 'error_handling',
            userRoles: ['guest', 'member'],
            steps: [
                'User submits invalid data',
                'System validates input',
                'System returns validation errors',
                'User corrects errors',
                'System re-validates'
            ],
            validations: ['email_format', 'phone_format', 'required_fields'],
            expectedResult: 'Clear error messages displayed'
        });

        return scenarios;
    }

    generateProfessionalScenarios(content, analysis) {
        const scenarios = [];
        
        scenarios.push({
            id: 'professional_sms_response',
            name: 'Professional SMS Response',
            type: 'integration',
            userRoles: ['professional'],
            steps: [
                'Professional receives SMS',
                'Professional clicks response link',
                'System validates response token',
                'Professional accepts/declines booking',
                'System updates booking status',
                'System notifies customer'
            ],
            validations: ['token_validity', 'booking_availability', 'response_timeout'],
            expectedResult: 'Booking assigned to professional'
        });

        scenarios.push({
            id: 'professional_timeout',
            name: 'Professional Response Timeout',
            type: 'timeout_handling',
            userRoles: ['professional', 'admin'],
            steps: [
                'Professional receives SMS',
                '30 minutes pass without response',
                'System marks professional as non-responsive',
                'System notifies next professional',
                'Admin monitors assignment process'
            ],
            validations: ['timeout_mechanism', 'fallback_logic'],
            expectedResult: 'Booking reassigned to next professional'
        });

        return scenarios;
    }

    generatePaymentScenarios(content, analysis) {
        const scenarios = [];
        
        scenarios.push({
            id: 'payment_success',
            name: 'Successful Payment Processing',
            type: 'integration',
            userRoles: ['guest', 'member'],
            steps: [
                'User enters payment details',
                'System validates payment method',
                'System processes payment',
                'Payment gateway confirms',
                'System updates booking status'
            ],
            validations: ['card_validation', 'amount_validation', 'security_check'],
            expectedResult: 'Payment processed successfully'
        });

        scenarios.push({
            id: 'payment_failure',
            name: 'Payment Processing Failure',
            type: 'error_handling',
            userRoles: ['guest', 'member'],
            steps: [
                'User enters payment details',
                'Payment gateway declines',
                'System handles payment failure',
                'System shows error message',
                'User can retry with different method'
            ],
            validations: ['error_handling', 'retry_mechanism'],
            expectedResult: 'Clear error message with retry option'
        });

        return scenarios;
    }

    generateValidationScenarios(content, analysis) {
        const scenarios = [];
        
        // Email validation scenarios
        if (content.includes('email')) {
            scenarios.push({
                id: 'email_validation_comprehensive',
                name: 'Email Validation - All Cases',
                type: 'validation',
                userRoles: ['guest', 'member'],
                testCases: [
                    { input: 'valid@example.com', expected: 'pass' },
                    { input: 'invalid-email', expected: 'fail' },
                    { input: 'test@', expected: 'fail' },
                    { input: '@domain.com', expected: 'fail' },
                    { input: '', expected: 'fail' }
                ],
                validations: ['format_check', 'required_check'],
                expectedResult: 'Appropriate validation response for each case'
            });
        }

        // Phone validation scenarios
        if (content.includes('phone')) {
            scenarios.push({
                id: 'phone_validation_israeli',
                name: 'Israeli Phone Validation',
                type: 'validation',
                userRoles: ['guest', 'member'],
                testCases: [
                    { input: '+972501234567', expected: 'pass' },
                    { input: '0501234567', expected: 'pass_after_format' },
                    { input: '972501234567', expected: 'pass_after_format' },
                    { input: '+1234567890', expected: 'fail' },
                    { input: 'invalid', expected: 'fail' }
                ],
                validations: ['israeli_format', 'auto_formatting'],
                expectedResult: 'Israeli phone numbers accepted, others rejected'
            });
        }

        return scenarios;
    }

    generateAuthScenarios(content, analysis) {
        const scenarios = [];
        
        scenarios.push({
            id: 'auth_login_flow',
            name: 'User Login Flow',
            type: 'authentication',
            userRoles: ['member', 'professional', 'admin'],
            steps: [
                'User enters credentials',
                'System validates credentials',
                'System creates session',
                'User redirected to dashboard'
            ],
            validations: ['credential_check', 'session_creation'],
            expectedResult: 'User successfully logged in'
        });

        scenarios.push({
            id: 'auth_role_based_access',
            name: 'Role-Based Access Control',
            type: 'authorization',
            userRoles: ['member', 'professional', 'admin'],
            steps: [
                'User attempts to access resource',
                'System checks user role',
                'System grants/denies access',
                'Appropriate response returned'
            ],
            validations: ['role_check', 'permission_validation'],
            expectedResult: 'Access granted only to authorized roles'
        });

        return scenarios;
    }

    generateKeyFindings() {
        // Sort files by complexity
        const sortedFiles = this.results.fileAnalysis
            .sort((a, b) => b.complexity - a.complexity)
            .slice(0, 10);

        this.results.keyFindings = [
            {
                category: 'Most Complex Files',
                items: sortedFiles.map(file => ({
                    name: file.fileName,
                    complexity: file.complexity,
                    scenarios: file.scenarios.length
                }))
            },
            {
                category: 'User Role Coverage',
                items: this.getUserRoleCoverage()
            },
            {
                category: 'Validation Coverage',
                items: this.getValidationCoverage()
            }
        ];
    }

    getUserRoleCoverage() {
        const roleCoverage = {};
        
        this.results.fileAnalysis.forEach(file => {
            file.userRoles.forEach(role => {
                if (!roleCoverage[role]) {
                    roleCoverage[role] = { files: 0, scenarios: 0 };
                }
                roleCoverage[role].files++;
                roleCoverage[role].scenarios += file.scenarios.filter(s => 
                    s.userRoles && s.userRoles.includes(role)
                ).length;
            });
        });

        return Object.entries(roleCoverage).map(([role, data]) => ({
            role,
            files: data.files,
            scenarios: data.scenarios
        }));
    }

    getValidationCoverage() {
        const validationTypes = {};
        
        this.results.fileAnalysis.forEach(file => {
            file.scenarios.forEach(scenario => {
                if (scenario.validations) {
                    scenario.validations.forEach(validation => {
                        if (!validationTypes[validation]) {
                            validationTypes[validation] = 0;
                        }
                        validationTypes[validation]++;
                    });
                }
            });
        });

        return Object.entries(validationTypes).map(([type, count]) => ({
            type,
            count
        }));
    }

    generateTestScenarios() {
        // Collect all unique scenarios
        const allScenarios = [];
        
        this.results.fileAnalysis.forEach(file => {
            file.scenarios.forEach(scenario => {
                allScenarios.push({
                    ...scenario,
                    sourceFile: file.fileName
                });
            });
        });

        // Group by type
        const scenariosByType = {};
        allScenarios.forEach(scenario => {
            if (!scenariosByType[scenario.type]) {
                scenariosByType[scenario.type] = [];
            }
            scenariosByType[scenario.type].push(scenario);
        });

        this.results.testScenarios = Object.entries(scenariosByType).map(([type, scenarios]) => ({
            type,
            count: scenarios.length,
            scenarios: scenarios.slice(0, 5) // Limit to first 5 for display
        }));
    }

    generateReport() {
        console.log('📊 Generating final report...');
        
        // Save JSON report
        fs.writeFileSync('./efficient-analysis-results.json', JSON.stringify(this.results, null, 2));
        
        // Generate HTML report
        this.generateHTMLReport();
        
        console.log('💾 Reports saved to efficient-analysis-results.json and efficient-analysis-report.html');
    }

    generateHTMLReport() {
        const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MASU Efficient Scenario Analysis</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .stat-number { font-size: 2.5rem; font-weight: bold; color: #667eea; }
        .section { background: white; margin: 20px 0; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .file-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-right: 4px solid #667eea; }
        .scenario-item { background: #e8f4fd; margin: 8px 0; padding: 12px; border-radius: 5px; border-right: 3px solid #007bff; }
        .user-role { display: inline-block; background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin: 2px; }
        .collapsible { cursor: pointer; background: #667eea; color: white; padding: 10px; border: none; width: 100%; text-align: right; border-radius: 5px; margin: 5px 0; }
        .content { display: none; padding: 15px; background: #f9f9f9; border-radius: 5px; margin-bottom: 10px; }
        .content.active { display: block; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        th { background: #f8f9fa; font-weight: bold; }
        .complexity-high { border-right-color: #dc3545; }
        .complexity-medium { border-right-color: #ffc107; }
        .complexity-low { border-right-color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 MASU Efficient Scenario Analysis</h1>
            <p>ניתוח יעיל של כל התרחישים החשובים במערכת</p>
            <p>${new Date().toLocaleDateString('he-IL')}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${this.results.totalFiles}</div>
                <div class="stat-label">קבצים נותחו</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.results.totalScenarios}</div>
                <div class="stat-label">תרחישים נמצאו</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.results.fileAnalysis.reduce((sum, f) => sum + f.conditions, 0)}</div>
                <div class="stat-label">תנאים</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.results.fileAnalysis.reduce((sum, f) => sum + f.validations, 0)}</div>
                <div class="stat-label">ולידציות</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 ממצאים עיקריים</h2>
            ${this.results.keyFindings.map(finding => `
                <div class="file-item">
                    <h3>${finding.category}</h3>
                    ${finding.category === 'Most Complex Files' ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>קובץ</th>
                                    <th>מורכבות</th>
                                    <th>תרחישים</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${finding.items.map(item => `
                                    <tr class="${item.complexity > 20 ? 'complexity-high' : item.complexity > 10 ? 'complexity-medium' : 'complexity-low'}">
                                        <td>${item.name}</td>
                                        <td>${item.complexity}</td>
                                        <td>${item.scenarios}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <ul>
                            ${finding.items.map(item => `
                                <li>${JSON.stringify(item)}</li>
                            `).join('')}
                        </ul>
                    `}
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>📁 ניתוח קבצים</h2>
            ${this.results.fileAnalysis.map(file => `
                <div class="file-item ${file.complexity > 20 ? 'complexity-high' : file.complexity > 10 ? 'complexity-medium' : 'complexity-low'}">
                    <h3>${file.fileName}</h3>
                    <p><strong>מורכבות:</strong> ${file.complexity} | <strong>תנאים:</strong> ${file.conditions} | <strong>ולידציות:</strong> ${file.validations}</p>
                    <p><strong>תפקידי משתמש:</strong> ${file.userRoles.map(role => `<span class="user-role">${role}</span>`).join('')}</p>
                    
                    <button class="collapsible" onclick="toggleContent(this)">תרחישים (${file.scenarios.length})</button>
                    <div class="content">
                        ${file.scenarios.map(scenario => `
                            <div class="scenario-item">
                                <h4>${scenario.name}</h4>
                                <p><strong>סוג:</strong> ${scenario.type}</p>
                                <p><strong>תפקידים:</strong> ${(scenario.userRoles || []).map(role => `<span class="user-role">${role}</span>`).join('')}</p>
                                ${scenario.steps ? `
                                    <p><strong>שלבים:</strong></p>
                                    <ol>
                                        ${scenario.steps.map(step => `<li>${step}</li>`).join('')}
                                    </ol>
                                ` : ''}
                                ${scenario.testCases ? `
                                    <p><strong>מקרי בדיקה:</strong></p>
                                    <ul>
                                        ${scenario.testCases.map(testCase => `
                                            <li>${testCase.input} → ${testCase.expected}</li>
                                        `).join('')}
                                    </ul>
                                ` : ''}
                                <p><strong>תוצאה צפויה:</strong> ${scenario.expectedResult}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>🧪 תרחישי בדיקה לפי סוג</h2>
            ${this.results.testScenarios.map(group => `
                <div class="file-item">
                    <h3>${group.type} (${group.count} תרחישים)</h3>
                    ${group.scenarios.map(scenario => `
                        <div class="scenario-item">
                            <strong>${scenario.name}</strong> - ${scenario.sourceFile}
                            <br><small>${scenario.expectedResult}</small>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        function toggleContent(button) {
            const content = button.nextElementSibling;
            content.classList.toggle('active');
        }
    </script>
</body>
</html>`;

        fs.writeFileSync('./efficient-analysis-report.html', html);
    }
}

// Run the efficient analysis
const analyzer = new EfficientScenarioAnalyzer();
analyzer.analyzeProject().catch(console.error); 