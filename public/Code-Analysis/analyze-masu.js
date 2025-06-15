const fs = require('fs');
const path = require('path');
const ts = require('typescript');

class MASUCodeAnalyzer {
    constructor() {
        this.results = {
            files: [],
            totalComplexity: 0,
            conditionalPaths: [],
            errorHandling: [],
            apiEndpoints: [],
            validationRules: [],
            businessLogic: [],
            testScenarios: []
        };
        this.projectRoot = path.resolve('../../');
    }

    analyzeProject() {
        console.log('🔍 Starting MASU Code Analysis...');
        console.log(`📁 Project Root: ${this.projectRoot}`);
        
        this.scanDirectory(this.projectRoot);
        this.generateReport();
        this.generateHTML();
        
        console.log('✅ Analysis Complete!');
        console.log(`📊 Results saved to: ${path.resolve('./analysis-report.html')}`);
    }

    scanDirectory(dir, relativePath = '') {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relPath = path.join(relativePath, item);
            
            // Skip node_modules, .git, .next, etc.
            if (this.shouldSkip(item)) continue;
            
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                this.scanDirectory(fullPath, relPath);
            } else if (this.isAnalyzableFile(item)) {
                this.analyzeFile(fullPath, relPath);
            }
        }
    }

    shouldSkip(name) {
        const skipDirs = [
            'node_modules', '.git', '.next', 'dist', 'build', 
            '.vscode', '.idea', 'coverage', 'public'
        ];
        return skipDirs.includes(name) || name.startsWith('.');
    }

    isAnalyzableFile(filename) {
        return /\.(ts|tsx|js|jsx)$/.test(filename) && !filename.endsWith('.d.ts');
    }

    analyzeFile(filePath, relativePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const sourceFile = ts.createSourceFile(
                relativePath,
                content,
                ts.ScriptTarget.Latest,
                true
            );

            const fileAnalysis = {
                path: relativePath,
                lines: content.split('\n').length,
                complexity: 0,
                conditionals: [],
                functions: [],
                apiRoutes: [],
                validations: [],
                errorHandling: []
            };

            this.visitNode(sourceFile, fileAnalysis);
            this.results.files.push(fileAnalysis);
            this.results.totalComplexity += fileAnalysis.complexity;

            console.log(`📄 Analyzed: ${relativePath} (${fileAnalysis.lines} lines, complexity: ${fileAnalysis.complexity})`);
        } catch (error) {
            console.warn(`⚠️  Could not analyze ${relativePath}: ${error.message}`);
        }
    }

    visitNode(node, fileAnalysis) {
        // Count complexity
        if (this.isComplexityNode(node)) {
            fileAnalysis.complexity++;
        }

        // Analyze conditionals
        if (ts.isIfStatement(node)) {
            const line = this.getLineNumber(node, fileAnalysis.path);
            fileAnalysis.conditionals.push({
                type: 'if',
                line,
                condition: this.getNodeText(node.expression),
                hasElse: !!node.elseStatement
            });
        }

        // Analyze switch statements
        if (ts.isSwitchStatement(node)) {
            const line = this.getLineNumber(node, fileAnalysis.path);
            fileAnalysis.conditionals.push({
                type: 'switch',
                line,
                cases: node.caseBlock.clauses.length,
                expression: this.getNodeText(node.expression)
            });
        }

        // Analyze functions
        if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
            const name = this.getFunctionName(node);
            if (name) {
                fileAnalysis.functions.push({
                    name,
                    line: this.getLineNumber(node, fileAnalysis.path),
                    parameters: this.getFunctionParameters(node),
                    isAsync: this.isAsyncFunction(node)
                });
            }
        }

        // Analyze API routes
        if (this.isApiRoute(node, fileAnalysis.path)) {
            fileAnalysis.apiRoutes.push({
                method: this.getHttpMethod(node),
                line: this.getLineNumber(node, fileAnalysis.path)
            });
        }

        // Analyze validation
        if (this.isValidation(node)) {
            fileAnalysis.validations.push({
                type: this.getValidationType(node),
                line: this.getLineNumber(node, fileAnalysis.path),
                rule: this.getNodeText(node).substring(0, 100)
            });
        }

        // Analyze error handling
        if (ts.isTryStatement(node)) {
            fileAnalysis.errorHandling.push({
                line: this.getLineNumber(node, fileAnalysis.path),
                hasCatch: !!node.catchClause,
                hasFinally: !!node.finallyBlock
            });
        }

        // Continue traversing
        ts.forEachChild(node, child => this.visitNode(child, fileAnalysis));
    }

    isComplexityNode(node) {
        return ts.isIfStatement(node) ||
               ts.isWhileStatement(node) ||
               ts.isForStatement(node) ||
               ts.isForInStatement(node) ||
               ts.isForOfStatement(node) ||
               ts.isDoStatement(node) ||
               ts.isSwitchStatement(node) ||
               ts.isConditionalExpression(node) ||
               (ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || node.operatorToken.kind === ts.SyntaxKind.BarBarToken));
    }

    getLineNumber(node, filePath) {
        // This is a simplified line number calculation
        return Math.floor(node.pos / 50) + 1; // Rough approximation
    }

    getNodeText(node) {
        return node.getText ? node.getText().substring(0, 200) : '[complex expression]';
    }

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

    isApiRoute(node, filePath) {
        return filePath.includes('/api/') && 
               (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node));
    }

    getHttpMethod(node) {
        const text = this.getNodeText(node);
        if (text.includes('GET')) return 'GET';
        if (text.includes('POST')) return 'POST';
        if (text.includes('PUT')) return 'PUT';
        if (text.includes('DELETE')) return 'DELETE';
        return 'UNKNOWN';
    }

    isValidation(node) {
        const text = this.getNodeText(node);
        return text.includes('validate') || 
               text.includes('schema') || 
               text.includes('required') ||
               text.includes('email') ||
               text.includes('phone');
    }

    getValidationType(node) {
        const text = this.getNodeText(node);
        if (text.includes('email')) return 'email';
        if (text.includes('phone')) return 'phone';
        if (text.includes('required')) return 'required';
        return 'general';
    }

    generateReport() {
        // Sort files by complexity
        this.results.files.sort((a, b) => b.complexity - a.complexity);
        
        // Generate test scenarios based on analysis
        this.generateTestScenarios();
        
        // Save JSON report
        fs.writeFileSync('./analysis-results.json', JSON.stringify(this.results, null, 2));
        console.log('💾 JSON report saved to analysis-results.json');
    }

    generateTestScenarios() {
        const scenarios = [];
        
        // Generate scenarios for each complex file
        this.results.files.forEach(file => {
            if (file.complexity > 10) {
                file.conditionals.forEach(conditional => {
                    scenarios.push({
                        file: file.path,
                        type: conditional.type,
                        line: conditional.line,
                        scenario: this.generateScenarioDescription(conditional, file.path)
                    });
                });
            }
        });
        
        this.results.testScenarios = scenarios;
    }

    generateScenarioDescription(conditional, filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        
        if (conditional.type === 'if') {
            return `Test ${fileName}: Verify behavior when ${conditional.condition} is true/false`;
        } else if (conditional.type === 'switch') {
            return `Test ${fileName}: Verify all ${conditional.cases} switch cases for ${conditional.expression}`;
        }
        
        return `Test ${fileName}: Verify conditional logic at line ${conditional.line}`;
    }

    generateHTML() {
        const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MASU Code Analysis Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .stat-number { font-size: 2.5rem; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 10px; }
        .section { background: white; margin: 20px 0; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .file-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-right: 4px solid #667eea; }
        .complexity-high { border-right-color: #e74c3c; }
        .complexity-medium { border-right-color: #f39c12; }
        .complexity-low { border-right-color: #2ecc71; }
        .conditional-item { background: #e8f4fd; margin: 5px 0; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
        th { background: #f8f9fa; font-weight: bold; }
        tr:nth-child(even) { background: #f9f9f9; }
        .scenario-item { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 MASU Code Analysis Report</h1>
            <p>ניתוח אוטומטי מלא של הקוד - ${new Date().toLocaleDateString('he-IL')}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${this.results.files.length}</div>
                <div class="stat-label">קבצים נותחו</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.results.totalComplexity}</div>
                <div class="stat-label">מורכבות כוללת</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.results.files.reduce((sum, f) => sum + f.conditionals.length, 0)}</div>
                <div class="stat-label">תנאים נמצאו</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.results.testScenarios.length}</div>
                <div class="stat-label">תרחישי בדיקה</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 קבצים לפי מורכבות</h2>
            ${this.results.files.slice(0, 20).map(file => `
                <div class="file-item ${this.getComplexityClass(file.complexity)}">
                    <h3>${file.path}</h3>
                    <p><strong>שורות:</strong> ${file.lines} | <strong>מורכבות:</strong> ${file.complexity} | <strong>פונקציות:</strong> ${file.functions.length}</p>
                    ${file.conditionals.length > 0 ? `
                        <h4>תנאים (${file.conditionals.length}):</h4>
                        ${file.conditionals.slice(0, 5).map(cond => `
                            <div class="conditional-item">
                                <strong>${cond.type.toUpperCase()}</strong> בשורה ${cond.line}: ${cond.condition || cond.expression || 'תנאי מורכב'}
                            </div>
                        `).join('')}
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>🧪 תרחישי בדיקה מומלצים</h2>
            <p>תרחישים שנוצרו אוטומטית על בסיס ניתוח הקוד:</p>
            ${this.results.testScenarios.slice(0, 50).map((scenario, index) => `
                <div class="scenario-item">
                    <h4>תרחיש ${index + 1}: ${path.basename(scenario.file)}</h4>
                    <p><strong>קובץ:</strong> ${scenario.file}</p>
                    <p><strong>סוג:</strong> ${scenario.type}</p>
                    <p><strong>שורה:</strong> ${scenario.line}</p>
                    <p><strong>תיאור:</strong> ${scenario.scenario}</p>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>📋 סיכום פונקציות</h2>
            <table>
                <thead>
                    <tr>
                        <th>קובץ</th>
                        <th>פונקציה</th>
                        <th>פרמטרים</th>
                        <th>אסינכרונית</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.results.files.flatMap(file => 
                        file.functions.slice(0, 3).map(func => `
                            <tr>
                                <td>${path.basename(file.path)}</td>
                                <td>${func.name}</td>
                                <td>${func.parameters.length}</td>
                                <td>${func.isAsync ? '✅' : '❌'}</td>
                            </tr>
                        `)
                    ).slice(0, 100).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;

        fs.writeFileSync('./analysis-report.html', html);
        console.log('📄 HTML report saved to analysis-report.html');
    }

    getComplexityClass(complexity) {
        if (complexity > 20) return 'complexity-high';
        if (complexity > 10) return 'complexity-medium';
        return 'complexity-low';
    }
}

// Run the analysis
const analyzer = new MASUCodeAnalyzer();
analyzer.analyzeProject(); 