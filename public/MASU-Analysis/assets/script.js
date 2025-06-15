// Global variables
let projectData = null;
let detailedData = null;

// Load project data
async function loadProjectData() {
    try {
        const [basicResponse, detailedResponse, overviewResponse, bookingResponse] = await Promise.all([
            fetch('./data/project-analysis.json'),
            fetch('./data/detailed-analysis.json'),
            fetch('./data/system-overview.json').catch(() => null),
            fetch('./data/booking-system-analysis.json').catch(() => null)
        ]);
        
        projectData = await basicResponse.json();
        detailedData = await detailedResponse.json();
        
        if (overviewResponse) {
            window.systemOverview = await overviewResponse.json();
        }
        if (bookingResponse) {
            window.bookingAnalysis = await bookingResponse.json();
        }
        
        renderDashboard();
        renderStats();
        renderChart();
    } catch (error) {
        console.error('Error loading project data:', error);
        showError('שגיאה בטעינת נתוני הפרויקט');
    }
}

// Render main dashboard
function renderDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard || !projectData) return;

    dashboard.innerHTML = '';

    Object.entries(projectData.modules).forEach(([moduleKey, moduleData]) => {
        const card = createModuleCard(moduleKey, moduleData);
        dashboard.appendChild(card);
    });
}

// Create module card
function createModuleCard(moduleKey, moduleData) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const statusClass = getStatusClass(moduleData.status);
    const statusText = getStatusText(moduleData.status);
    
    card.innerHTML = `
        <h3>${getModuleName(moduleKey)}</h3>
        <span class="status-badge ${statusClass}">${statusText}</span>
        
        <div class="module-details">
            <div class="file-list">
                <h4>קבצים:</h4>
                <ul>
                    ${moduleData.files.map(file => `<li>${file}</li>`).join('')}
                </ul>
            </div>
            
            <h4>תכונות:</h4>
            <ul class="feature-list">
                ${moduleData.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
        </div>
    `;
    
    return card;
}

// Get status CSS class
function getStatusClass(status) {
    const statusMap = {
        'complete': 'status-complete',
        'partial': 'status-partial',
        'missing': 'status-missing',
        'analyzing': 'status-complete'
    };
    return statusMap[status] || 'status-analyzing';
}

// Get status text in Hebrew
function getStatusText(status) {
    const statusMap = {
        'complete': 'מוכן',
        'partial': 'חלקי',
        'missing': 'לא מיושם',
        'analyzing': 'קיים'
    };
    return statusMap[status] || 'קיים';
}

// Get module name in Hebrew
function getModuleName(moduleKey) {
    const moduleNames = {
        'authentication': 'מערכת אימות',
        'bookingSystem': 'מערכת הזמנות',
        'professionalManagement': 'ניהול מטפלים',
        'paymentSystem': 'מערכת תשלומים',
        'subscriptionSystem': 'מערכת מנויים',
        'giftVoucherSystem': 'מערכת שוברי מתנה',
        'treatmentManagement': 'ניהול טיפולים',
        'locationServices': 'שירותי מיקום',
        'reviewSystem': 'מערכת ביקורות',
        'couponSystem': 'מערכת קופונים',
        'workingHours': 'שעות עבודה',
        'notifications': 'התראות',
        'reporting': 'דוחות',
        'userManagement': 'ניהול משתמשים',
        'internationalization': 'תמיכה רב-לשונית'
    };
    return moduleNames[moduleKey] || moduleKey;
}

// Render statistics
function renderStats() {
    if (!projectData) return;

    const statsContainer = document.getElementById('stats');
    if (!statsContainer) return;

    const totalModules = Object.keys(projectData.modules).length;
    const completeModules = Object.values(projectData.modules).filter(m => m.status === 'complete').length;
    const partialModules = Object.values(projectData.modules).filter(m => m.status === 'partial').length;
    const completionPercentage = Math.round((completeModules / totalModules) * 100);

    statsContainer.innerHTML = `
        <div class="stat-card">
            <span class="stat-number">${totalModules}</span>
            <div class="stat-label">סה"כ מודולים</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">${completeModules}</span>
            <div class="stat-label">מודולים מוכנים</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">${partialModules}</span>
            <div class="stat-label">מודולים חלקיים</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">${completionPercentage}%</span>
            <div class="stat-label">אחוז השלמה</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">${projectData.dataModels.total}</span>
            <div class="stat-label">מודלי נתונים</div>
        </div>
        <div class="stat-card">
            <span class="stat-number">${projectData.apiEndpoints.total}</span>
            <div class="stat-label">נקודות API</div>
        </div>
    `;
}

// Render completion chart
function renderChart() {
    if (!projectData) return;

    const ctx = document.getElementById('completionChart');
    if (!ctx) return;

    const modules = Object.values(projectData.modules);
    const statusCounts = {
        complete: modules.filter(m => m.status === 'complete').length,
        partial: modules.filter(m => m.status === 'partial').length,
        missing: modules.filter(m => m.status === 'missing').length,
        analyzing: modules.filter(m => m.status === 'analyzing').length
    };

    // Simple chart implementation without external libraries
    const canvas = ctx.getContext('2d');
    const centerX = ctx.width / 2;
    const centerY = ctx.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const colors = {
        complete: '#2ecc71',
        partial: '#f39c12',
        missing: '#e74c3c',
        analyzing: '#3498db'
    };

    let currentAngle = 0;
    Object.entries(statusCounts).forEach(([status, count]) => {
        const sliceAngle = (count / total) * 2 * Math.PI;
        
        canvas.beginPath();
        canvas.moveTo(centerX, centerY);
        canvas.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        canvas.closePath();
        canvas.fillStyle = colors[status];
        canvas.fill();
        
        currentAngle += sliceAngle;
    });
}

// Show error message
function showError(message) {
    const container = document.querySelector('.container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    container.insertBefore(errorDiv, container.firstChild);
}

// Show success message
function showSuccess(message) {
    const container = document.querySelector('.container');
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    container.insertBefore(successDiv, container.firstChild);
}

// Navigation functionality
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Handle navigation
            const target = link.getAttribute('href').substring(1);
            handleNavigation(target);
        });
    });
}

// Handle navigation between sections
function handleNavigation(section) {
    const sections = ['overview', 'modules', 'roadmap', 'reports'];
    
    sections.forEach(s => {
        const element = document.getElementById(s);
        if (element) {
            element.style.display = s === section ? 'block' : 'none';
        }
    });
    
    if (section === 'overview') {
        renderSystemOverview();
        renderStats();
        renderChart();
    } else if (section === 'modules') {
        renderModuleDetails();
    } else if (section === 'roadmap') {
        renderBookingFlowchart();
    } else if (section === 'reports') {
        renderTestScenarios();
    }
}

// Render detailed module information
function renderModuleDetails() {
    const container = document.getElementById('modules');
    if (!container || !projectData) return;

    container.innerHTML = '<h2>פירוט מודולים</h2>';
    
    Object.entries(projectData.modules).forEach(([moduleKey, moduleData]) => {
        const moduleDiv = document.createElement('div');
        moduleDiv.className = 'card';
        moduleDiv.innerHTML = `
            <h3>${getModuleName(moduleKey)}</h3>
            <span class="status-badge ${getStatusClass(moduleData.status)}">${getStatusText(moduleData.status)}</span>
            
            <div class="file-list">
                <h4>קבצים (${moduleData.files.length}):</h4>
                <ul>
                    ${moduleData.files.map(file => `<li>${file}</li>`).join('')}
                </ul>
            </div>
            
            <div class="module-details">
                <h4>תכונות (${moduleData.features.length}):</h4>
                <ul class="feature-list">
                    ${moduleData.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
        `;
        container.appendChild(moduleDiv);
    });
}

// Render project roadmap
function renderRoadmap() {
    const container = document.getElementById('roadmap');
    if (!container) return;

    container.innerHTML = `
        <h2>מפת דרכים לפיתוח</h2>
        <div class="roadmap">
            <div class="roadmap-item high-priority">
                <span class="priority-badge priority-high">עדיפות גבוהה</span>
                <h3>השלמת מערכת התשלומים</h3>
                <p>יישום מלא של עיבוד תשלומים, החזרים וניהול אמצעי תשלום</p>
            </div>
            
            <div class="roadmap-item high-priority">
                <span class="priority-badge priority-high">עדיפות גבוהה</span>
                <h3>בדיקות אוטומטיות</h3>
                <p>הוספת בדיקות יחידה ובדיקות אינטגרציה לכל המודולים</p>
            </div>
            
            <div class="roadmap-item medium-priority">
                <span class="priority-badge priority-medium">עדיפות בינונית</span>
                <h3>שיפור ביצועים</h3>
                <p>אופטימיזציה של שאילתות מסד נתונים וזמני טעינה</p>
            </div>
            
            <div class="roadmap-item medium-priority">
                <span class="priority-badge priority-medium">עדיפות בינונית</span>
                <h3>מערכת דוחות מתקדמת</h3>
                <p>הוספת דוחות אנליטיים ומדדי ביצועים</p>
            </div>
            
            <div class="roadmap-item low-priority">
                <span class="priority-badge priority-low">עדיפות נמוכה</span>
                <h3>אפליקציה ניידת</h3>
                <p>פיתוח אפליקציה ניידת למטפלים ולקוחות</p>
            </div>
        </div>
    `;
}

// Render reports section
function renderReports() {
    const container = document.getElementById('reports');
    if (!container || !projectData || !detailedData) return;

    const lastUpdate = new Date().toLocaleDateString('he-IL');
    
    container.innerHTML = `
        <h2>דוחות מערכת</h2>
        
        <div class="summary-section">
            <h3>סיכום כללי</h3>
            <p><strong>שם הפרויקט:</strong> ${detailedData.projectOverview.name}</p>
            <p><strong>תיאור:</strong> ${detailedData.projectOverview.description}</p>
            <p><strong>שלב נוכחי:</strong> ${detailedData.projectOverview.currentPhase}</p>
            <p><strong>אחוז השלמה כללי:</strong> ${detailedData.projectOverview.overallCompletionPercentage}%</p>
            <p><strong>עדכון אחרון:</strong> ${lastUpdate}</p>
        </div>

        <div class="summary-section">
            <h3>סטטיסטיקות קוד</h3>
            <p><strong>סה"כ קבצים:</strong> ${detailedData.codebaseStatistics.totalFiles}</p>
            <p><strong>סה"כ שורות קוד:</strong> ${detailedData.codebaseStatistics.totalLinesOfCode}</p>
            <h4>הקבצים הגדולים ביותר:</h4>
            <div class="file-list">
                <ul>
                    ${detailedData.codebaseStatistics.largestFiles.map(file => 
                        `<li>${file.file} - ${file.lines} שורות (${file.complexity}) - ${file.recommendation}</li>`
                    ).join('')}
                </ul>
            </div>
        </div>

        <div class="summary-section">
            <h3>ניתוח אבטחה</h3>
            <p><strong>רמת סיכון:</strong> <span style="color: orange;">${detailedData.securityAnalysis.riskLevel}</span></p>
            <h4>מיושם:</h4>
            <ul class="feature-list">
                ${detailedData.securityAnalysis.implemented.map(item => `<li>${item}</li>`).join('')}
            </ul>
            <h4>חסר:</h4>
            <ul class="feature-list">
                ${detailedData.securityAnalysis.missing.map(item => `<li class="incomplete">${item}</li>`).join('')}
            </ul>
        </div>

        <div class="summary-section">
            <h3>מוכנות לפריסה</h3>
            <h4>סביבת ייצור:</h4>
            <p><strong>מוכן:</strong> <span style="color: red;">${detailedData.deploymentReadiness.production.ready ? 'כן' : 'לא'}</span></p>
            <h5>חסמים:</h5>
            <ul class="feature-list">
                ${detailedData.deploymentReadiness.production.blockers.map(blocker => `<li class="incomplete">${blocker}</li>`).join('')}
            </ul>
            
            <h4>סביבת בדיקות:</h4>
            <p><strong>מוכן:</strong> <span style="color: green;">${detailedData.deploymentReadiness.staging.ready ? 'כן' : 'לא'}</span></p>
        </div>

        <div class="summary-section">
            <h3>צעדים מומלצים</h3>
            ${detailedData.recommendedNextSteps.map(step => `
                <div class="roadmap-item ${step.priority.toLowerCase() === 'critical' ? 'high-priority' : step.priority.toLowerCase() === 'high' ? 'medium-priority' : 'low-priority'}">
                    <span class="priority-badge priority-${step.priority.toLowerCase() === 'critical' ? 'high' : step.priority.toLowerCase() === 'high' ? 'medium' : 'low'}">${step.priority}</span>
                    <h4>${step.task}</h4>
                    <p><strong>זמן משוער:</strong> ${step.estimatedEffort}</p>
                    <p><strong>השפעה עסקית:</strong> ${step.businessImpact}</p>
                </div>
            `).join('')}
        </div>
        
        <div class="summary-section">
            <h3>מודלי נתונים</h3>
            <div class="file-list">
                <ul>
                    ${projectData.dataModels.models.map(model => `<li>${model}.ts</li>`).join('')}
                </ul>
            </div>
        </div>
        
        <div class="summary-section">
            <h3>נקודות API</h3>
            <div class="file-list">
                <ul>
                    ${projectData.apiEndpoints.actions.map(action => `<li>${action}.ts</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadProjectData();
    
    // Set default active navigation
    const overviewLink = document.querySelector('.nav-links a[href="#overview"]');
    if (overviewLink) {
        overviewLink.classList.add('active');
    }
    
    // Show overview section by default
    handleNavigation('overview');
});

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('he-IL');
}

function calculateProgress(completed, total) {
    return Math.round((completed / total) * 100);
}

// Render system overview
function renderSystemOverview() {
    const container = document.getElementById('overview');
    if (!container || !window.systemOverview) {
        renderDashboard(); // Fallback to original dashboard
        return;
    }

    const data = window.systemOverview;
    
    container.innerHTML = `
        <h2>סקירה כללית - ${data.projectName}</h2>
        <div class="summary-section">
            <p><strong>סטטוס כללי:</strong> ${data.overallStatus}</p>
            <p><strong>תאריך ניתוח:</strong> ${data.analysisDate}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-number">${data.keyStatistics.totalFiles}</span>
                <div class="stat-label">קבצים</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${data.keyStatistics.mainModules}</span>
                <div class="stat-label">מודולים</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${data.keyStatistics.databaseModels}</span>
                <div class="stat-label">מודלי נתונים</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${data.keyStatistics.apiEndpoints}</span>
                <div class="stat-label">נקודות API</div>
            </div>
        </div>

        <div class="systems-grid">
            ${Object.entries(data.systemsOverview).map(([key, system]) => `
                <div class="card">
                    <h3>${system.name}</h3>
                    <span class="status-badge ${getStatusClass(system.status)}">${getStatusText(system.status)}</span>
                    <div class="completion-bar">
                        <div class="completion-fill" style="width: ${system.completionLevel}"></div>
                        <span class="completion-text">${system.completionLevel}</span>
                    </div>
                    
                    <div class="module-details">
                        <h4>קבצים עיקריים:</h4>
                        <ul class="file-list">
                            ${system.coreFiles.map(file => `<li>${file}</li>`).join('')}
                        </ul>
                        
                        <h4>תכונות:</h4>
                        <ul class="feature-list">
                            ${system.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="summary-section">
            <h3>מחסנית טכנולוגית</h3>
            <div class="tech-stack">
                <p><strong>Framework:</strong> ${data.technicalStack.framework}</p>
                <p><strong>שפה:</strong> ${data.technicalStack.language}</p>
                <p><strong>מסד נתונים:</strong> ${data.technicalStack.database}</p>
                <p><strong>אימות:</strong> ${data.technicalStack.authentication}</p>
                <p><strong>עיצוב:</strong> ${data.technicalStack.styling}</p>
                <p><strong>התראות:</strong> ${data.technicalStack.notifications}</p>
                <p><strong>אזור זמן:</strong> ${data.technicalStack.timezone}</p>
            </div>
        </div>
    `;
}

// Render booking system flowchart
function renderBookingFlowchart() {
    const container = document.getElementById('roadmap');
    if (!container || !window.bookingAnalysis) {
        renderRoadmap(); // Fallback to original roadmap
        return;
    }

    const data = window.bookingAnalysis;
    
    container.innerHTML = `
        <h2>זרימת תהליך הזמנה - ${data.systemName}</h2>
        
        <div class="flowchart-section">
            <h3>תרשים זרימה מלא</h3>
            <div class="flowchart">
                <pre class="flowchart-text">${data.flowchart.mainFlow.join('\n')}</pre>
            </div>
        </div>

        <div class="branches-section">
            <h3>ענפים תנאיים</h3>
            ${data.conditionalBranches.map(branch => `
                <div class="card">
                    <h4>ענף ${branch.branchId}</h4>
                    <p><strong>תנאי הפעלה:</strong> ${branch.triggerCondition}</p>
                    <p><strong>נקודת החלטה:</strong> ${branch.decisionPoint}</p>
                    
                    <h5>תוצאות אפשריות:</h5>
                    ${branch.outcomes.map(outcome => `
                        <div class="outcome">
                            <p><strong>תנאי:</strong> ${outcome.condition}</p>
                            <p><strong>תוצאה:</strong> ${outcome.result}</p>
                            <p><strong>תלויות:</strong> ${outcome.dependencies.join(', ')}</p>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>

        <div class="validation-section">
            <h3>כללי ולידציה</h3>
            ${data.validationRules.map(rule => `
                <div class="card">
                    <h4>${rule.field}</h4>
                    <ul class="validation-rules">
                        ${rule.rules.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
    `;
}

// Render test scenarios
function renderTestScenarios() {
    const container = document.getElementById('reports');
    if (!container || !window.bookingAnalysis) {
        renderReports(); // Fallback to original reports
        return;
    }

    const data = window.bookingAnalysis;
    
    container.innerHTML = `
        <h2>תרחישי בדיקה - ${data.systemName}</h2>
        
        <div class="scenarios-section">
            ${data.testScenarios.map(scenario => `
                <div class="card scenario-card">
                    <h3>${scenario.scenarioId}: ${scenario.category}</h3>
                    
                    <div class="steps-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>שלב</th>
                                    <th>תפקיד משתמש</th>
                                    <th>פעולה</th>
                                    <th>תוצאה צפויה</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${scenario.steps.map(step => `
                                    <tr>
                                        <td>${step.stepNumber}</td>
                                        <td>${step.userRole}</td>
                                        <td>${step.action}</td>
                                        <td>${step.expectedResult}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="qa-checklist-section">
            <h3>רשימת בדיקות QA</h3>
            ${data.qaChecklist.map(category => `
                <div class="card">
                    <h4>${category.category}</h4>
                    <ul class="checklist">
                        ${category.items.map(item => `
                            <li>
                                <input type="checkbox" id="qa-${category.category}-${category.items.indexOf(item)}">
                                <label for="qa-${category.category}-${category.items.indexOf(item)}">${item}</label>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
    `;
}

// Export functions for potential external use
window.MASUAnalysis = {
    loadProjectData,
    renderDashboard,
    renderStats,
    renderChart,
    renderSystemOverview,
    renderBookingFlowchart,
    renderTestScenarios,
    showError,
    showSuccess
}; 