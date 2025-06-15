const fs = require('fs');
const path = require('path');

class UltimateScenarioExtractor {
    constructor() {
        this.projectRoot = path.resolve('../../');
        this.allScenarios = new Map();
        this.fileAnalysis = new Map();
        this.conditionChains = [];
        this.userFlows = new Map();
    }

    async extractAllScenarios() {
        console.log('🚀 Starting Ultimate Scenario Extraction...');
        
        // Phase 1: Deep file analysis
        await this.deepAnalyzeFiles();
        
        // Phase 2: Extract condition chains
        this.extractConditionChains();
        
        // Phase 3: Map user flows
        this.mapUserFlows();
        
        // Phase 4: Generate ultimate report
        this.generateUltimateReport();
        
        console.log('✅ Ultimate Scenario Extraction Complete!');
    }

    async deepAnalyzeFiles() {
        console.log('🔍 Deep analyzing all files...');
        
        const files = this.getAllFiles(this.projectRoot);
        console.log(`📁 Found ${files.length} files to analyze`);
        
        for (const filePath of files) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const analysis = this.analyzeFileContent(content, filePath);
                this.fileAnalysis.set(filePath, analysis);
            } catch (error) {
                console.warn(`⚠️  Could not analyze ${filePath}: ${error.message}`);
            }
        }
    }

    getAllFiles(dir, files = []) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            
            if (this.shouldSkip(item)) continue;
            
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                this.getAllFiles(fullPath, files);
            } else if (this.isAnalyzableFile(item)) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    shouldSkip(name) {
        const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build'];
        return skipDirs.includes(name) || name.startsWith('.');
    }

    isAnalyzableFile(filename) {
        return /\.(ts|tsx|js|jsx)$/.test(filename) && !filename.endsWith('.d.ts');
    }

    analyzeFileContent(content, filePath) {
        const lines = content.split('\n');
        const analysis = {
            filePath,
            conditions: [],
            validations: [],
            userRoles: [],
            apiCalls: [],
            errorHandling: [],
            businessLogic: [],
            scenarios: []
        };

        lines.forEach((line, index) => {
            const lineNum = index + 1;
            
            // Extract conditions
            if (line.includes('if (') || line.includes('if(')) {
                analysis.conditions.push({
                    line: lineNum,
                    condition: line.trim(),
                    type: 'if_statement'
                });
            }
            
            if (line.includes('switch (') || line.includes('switch(')) {
                analysis.conditions.push({
                    line: lineNum,
                    condition: line.trim(),
                    type: 'switch_statement'
                });
            }
            
            // Extract validations
            if (line.includes('validate') || line.includes('check') || line.includes('verify')) {
                analysis.validations.push({
                    line: lineNum,
                    validation: line.trim(),
                    type: this.getValidationType(line)
                });
            }
            
            // Extract user roles
            ['guest', 'member', 'professional', 'admin', 'partner'].forEach(role => {
                if (line.toLowerCase().includes(role)) {
                    analysis.userRoles.push({
                        line: lineNum,
                        role,
                        context: line.trim()
                    });
                }
            });
            
            // Extract API calls
            if (line.includes('fetch(') || line.includes('axios') || line.includes('api.')) {
                analysis.apiCalls.push({
                    line: lineNum,
                    call: line.trim(),
                    type: 'api_call'
                });
            }
            
            // Extract error handling
            if (line.includes('try {') || line.includes('catch') || line.includes('throw')) {
                analysis.errorHandling.push({
                    line: lineNum,
                    handler: line.trim(),
                    type: 'error_handling'
                });
            }
        });

        // Generate scenarios for this file
        analysis.scenarios = this.generateFileScenarios(analysis);
        
        return analysis;
    }

    getValidationType(line) {
        if (line.includes('email')) return 'email_validation';
        if (line.includes('phone')) return 'phone_validation';
        if (line.includes('date')) return 'date_validation';
        if (line.includes('payment')) return 'payment_validation';
        if (line.includes('required')) return 'required_validation';
        return 'general_validation';
    }

    generateFileScenarios(analysis) {
        const scenarios = [];
        
        // Generate scenarios for each condition
        analysis.conditions.forEach((condition, index) => {
            scenarios.push({
                id: `${path.basename(analysis.filePath)}_condition_${index + 1}`,
                type: 'conditional_scenario',
                description: `When ${condition.condition}`,
                line: condition.line,
                userRoles: analysis.userRoles.map(ur => ur.role),
                validations: analysis.validations.filter(v => Math.abs(v.line - condition.line) <= 5),
                relatedApiCalls: analysis.apiCalls.filter(api => Math.abs(api.line - condition.line) <= 10)
            });
        });
        
        // Generate validation scenarios
        analysis.validations.forEach((validation, index) => {
            scenarios.push({
                id: `${path.basename(analysis.filePath)}_validation_${index + 1}`,
                type: 'validation_scenario',
                description: `Validate ${validation.type}`,
                line: validation.line,
                validationType: validation.type,
                testCases: this.generateValidationTestCases(validation.type)
            });
        });
        
        return scenarios;
    }

    generateValidationTestCases(validationType) {
        const testCases = {
            email_validation: [
                'valid@example.com',
                'invalid-email',
                'test@',
                '@domain.com',
                'very-long-email@' + 'a'.repeat(200) + '.com'
            ],
            phone_validation: [
                '+972501234567',
                '0501234567',
                '972501234567',
                '+1234567890',
                'invalid-phone'
            ],
            date_validation: [
                'valid_future_date',
                'past_date',
                'invalid_format',
                'too_far_future'
            ],
            payment_validation: [
                'valid_card_number',
                'expired_card',
                'invalid_cvv',
                'insufficient_funds'
            ],
            required_validation: [
                'field_present',
                'field_empty',
                'field_null',
                'field_undefined'
            ]
        };
        
        return testCases[validationType] || ['valid_input', 'invalid_input'];
    }

    extractConditionChains() {
        console.log('🔗 Extracting condition chains...');
        
        for (const [filePath, analysis] of this.fileAnalysis) {
            const chains = this.buildConditionChains(analysis);
            this.conditionChains.push(...chains);
        }
    }

    buildConditionChains(analysis) {
        const chains = [];
        
        // Group conditions by proximity
        const conditionGroups = [];
        let currentGroup = [];
        
        analysis.conditions.forEach(condition => {
            if (currentGroup.length === 0 || 
                condition.line - currentGroup[currentGroup.length - 1].line <= 10) {
                currentGroup.push(condition);
            } else {
                if (currentGroup.length > 0) {
                    conditionGroups.push(currentGroup);
                }
                currentGroup = [condition];
            }
        });
        
        if (currentGroup.length > 0) {
            conditionGroups.push(currentGroup);
        }
        
        // Create chains from groups
        conditionGroups.forEach((group, groupIndex) => {
            if (group.length > 1) {
                chains.push({
                    id: `chain_${path.basename(analysis.filePath)}_${groupIndex}`,
                    file: analysis.filePath,
                    conditions: group,
                    scenarios: this.generateChainScenarios(group)
                });
            }
        });
        
        return chains;
    }

    generateChainScenarios(conditionGroup) {
        const scenarios = [];
        
        // Generate all possible combinations
        const combinations = Math.pow(2, conditionGroup.length);
        
        for (let i = 0; i < combinations; i++) {
            const scenario = {
                id: `combination_${i}`,
                conditions: [],
                description: ''
            };
            
            conditionGroup.forEach((condition, index) => {
                const isTrue = (i & (1 << index)) !== 0;
                scenario.conditions.push({
                    condition: condition.condition,
                    value: isTrue,
                    line: condition.line
                });
            });
            
            scenario.description = scenario.conditions
                .map(c => `${c.condition} = ${c.value}`)
                .join(' AND ');
            
            scenarios.push(scenario);
        }
        
        return scenarios;
    }

    mapUserFlows() {
        console.log('👥 Mapping user flows...');
        
        // Booking flow
        this.userFlows.set('booking_flow', this.extractBookingFlow());
        
        // Professional response flow
        this.userFlows.set('professional_flow', this.extractProfessionalFlow());
        
        // Admin management flow
        this.userFlows.set('admin_flow', this.extractAdminFlow());
    }

    extractBookingFlow() {
        const bookingFiles = Array.from(this.fileAnalysis.keys())
            .filter(file => file.includes('booking') || file.includes('wizard'));
        
        const flow = {
            name: 'Complete Booking Flow',
            files: bookingFiles,
            steps: [],
            allScenarios: []
        };
        
        bookingFiles.forEach(file => {
            const analysis = this.fileAnalysis.get(file);
            flow.steps.push({
                file: path.basename(file),
                conditions: analysis.conditions.length,
                validations: analysis.validations.length,
                scenarios: analysis.scenarios.length
            });
            flow.allScenarios.push(...analysis.scenarios);
        });
        
        return flow;
    }

    extractProfessionalFlow() {
        const professionalFiles = Array.from(this.fileAnalysis.keys())
            .filter(file => file.includes('professional') || file.includes('sms'));
        
        const flow = {
            name: 'Professional Response Flow',
            files: professionalFiles,
            steps: [],
            allScenarios: []
        };
        
        professionalFiles.forEach(file => {
            const analysis = this.fileAnalysis.get(file);
            flow.steps.push({
                file: path.basename(file),
                conditions: analysis.conditions.length,
                validations: analysis.validations.length,
                scenarios: analysis.scenarios.length
            });
            flow.allScenarios.push(...analysis.scenarios);
        });
        
        return flow;
    }

    extractAdminFlow() {
        const adminFiles = Array.from(this.fileAnalysis.keys())
            .filter(file => file.includes('admin') || file.includes('management'));
        
        const flow = {
            name: 'Admin Management Flow',
            files: adminFiles,
            steps: [],
            allScenarios: []
        };
        
        adminFiles.forEach(file => {
            const analysis = this.fileAnalysis.get(file);
            flow.steps.push({
                file: path.basename(file),
                conditions: analysis.conditions.length,
                validations: analysis.validations.length,
                scenarios: analysis.scenarios.length
            });
            flow.allScenarios.push(...analysis.scenarios);
        });
        
        return flow;
    }

    generateUltimateReport() {
        console.log('📊 Generating ultimate report...');
        
        const totalScenarios = Array.from(this.fileAnalysis.values())
            .reduce((sum, analysis) => sum + analysis.scenarios.length, 0);
        
        const totalConditions = Array.from(this.fileAnalysis.values())
            .reduce((sum, analysis) => sum + analysis.conditions.length, 0);
        
        const totalValidations = Array.from(this.fileAnalysis.values())
            .reduce((sum, analysis) => sum + analysis.validations.length, 0);
        
        const report = {
            summary: {
                total_files_analyzed: this.fileAnalysis.size,
                total_scenarios_found: totalScenarios,
                total_conditions: totalConditions,
                total_validations: totalValidations,
                total_condition_chains: this.conditionChains.length,
                total_user_flows: this.userFlows.size
            },
            file_analysis: Object.fromEntries(
                Array.from(this.fileAnalysis.entries()).map(([file, analysis]) => [
                    path.basename(file),
                    {
                        ...analysis,
                        filePath: path.basename(file)
                    }
                ])
            ),
            condition_chains: this.conditionChains,
            user_flows: Object.fromEntries(this.userFlows),
            detailed_scenarios: this.generateDetailedScenarios()
        };
        
        fs.writeFileSync('./ultimate-scenarios.json', JSON.stringify(report, null, 2));
        this.generateUltimateHTMLReport(report);
        
        console.log('💾 Ultimate scenarios saved to ultimate-scenarios.json');
    }

    generateDetailedScenarios() {
        const detailed = [];
        
        for (const [filePath, analysis] of this.fileAnalysis) {
            analysis.scenarios.forEach(scenario => {
                detailed.push({
                    ...scenario,
                    file: path.basename(filePath),
                    fullPath: filePath
                });
            });
        }
        
        return detailed;
    }

    generateUltimateHTMLReport(report) {
        const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MASU Ultimate Scenario Analysis</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; line-height: 1.6; }
        .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .stat-number { font-size: 2.5rem; font-weight: bold; color: #667eea; }
        .section { background: white; margin: 20px 0; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .file-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-right: 4px solid #667eea; }
        .scenario-item { background: #e8f4fd; margin: 8px 0; padding: 12px; border-radius: 5px; border-right: 3px solid #007bff; }
        .condition-item { background: #fff3cd; margin: 5px 0; padding: 8px; border-radius: 4px; border-right: 2px solid #ffc107; }
        .validation-item { background: #d4edda; margin: 5px 0; padding: 8px; border-radius: 4px; border-right: 2px solid #28a745; }
        .collapsible { cursor: pointer; background: #667eea; color: white; padding: 10px; border: none; width: 100%; text-align: right; border-radius: 5px; margin: 5px 0; }
        .content { display: none; padding: 15px; background: #f9f9f9; border-radius: 5px; margin-bottom: 10px; }
        .content.active { display: block; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; vertical-align: top; }
        th { background: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 MASU Ultimate Scenario Analysis</h1>
            <p>ניתוח מלא של כל התרחישים מהקוד האמיתי</p>
            <p>${new Date().toLocaleDateString('he-IL')}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${report.summary.total_files_analyzed}</div>
                <div class="stat-label">קבצים נותחו</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.total_scenarios_found}</div>
                <div class="stat-label">תרחישים נמצאו</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.total_conditions}</div>
                <div class="stat-label">תנאים</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.total_validations}</div>
                <div class="stat-label">ולידציות</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.total_condition_chains}</div>
                <div class="stat-label">שרשראות תנאים</div>
            </div>
        </div>

        <div class="section">
            <h2>📁 ניתוח קבצים</h2>
            ${Object.entries(report.file_analysis).map(([fileName, analysis]) => `
                <div class="file-item">
                    <h3>${fileName}</h3>
                    <p><strong>תנאים:</strong> ${analysis.conditions.length} | <strong>ולידציות:</strong> ${analysis.validations.length} | <strong>תרחישים:</strong> ${analysis.scenarios.length}</p>
                    
                    <button class="collapsible" onclick="toggleContent(this)">תנאים (${analysis.conditions.length})</button>
                    <div class="content">
                        ${analysis.conditions.map(condition => `
                            <div class="condition-item">
                                <strong>שורה ${condition.line}:</strong> ${condition.condition}
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="collapsible" onclick="toggleContent(this)">ולידציות (${analysis.validations.length})</button>
                    <div class="content">
                        ${analysis.validations.map(validation => `
                            <div class="validation-item">
                                <strong>שורה ${validation.line}:</strong> ${validation.validation} (${validation.type})
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="collapsible" onclick="toggleContent(this)">תרחישים (${analysis.scenarios.length})</button>
                    <div class="content">
                        ${analysis.scenarios.map(scenario => `
                            <div class="scenario-item">
                                <strong>${scenario.id}:</strong> ${scenario.description}
                                ${scenario.testCases ? `<br><small>מקרי בדיקה: ${scenario.testCases.join(', ')}</small>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>🔗 שרשראות תנאים</h2>
            ${report.condition_chains.map(chain => `
                <div class="file-item">
                    <h3>${chain.id}</h3>
                    <p><strong>קובץ:</strong> ${path.basename(chain.file)}</p>
                    <p><strong>תנאים:</strong> ${chain.conditions.length}</p>
                    
                    <button class="collapsible" onclick="toggleContent(this)">כל הצירופים (${chain.scenarios.length})</button>
                    <div class="content">
                        ${chain.scenarios.map(scenario => `
                            <div class="scenario-item">
                                <strong>${scenario.id}:</strong> ${scenario.description}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>👥 זרימות משתמש</h2>
            ${Object.entries(report.user_flows).map(([flowKey, flow]) => `
                <div class="file-item">
                    <h3>${flow.name}</h3>
                    <p><strong>קבצים:</strong> ${flow.files.length} | <strong>תרחישים:</strong> ${flow.allScenarios.length}</p>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>קובץ</th>
                                <th>תנאים</th>
                                <th>ולידציות</th>
                                <th>תרחישים</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${flow.steps.map(step => `
                                <tr>
                                    <td>${step.file}</td>
                                    <td>${step.conditions}</td>
                                    <td>${step.validations}</td>
                                    <td>${step.scenarios}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
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

        fs.writeFileSync('./ultimate-analysis-report.html', html);
        console.log('📄 Ultimate HTML report saved to ultimate-analysis-report.html');
    }
}

// Run the ultimate scenario extraction
const extractor = new UltimateScenarioExtractor();
extractor.extractAllScenarios().catch(console.error); 