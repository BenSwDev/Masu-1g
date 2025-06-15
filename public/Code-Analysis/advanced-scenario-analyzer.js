const fs = require('fs');
const path = require('path');
const ts = require('typescript');

class AdvancedScenarioAnalyzer {
    constructor() {
        this.results = {
            endToEndFlows: [],
            userJourneys: [],
            validationScenarios: [],
            errorHandlingPaths: [],
            businessRules: [],
            integrationPoints: [],
            dataFlows: [],
            securityScenarios: []
        };
        this.projectRoot = path.resolve('../../');
        this.fileContents = new Map();
        this.functionCalls = new Map();
        this.userRoles = ['guest', 'member', 'professional', 'admin', 'partner'];
        this.businessProcesses = new Map();
    }

    async analyzeProject() {
        console.log('🔍 Starting Advanced End-to-End Scenario Analysis...');
        console.log(`📁 Project Root: ${this.projectRoot}`);
        
        // Phase 1: Load all files and build AST
        await this.loadAllFiles();
        
        // Phase 2: Map function calls and dependencies
        this.mapFunctionCalls();
        
        // Phase 3: Identify business processes
        this.identifyBusinessProcesses();
        
        // Phase 4: Trace end-to-end flows
        this.traceEndToEndFlows();
        
        // Phase 5: Generate comprehensive scenarios
        this.generateComprehensiveScenarios();
        
        // Phase 6: Generate reports
        this.generateAdvancedReport();
        this.generateHTMLReport();
        
        console.log('✅ Advanced Analysis Complete!');
        console.log(`📊 Results saved to: ${path.resolve('./advanced-analysis-report.html')}`);
    }

    async loadAllFiles() {
        console.log('📚 Loading all project files...');
        this.scanDirectoryForFiles(this.projectRoot);
        console.log(`📄 Loaded ${this.fileContents.size} files`);
    }

    scanDirectoryForFiles(dir, relativePath = '') {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relPath = path.join(relativePath, item);
            
            if (this.shouldSkip(item)) continue;
            
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                this.scanDirectoryForFiles(fullPath, relPath);
            } else if (this.isAnalyzableFile(item)) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    this.fileContents.set(relPath, {
                        content,
                        fullPath,
                        ast: this.parseToAST(content, relPath)
                    });
                } catch (error) {
                    console.warn(`⚠️  Could not load ${relPath}: ${error.message}`);
                }
            }
        }
    }

    shouldSkip(name) {
        const skipDirs = [
            'node_modules', '.git', '.next', 'dist', 'build', 
            '.vscode', '.idea', 'coverage'
        ];
        return skipDirs.includes(name) || name.startsWith('.');
    }

    isAnalyzableFile(filename) {
        return /\.(ts|tsx|js|jsx)$/.test(filename) && !filename.endsWith('.d.ts');
    }

    parseToAST(content, filePath) {
        try {
            return ts.createSourceFile(
                filePath,
                content,
                ts.ScriptTarget.Latest,
                true
            );
        } catch (error) {
            console.warn(`⚠️  Could not parse ${filePath}: ${error.message}`);
            return null;
        }
    }

    mapFunctionCalls() {
        console.log('🔗 Mapping function calls and dependencies...');
        
        for (const [filePath, fileData] of this.fileContents) {
            if (!fileData.ast) continue;
            
            const functions = this.extractFunctions(fileData.ast, filePath);
            const calls = this.extractFunctionCalls(fileData.ast, filePath);
            
            this.functionCalls.set(filePath, { functions, calls });
        }
    }

    extractFunctions(ast, filePath) {
        const functions = [];
        
        const visit = (node) => {
            if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
                const func = this.analyzeFunctionNode(node, filePath);
                if (func) functions.push(func);
            }
            ts.forEachChild(node, visit);
        };
        
        visit(ast);
        return functions;
    }

    analyzeFunctionNode(node, filePath) {
        const name = this.getFunctionName(node);
        if (!name) return null;

        const analysis = {
            name,
            filePath,
            line: this.getLineNumber(node),
            parameters: this.getFunctionParameters(node),
            isAsync: this.isAsyncFunction(node),
            userRoles: this.extractUserRoles(node),
            validations: this.extractValidations(node),
            errorHandling: this.extractErrorHandling(node),
            businessLogic: this.extractBusinessLogic(node),
            sideEffects: this.extractSideEffects(node),
            conditionalPaths: this.extractConditionalPaths(node),
            integrations: this.extractIntegrations(node)
        };

        return analysis;
    }

    extractUserRoles(node) {
        const roles = [];
        const text = node.getText();
        
        // Check for role-based logic
        this.userRoles.forEach(role => {
            if (text.includes(role) || text.includes(role.toUpperCase())) {
                roles.push(role);
            }
        });

        // Check for session/auth checks
        if (text.includes('session') || text.includes('auth') || text.includes('user')) {
            if (text.includes('admin')) roles.push('admin');
            if (text.includes('professional')) roles.push('professional');
            if (text.includes('member')) roles.push('member');
            if (text.includes('guest')) roles.push('guest');
        }

        return [...new Set(roles)];
    }

    extractValidations(node) {
        const validations = [];
        const text = node.getText();
        
        // Email validation
        if (text.includes('email') && (text.includes('validate') || text.includes('regex') || text.includes('@'))) {
            validations.push({
                type: 'email',
                rule: 'Email format validation',
                line: this.getLineNumber(node)
            });
        }

        // Phone validation
        if (text.includes('phone') && (text.includes('validate') || text.includes('+972') || text.includes('israeli'))) {
            validations.push({
                type: 'phone',
                rule: 'Israeli phone number validation',
                line: this.getLineNumber(node)
            });
        }

        // Required field validation
        if (text.includes('required') || text.includes('mandatory')) {
            validations.push({
                type: 'required',
                rule: 'Required field validation',
                line: this.getLineNumber(node)
            });
        }

        // Date validation
        if (text.includes('date') && (text.includes('validate') || text.includes('future') || text.includes('past'))) {
            validations.push({
                type: 'date',
                rule: 'Date validation',
                line: this.getLineNumber(node)
            });
        }

        // Payment validation
        if (text.includes('payment') && text.includes('validate')) {
            validations.push({
                type: 'payment',
                rule: 'Payment validation',
                line: this.getLineNumber(node)
            });
        }

        return validations;
    }

    extractErrorHandling(node) {
        const errorHandling = [];
        
        const visit = (child) => {
            if (ts.isTryStatement(child)) {
                errorHandling.push({
                    type: 'try-catch',
                    line: this.getLineNumber(child),
                    hasCatch: !!child.catchClause,
                    hasFinally: !!child.finallyBlock
                });
            }
            
            if (ts.isThrowStatement(child)) {
                errorHandling.push({
                    type: 'throw',
                    line: this.getLineNumber(child),
                    error: child.expression ? child.expression.getText().substring(0, 100) : 'unknown'
                });
            }
            
            ts.forEachChild(child, visit);
        };
        
        visit(node);
        return errorHandling;
    }

    extractBusinessLogic(node) {
        const businessLogic = [];
        const text = node.getText();
        
        // Booking logic
        if (text.includes('booking') || text.includes('appointment')) {
            businessLogic.push('booking_management');
        }
        
        // Payment logic
        if (text.includes('payment') || text.includes('charge') || text.includes('refund')) {
            businessLogic.push('payment_processing');
        }
        
        // Subscription logic
        if (text.includes('subscription') || text.includes('credit') || text.includes('usage')) {
            businessLogic.push('subscription_management');
        }
        
        // Professional assignment
        if (text.includes('professional') && (text.includes('assign') || text.includes('notify'))) {
            businessLogic.push('professional_assignment');
        }
        
        // Notification logic
        if (text.includes('sms') || text.includes('email') || text.includes('notification')) {
            businessLogic.push('notification_system');
        }

        return businessLogic;
    }

    extractSideEffects(node) {
        const sideEffects = [];
        const text = node.getText();
        
        // Database operations
        if (text.includes('save') || text.includes('create') || text.includes('update') || text.includes('delete')) {
            sideEffects.push('database_modification');
        }
        
        // External API calls
        if (text.includes('fetch') || text.includes('axios') || text.includes('api')) {
            sideEffects.push('external_api_call');
        }
        
        // SMS/Email sending
        if (text.includes('sendSMS') || text.includes('sendEmail')) {
            sideEffects.push('external_communication');
        }
        
        // File operations
        if (text.includes('writeFile') || text.includes('upload')) {
            sideEffects.push('file_operation');
        }

        return sideEffects;
    }

    extractConditionalPaths(node) {
        const paths = [];
        
        const visit = (child) => {
            if (ts.isIfStatement(child)) {
                paths.push({
                    type: 'if',
                    condition: child.expression.getText().substring(0, 200),
                    line: this.getLineNumber(child),
                    hasElse: !!child.elseStatement,
                    nestedLevel: this.getNestedLevel(child)
                });
            }
            
            if (ts.isSwitchStatement(child)) {
                paths.push({
                    type: 'switch',
                    expression: child.expression.getText().substring(0, 100),
                    cases: child.caseBlock.clauses.length,
                    line: this.getLineNumber(child)
                });
            }
            
            ts.forEachChild(child, visit);
        };
        
        visit(node);
        return paths;
    }

    extractIntegrations(node) {
        const integrations = [];
        const text = node.getText();
        
        // Database integrations
        if (text.includes('mongoose') || text.includes('mongodb')) {
            integrations.push('mongodb');
        }
        
        // Authentication
        if (text.includes('nextauth') || text.includes('jwt')) {
            integrations.push('nextauth');
        }
        
        // SMS service
        if (text.includes('sms') && text.includes('service')) {
            integrations.push('sms_service');
        }
        
        // Email service
        if (text.includes('email') && text.includes('service')) {
            integrations.push('email_service');
        }

        return integrations;
    }

    identifyBusinessProcesses() {
        console.log('🏢 Identifying business processes...');
        
        // Booking Process
        this.businessProcesses.set('booking_flow', {
            name: 'Booking Process',
            startPoints: ['guest-booking-wizard.tsx', 'booking-wizard.tsx'],
            keyFunctions: ['createBooking', 'findSuitableProfessionals', 'sendProfessionalNotifications'],
            userRoles: ['guest', 'member'],
            validationPoints: ['guest-info', 'treatment-selection', 'scheduling', 'payment'],
            integrations: ['payment_gateway', 'sms_service', 'database']
        });

        // Professional Response Process
        this.businessProcesses.set('professional_response', {
            name: 'Professional Response Process',
            startPoints: ['professional-sms-actions.ts'],
            keyFunctions: ['sendProfessionalNotification', 'handleProfessionalResponse'],
            userRoles: ['professional', 'admin'],
            validationPoints: ['response-timeout', 'booking-availability'],
            integrations: ['sms_service', 'database']
        });

        // Payment Process
        this.businessProcesses.set('payment_flow', {
            name: 'Payment Process',
            startPoints: ['payment-step.tsx', 'guest-payment-step.tsx'],
            keyFunctions: ['processPayment', 'validatePaymentMethod'],
            userRoles: ['guest', 'member'],
            validationPoints: ['payment-method', 'amount', 'security'],
            integrations: ['payment_gateway', 'database']
        });

        // Subscription Management
        this.businessProcesses.set('subscription_management', {
            name: 'Subscription Management',
            startPoints: ['subscription-actions.ts', 'user-subscription-actions.ts'],
            keyFunctions: ['createSubscription', 'useSubscriptionCredit', 'renewSubscription'],
            userRoles: ['member', 'admin'],
            validationPoints: ['subscription-validity', 'credit-availability', 'renewal-eligibility'],
            integrations: ['payment_gateway', 'database']
        });
    }

    traceEndToEndFlows() {
        console.log('🔄 Tracing end-to-end flows...');
        
        for (const [processKey, process] of this.businessProcesses) {
            const flow = this.traceProcessFlow(process);
            this.results.endToEndFlows.push(flow);
        }
    }

    traceProcessFlow(process) {
        const flow = {
            name: process.name,
            userRoles: process.userRoles,
            steps: [],
            scenarios: [],
            validationScenarios: [],
            errorScenarios: [],
            integrationPoints: process.integrations
        };

        // Trace through each start point
        for (const startPoint of process.startPoints) {
            const fileData = this.findFileByName(startPoint);
            if (fileData) {
                const steps = this.traceFileFlow(fileData, process);
                flow.steps.push(...steps);
            }
        }

        // Generate scenarios for this flow
        flow.scenarios = this.generateFlowScenarios(flow);
        flow.validationScenarios = this.generateValidationScenarios(flow);
        flow.errorScenarios = this.generateErrorScenarios(flow);

        return flow;
    }

    findFileByName(fileName) {
        for (const [filePath, fileData] of this.fileContents) {
            if (filePath.includes(fileName)) {
                return { filePath, ...fileData };
            }
        }
        return null;
    }

    traceFileFlow(fileData, process) {
        const steps = [];
        const functions = this.functionCalls.get(fileData.filePath)?.functions || [];
        
        for (const func of functions) {
            if (this.isRelevantToProcess(func, process)) {
                const step = {
                    function: func.name,
                    file: fileData.filePath,
                    userRoles: func.userRoles,
                    validations: func.validations,
                    conditionalPaths: func.conditionalPaths,
                    errorHandling: func.errorHandling,
                    sideEffects: func.sideEffects,
                    subScenarios: this.generateSubScenarios(func)
                };
                steps.push(step);
            }
        }
        
        return steps;
    }

    isRelevantToProcess(func, process) {
        // Check if function is relevant to the business process
        return func.businessLogic.some(logic => 
            process.keyFunctions.some(key => 
                func.name.toLowerCase().includes(key.toLowerCase()) ||
                logic.includes(process.name.toLowerCase().replace(' ', '_'))
            )
        );
    }

    generateSubScenarios(func) {
        const subScenarios = [];
        
        // Generate scenarios for each conditional path
        func.conditionalPaths.forEach((path, index) => {
            if (path.type === 'if') {
                subScenarios.push({
                    id: `${func.name}_if_${index + 1}`,
                    type: 'conditional',
                    description: `When ${path.condition} is true`,
                    userRoles: func.userRoles,
                    validations: func.validations.filter(v => v.line <= path.line + 10),
                    expectedOutcome: 'Execute if branch logic'
                });
                
                if (path.hasElse) {
                    subScenarios.push({
                        id: `${func.name}_else_${index + 1}`,
                        type: 'conditional',
                        description: `When ${path.condition} is false`,
                        userRoles: func.userRoles,
                        validations: func.validations.filter(v => v.line <= path.line + 10),
                        expectedOutcome: 'Execute else branch logic'
                    });
                }
            }
            
            if (path.type === 'switch') {
                for (let i = 0; i < path.cases; i++) {
                    subScenarios.push({
                        id: `${func.name}_switch_case_${i + 1}`,
                        type: 'switch_case',
                        description: `Switch case ${i + 1} for ${path.expression}`,
                        userRoles: func.userRoles,
                        validations: func.validations,
                        expectedOutcome: `Execute case ${i + 1} logic`
                    });
                }
            }
        });

        // Generate validation scenarios
        func.validations.forEach((validation, index) => {
            subScenarios.push({
                id: `${func.name}_validation_${index + 1}`,
                type: 'validation',
                description: `Validate ${validation.type}: ${validation.rule}`,
                userRoles: func.userRoles,
                validations: [validation],
                expectedOutcome: `Validation passes/fails for ${validation.type}`
            });
        });

        // Generate error handling scenarios
        func.errorHandling.forEach((error, index) => {
            subScenarios.push({
                id: `${func.name}_error_${index + 1}`,
                type: 'error_handling',
                description: `Handle ${error.type} error`,
                userRoles: func.userRoles,
                validations: [],
                expectedOutcome: `Error handled gracefully`
            });
        });

        return subScenarios;
    }

    generateFlowScenarios(flow) {
        const scenarios = [];
        
        // Happy path scenario
        scenarios.push({
            id: `${flow.name.replace(/\s+/g, '_').toLowerCase()}_happy_path`,
            name: `${flow.name} - Happy Path`,
            type: 'happy_path',
            userRoles: flow.userRoles,
            steps: flow.steps.map((step, index) => ({
                stepNumber: index + 1,
                action: `Execute ${step.function}`,
                userRole: step.userRoles.join(' or '),
                expectedResult: `${step.function} completes successfully`,
                validations: step.validations.map(v => v.rule).join(', '),
                sideEffects: step.sideEffects.join(', ')
            })),
            integrations: flow.integrationPoints
        });

        // Error scenarios for each step
        flow.steps.forEach((step, stepIndex) => {
            step.errorHandling.forEach((error, errorIndex) => {
                scenarios.push({
                    id: `${flow.name.replace(/\s+/g, '_').toLowerCase()}_error_step_${stepIndex + 1}_${errorIndex + 1}`,
                    name: `${flow.name} - Error at Step ${stepIndex + 1}`,
                    type: 'error_path',
                    userRoles: step.userRoles,
                    steps: [{
                        stepNumber: stepIndex + 1,
                        action: `Execute ${step.function} with error condition`,
                        userRole: step.userRoles.join(' or '),
                        expectedResult: `Error handled: ${error.type}`,
                        validations: step.validations.map(v => v.rule).join(', '),
                        sideEffects: 'Error logging, user notification'
                    }],
                    integrations: flow.integrationPoints
                });
            });
        });

        return scenarios;
    }

    generateValidationScenarios(flow) {
        const validationScenarios = [];
        
        flow.steps.forEach(step => {
            step.validations.forEach(validation => {
                // Valid input scenario
                validationScenarios.push({
                    id: `validation_${validation.type}_valid`,
                    type: 'validation_success',
                    field: validation.type,
                    rule: validation.rule,
                    testCase: `Valid ${validation.type} input`,
                    expectedResult: 'Validation passes',
                    userRoles: step.userRoles
                });

                // Invalid input scenario
                validationScenarios.push({
                    id: `validation_${validation.type}_invalid`,
                    type: 'validation_failure',
                    field: validation.type,
                    rule: validation.rule,
                    testCase: `Invalid ${validation.type} input`,
                    expectedResult: 'Validation fails with appropriate error message',
                    userRoles: step.userRoles
                });
            });
        });

        return validationScenarios;
    }

    generateErrorScenarios(flow) {
        const errorScenarios = [];
        
        flow.integrationPoints.forEach(integration => {
            errorScenarios.push({
                id: `${integration}_failure`,
                type: 'integration_failure',
                integration,
                scenario: `${integration} service unavailable`,
                expectedResult: 'Graceful degradation or retry mechanism',
                userRoles: flow.userRoles
            });
        });

        return errorScenarios;
    }

    generateComprehensiveScenarios() {
        console.log('📝 Generating comprehensive test scenarios...');
        
        // Generate user journey scenarios
        this.generateUserJourneyScenarios();
        
        // Generate cross-role scenarios
        this.generateCrossRoleScenarios();
        
        // Generate integration scenarios
        this.generateIntegrationScenarios();
        
        // Generate security scenarios
        this.generateSecurityScenarios();
    }

    generateUserJourneyScenarios() {
        const journeys = [
            {
                userRole: 'guest',
                journey: 'Complete Booking',
                steps: [
                    'Navigate to booking page',
                    'Fill guest information',
                    'Select treatment',
                    'Choose date and time',
                    'Enter address',
                    'Make payment',
                    'Receive confirmation'
                ]
            },
            {
                userRole: 'member',
                journey: 'Book with Subscription',
                steps: [
                    'Login to account',
                    'Navigate to booking',
                    'Select subscription treatment',
                    'Choose date and time',
                    'Select saved address',
                    'Confirm booking (no payment)',
                    'Receive confirmation'
                ]
            },
            {
                userRole: 'professional',
                journey: 'Respond to Booking',
                steps: [
                    'Receive SMS notification',
                    'Click response link',
                    'View booking details',
                    'Accept or decline',
                    'Update booking status',
                    'Complete service',
                    'Mark as completed'
                ]
            }
        ];

        this.results.userJourneys = journeys;
    }

    generateCrossRoleScenarios() {
        // Scenarios involving multiple user roles
        const crossRoleScenarios = [
            {
                id: 'booking_professional_assignment',
                name: 'Booking with Professional Assignment',
                involvedRoles: ['guest/member', 'professional', 'admin'],
                flow: [
                    'Customer creates booking',
                    'System finds suitable professionals',
                    'SMS sent to professionals',
                    'Professional responds within 30 minutes',
                    'Booking assigned to professional',
                    'Other professionals notified',
                    'Admin monitors if no response'
                ]
            }
        ];

        this.results.crossRoleScenarios = crossRoleScenarios;
    }

    generateIntegrationScenarios() {
        const integrationScenarios = [
            {
                integration: 'SMS Service',
                scenarios: [
                    'SMS sent successfully',
                    'SMS service unavailable',
                    'SMS delivery delayed',
                    'Invalid phone number'
                ]
            },
            {
                integration: 'Payment Gateway',
                scenarios: [
                    'Payment processed successfully',
                    'Payment declined',
                    'Payment gateway timeout',
                    'Invalid payment method'
                ]
            }
        ];

        this.results.integrationScenarios = integrationScenarios;
    }

    generateSecurityScenarios() {
        const securityScenarios = [
            {
                type: 'Authentication',
                scenarios: [
                    'Valid user login',
                    'Invalid credentials',
                    'Session expiry',
                    'Unauthorized access attempt'
                ]
            },
            {
                type: 'Authorization',
                scenarios: [
                    'Admin accessing admin functions',
                    'Member accessing member functions',
                    'Cross-role access attempt',
                    'Unauthenticated access attempt'
                ]
            }
        ];

        this.results.securityScenarios = securityScenarios;
    }

    // Helper methods
    getFunctionName(node) {
        if (node.name && node.name.text) return node.name.text;
        if (ts.isVariableDeclaration(node.parent) && node.parent.name) {
            return node.parent.name.text;
        }
        return 'anonymous';
    }

    getFunctionParameters(node) {
        if (!node.parameters) return [];
        return node.parameters.map(param => ({
            name: param.name.text || 'unknown',
            type: param.type ? param.type.getText() : 'any'
        }));
    }

    isAsyncFunction(node) {
        return !!(node.modifiers && node.modifiers.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword));
    }

    getLineNumber(node) {
        return Math.floor(node.pos / 50) + 1; // Rough approximation
    }

    getNestedLevel(node) {
        let level = 0;
        let parent = node.parent;
        while (parent) {
            if (ts.isIfStatement(parent) || ts.isSwitchStatement(parent)) {
                level++;
            }
            parent = parent.parent;
        }
        return level;
    }

    extractFunctionCalls(ast, filePath) {
        const calls = [];
        
        const visit = (node) => {
            if (ts.isCallExpression(node)) {
                const callInfo = {
                    function: node.expression.getText(),
                    line: this.getLineNumber(node),
                    arguments: node.arguments.length
                };
                calls.push(callInfo);
            }
            ts.forEachChild(node, visit);
        };
        
        visit(ast);
        return calls;
    }

    generateAdvancedReport() {
        const report = {
            summary: {
                totalEndToEndFlows: this.results.endToEndFlows.length,
                totalScenarios: this.results.endToEndFlows.reduce((sum, flow) => sum + flow.scenarios.length, 0),
                totalValidationScenarios: this.results.endToEndFlows.reduce((sum, flow) => sum + flow.validationScenarios.length, 0),
                totalUserJourneys: this.results.userJourneys.length,
                userRolesCovered: this.userRoles.length
            },
            endToEndFlows: this.results.endToEndFlows,
            userJourneys: this.results.userJourneys,
            crossRoleScenarios: this.results.crossRoleScenarios,
            integrationScenarios: this.results.integrationScenarios,
            securityScenarios: this.results.securityScenarios
        };

        fs.writeFileSync('./advanced-analysis-results.json', JSON.stringify(report, null, 2));
        console.log('💾 Advanced JSON report saved to advanced-analysis-results.json');
    }

    generateHTMLReport() {
        const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MASU Advanced Scenario Analysis</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .stat-number { font-size: 2.5rem; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 10px; }
        .section { background: white; margin: 20px 0; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .flow-item { background: #f8f9fa; margin: 15px 0; padding: 20px; border-radius: 8px; border-right: 4px solid #667eea; }
        .scenario-item { background: #e8f4fd; margin: 10px 0; padding: 15px; border-radius: 5px; border-right: 3px solid #007bff; }
        .user-role { display: inline-block; background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin: 2px; }
        .validation-item { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 5px; }
        .error-item { background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; margin: 5px 0; border-radius: 5px; }
        .integration-item { background: #d1ecf1; border: 1px solid #bee5eb; padding: 10px; margin: 5px 0; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: right; vertical-align: top; }
        th { background: #f8f9fa; font-weight: bold; }
        tr:nth-child(even) { background: #f9f9f9; }
        .collapsible { cursor: pointer; background: #667eea; color: white; padding: 10px; border: none; width: 100%; text-align: right; border-radius: 5px; margin: 5px 0; }
        .collapsible:hover { background: #5a6fd8; }
        .content { display: none; padding: 15px; background: #f9f9f9; border-radius: 5px; margin-bottom: 10px; }
        .content.active { display: block; }
        .sub-scenario { background: white; margin: 8px 0; padding: 12px; border-radius: 4px; border-right: 2px solid #17a2b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 MASU Advanced Scenario Analysis</h1>
            <p>ניתוח מקצה לקצה מלא של כל התרחישים, תת-תרחישים ומשתמשים - ${new Date().toLocaleDateString('he-IL')}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${this.results.endToEndFlows.length}</div>
                <div class="stat-label">תהליכים מקצה לקצה</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.results.endToEndFlows.reduce((sum, flow) => sum + flow.scenarios.length, 0)}</div>
                <div class="stat-label">תרחישי בדיקה</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.results.endToEndFlows.reduce((sum, flow) => sum + flow.validationScenarios.length, 0)}</div>
                <div class="stat-label">תרחישי ולידציה</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.results.userJourneys.length}</div>
                <div class="stat-label">מסעות משתמש</div>
            </div>
        </div>

        <div class="section">
            <h2>🔄 תהליכים מקצה לקצה</h2>
            ${this.results.endToEndFlows.map(flow => `
                <div class="flow-item">
                    <h3>${flow.name}</h3>
                    <p><strong>תפקידי משתמש:</strong> ${flow.userRoles.map(role => `<span class="user-role">${role}</span>`).join('')}</p>
                    <p><strong>נקודות אינטגרציה:</strong> ${flow.integrationPoints.join(', ')}</p>
                    
                    <button class="collapsible" onclick="toggleContent(this)">שלבי התהליך (${flow.steps.length})</button>
                    <div class="content">
                        ${flow.steps.map((step, index) => `
                            <div class="sub-scenario">
                                <h4>שלב ${index + 1}: ${step.function}</h4>
                                <p><strong>קובץ:</strong> ${step.file}</p>
                                <p><strong>תפקידים:</strong> ${step.userRoles.map(role => `<span class="user-role">${role}</span>`).join('')}</p>
                                <p><strong>ולידציות:</strong> ${step.validations.map(v => v.rule).join(', ')}</p>
                                <p><strong>תת-תרחישים:</strong> ${step.subScenarios.length}</p>
                                
                                ${step.subScenarios.length > 0 ? `
                                    <button class="collapsible" onclick="toggleContent(this)">תת-תרחישים (${step.subScenarios.length})</button>
                                    <div class="content">
                                        ${step.subScenarios.map(sub => `
                                            <div class="scenario-item">
                                                <strong>${sub.id}:</strong> ${sub.description}<br>
                                                <strong>סוג:</strong> ${sub.type}<br>
                                                <strong>תוצאה צפויה:</strong> ${sub.expectedOutcome}
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>

                    <button class="collapsible" onclick="toggleContent(this)">תרחישי בדיקה (${flow.scenarios.length})</button>
                    <div class="content">
                        ${flow.scenarios.map(scenario => `
                            <div class="scenario-item">
                                <h4>${scenario.name}</h4>
                                <p><strong>סוג:</strong> ${scenario.type}</p>
                                <p><strong>תפקידים:</strong> ${scenario.userRoles.map(role => `<span class="user-role">${role}</span>`).join('')}</p>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>שלב</th>
                                            <th>פעולה</th>
                                            <th>תפקיד</th>
                                            <th>תוצאה צפויה</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${scenario.steps.map(step => `
                                            <tr>
                                                <td>${step.stepNumber}</td>
                                                <td>${step.action}</td>
                                                <td>${step.userRole}</td>
                                                <td>${step.expectedResult}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `).join('')}
                    </div>

                    <button class="collapsible" onclick="toggleContent(this)">תרחישי ולידציה (${flow.validationScenarios.length})</button>
                    <div class="content">
                        ${flow.validationScenarios.map(validation => `
                            <div class="validation-item">
                                <strong>${validation.field}:</strong> ${validation.testCase}<br>
                                <strong>כלל:</strong> ${validation.rule}<br>
                                <strong>תוצאה צפויה:</strong> ${validation.expectedResult}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>👤 מסעות משתמש</h2>
            ${this.results.userJourneys.map(journey => `
                <div class="flow-item">
                    <h3>${journey.journey} - ${journey.userRole}</h3>
                    <ol>
                        ${journey.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>🔗 תרחישים רב-תפקידיים</h2>
            ${this.results.crossRoleScenarios ? this.results.crossRoleScenarios.map(scenario => `
                <div class="flow-item">
                    <h3>${scenario.name}</h3>
                    <p><strong>תפקידים מעורבים:</strong> ${scenario.involvedRoles.map(role => `<span class="user-role">${role}</span>`).join('')}</p>
                    <ol>
                        ${scenario.flow.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
            `).join('') : '<p>אין תרחישים רב-תפקידיים</p>'}
        </div>

        <div class="section">
            <h2>🔌 תרחישי אינטגרציה</h2>
            ${this.results.integrationScenarios ? this.results.integrationScenarios.map(integration => `
                <div class="integration-item">
                    <h3>${integration.integration}</h3>
                    <ul>
                        ${integration.scenarios.map(scenario => `<li>${scenario}</li>`).join('')}
                    </ul>
                </div>
            `).join('') : '<p>אין תרחישי אינטגרציה</p>'}
        </div>

        <div class="section">
            <h2>🔒 תרחישי אבטחה</h2>
            ${this.results.securityScenarios ? this.results.securityScenarios.map(security => `
                <div class="error-item">
                    <h3>${security.type}</h3>
                    <ul>
                        ${security.scenarios.map(scenario => `<li>${scenario}</li>`).join('')}
                    </ul>
                </div>
            `).join('') : '<p>אין תרחישי אבטחה</p>'}
        </div>
    </div>

    <script>
        function toggleContent(button) {
            const content = button.nextElementSibling;
            content.classList.toggle('active');
            button.textContent = content.classList.contains('active') ? 
                button.textContent.replace('▼', '▲') : 
                button.textContent.replace('▲', '▼');
        }
    </script>
</body>
</html>`;

        fs.writeFileSync('./advanced-analysis-report.html', html);
        console.log('📄 Advanced HTML report saved to advanced-analysis-report.html');
    }
}

// Run the advanced analysis
const analyzer = new AdvancedScenarioAnalyzer();
analyzer.analyzeProject().catch(console.error); 