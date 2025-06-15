const fs = require('fs');
const path = require('path');

class ComprehensiveTestGenerator {
    constructor() {
        this.projectRoot = path.resolve('../../');
        this.allScenarios = [];
        this.businessFlows = new Map();
        this.userInteractions = new Map();
        this.validationMatrix = new Map();
        this.edgeCases = [];
        this.crossSystemScenarios = [];
    }

    async generateComprehensiveTests() {
        console.log('🎯 Starting Comprehensive Test Generation...');
        
        // Phase 1: Analyze all business flows
        await this.analyzeBusinessFlows();
        
        // Phase 2: Generate user interaction matrix
        this.generateUserInteractionMatrix();
        
        // Phase 3: Create validation test matrix
        this.createValidationMatrix();
        
        // Phase 4: Generate edge cases
        this.generateEdgeCases();
        
        // Phase 5: Create cross-system scenarios
        this.createCrossSystemScenarios();
        
        // Phase 6: Generate final comprehensive report
        this.generateComprehensiveReport();
        
        console.log('✅ Comprehensive Test Generation Complete!');
    }

    async analyzeBusinessFlows() {
        console.log('📊 Analyzing business flows...');
        
        // Booking Flow - המורכב ביותר
        this.businessFlows.set('booking_complete_flow', {
            name: 'Complete Booking Flow',
            startTriggers: [
                'User clicks "Book Treatment"',
                'User navigates to /book-treatment',
                'User selects treatment from homepage'
            ],
            userTypes: [
                {
                    type: 'guest',
                    variations: ['first_time', 'returning_guest', 'mobile_user', 'desktop_user'],
                    requiredData: ['name', 'email', 'phone', 'address', 'payment_method'],
                    optionalData: ['birth_date', 'gender', 'preferences']
                },
                {
                    type: 'member',
                    variations: ['new_member', 'active_subscriber', 'expired_subscriber', 'premium_member'],
                    requiredData: ['session_token'],
                    optionalData: ['preferred_address', 'payment_method']
                }
            ],
            steps: [
                {
                    step: 1,
                    name: 'Authentication Check',
                    conditions: [
                        'user_authenticated',
                        'user_not_authenticated',
                        'session_expired',
                        'invalid_session'
                    ],
                    validations: [
                        'session_validity',
                        'user_role_check',
                        'account_status'
                    ],
                    outcomes: [
                        'proceed_as_member',
                        'proceed_as_guest',
                        'redirect_to_login',
                        'show_session_expired_error'
                    ]
                },
                {
                    step: 2,
                    name: 'User Information Collection',
                    conditions: [
                        'guest_user',
                        'member_with_complete_profile',
                        'member_with_incomplete_profile',
                        'member_with_multiple_addresses'
                    ],
                    validations: [
                        'email_format_validation',
                        'phone_israeli_format',
                        'required_fields_check',
                        'duplicate_email_check',
                        'age_verification',
                        'address_completeness'
                    ],
                    subScenarios: [
                        {
                            scenario: 'email_validation',
                            testCases: [
                                'valid_email@domain.com',
                                'invalid_email_format',
                                'email_without_domain',
                                'email_with_special_chars',
                                'existing_email_in_system',
                                'email_too_long',
                                'empty_email'
                            ]
                        },
                        {
                            scenario: 'phone_validation',
                            testCases: [
                                '+972501234567 (valid)',
                                '0501234567 (auto-format)',
                                '972501234567 (missing +)',
                                '501234567 (missing country)',
                                '+972401234567 (invalid prefix)',
                                'phone_with_spaces',
                                'phone_with_dashes',
                                'international_non_israeli',
                                'empty_phone',
                                'phone_too_short',
                                'phone_too_long'
                            ]
                        }
                    ]
                },
                {
                    step: 3,
                    name: 'Treatment Selection',
                    conditions: [
                        'active_treatments_available',
                        'no_treatments_available',
                        'user_has_subscription',
                        'user_has_gift_voucher',
                        'treatment_requires_special_permission'
                    ],
                    validations: [
                        'treatment_availability',
                        'subscription_coverage',
                        'voucher_validity',
                        'user_eligibility',
                        'treatment_restrictions'
                    ],
                    subScenarios: [
                        {
                            scenario: 'treatment_pricing',
                            testCases: [
                                'fixed_price_treatment',
                                'duration_based_treatment',
                                'subscription_covered_treatment',
                                'partially_covered_treatment',
                                'gift_voucher_applicable',
                                'coupon_code_applicable',
                                'multiple_discounts_conflict'
                            ]
                        }
                    ]
                },
                {
                    step: 4,
                    name: 'Date and Time Selection',
                    conditions: [
                        'working_hours_available',
                        'fully_booked_date',
                        'professional_unavailable',
                        'special_closure_date',
                        'same_day_booking',
                        'advance_booking_limit'
                    ],
                    validations: [
                        'date_in_future',
                        'within_working_hours',
                        'minimum_advance_time',
                        'maximum_advance_time',
                        'slot_availability',
                        'professional_availability'
                    ],
                    subScenarios: [
                        {
                            scenario: 'date_validation',
                            testCases: [
                                'today_before_cutoff',
                                'today_after_cutoff',
                                'tomorrow',
                                'weekend_date',
                                'holiday_date',
                                'past_date',
                                'date_too_far_future',
                                'invalid_date_format'
                            ]
                        },
                        {
                            scenario: 'time_slot_validation',
                            testCases: [
                                'morning_slot_available',
                                'afternoon_slot_available',
                                'evening_slot_available',
                                'slot_just_taken',
                                'slot_outside_hours',
                                'slot_too_close_to_existing',
                                'slot_during_break_time'
                            ]
                        }
                    ]
                },
                {
                    step: 5,
                    name: 'Address Selection/Entry',
                    conditions: [
                        'member_with_saved_addresses',
                        'member_without_addresses',
                        'guest_new_address',
                        'address_outside_service_area',
                        'address_requires_special_handling'
                    ],
                    validations: [
                        'address_completeness',
                        'service_area_coverage',
                        'address_format',
                        'postal_code_validity',
                        'building_accessibility'
                    ],
                    subScenarios: [
                        {
                            scenario: 'address_validation',
                            testCases: [
                                'complete_valid_address',
                                'missing_street_number',
                                'missing_city',
                                'invalid_postal_code',
                                'address_outside_service_area',
                                'apartment_building_address',
                                'special_instructions_needed'
                            ]
                        }
                    ]
                },
                {
                    step: 6,
                    name: 'Price Calculation',
                    conditions: [
                        'base_price_only',
                        'subscription_discount_applied',
                        'gift_voucher_applied',
                        'coupon_code_applied',
                        'multiple_discounts',
                        'free_treatment'
                    ],
                    validations: [
                        'price_calculation_accuracy',
                        'discount_application_order',
                        'minimum_price_limits',
                        'currency_formatting',
                        'tax_calculation'
                    ]
                },
                {
                    step: 7,
                    name: 'Payment Processing',
                    conditions: [
                        'payment_required',
                        'no_payment_required',
                        'partial_payment',
                        'payment_method_saved',
                        'new_payment_method'
                    ],
                    validations: [
                        'payment_method_validity',
                        'card_expiration',
                        'security_code_check',
                        'billing_address_match',
                        'fraud_detection'
                    ],
                    subScenarios: [
                        {
                            scenario: 'payment_processing',
                            testCases: [
                                'successful_payment',
                                'declined_card',
                                'insufficient_funds',
                                'expired_card',
                                'invalid_security_code',
                                'payment_gateway_timeout',
                                'network_error_during_payment'
                            ]
                        }
                    ]
                },
                {
                    step: 8,
                    name: 'Booking Creation',
                    conditions: [
                        'payment_successful',
                        'payment_failed',
                        'system_error',
                        'database_unavailable'
                    ],
                    validations: [
                        'booking_data_integrity',
                        'unique_booking_id',
                        'status_initialization',
                        'audit_trail_creation'
                    ]
                },
                {
                    step: 9,
                    name: 'Professional Notification',
                    conditions: [
                        'professionals_available',
                        'no_professionals_available',
                        'sms_service_available',
                        'sms_service_down'
                    ],
                    validations: [
                        'professional_selection_criteria',
                        'sms_content_accuracy',
                        'response_link_validity',
                        'timeout_mechanism'
                    ],
                    subScenarios: [
                        {
                            scenario: 'professional_response',
                            testCases: [
                                'professional_accepts_immediately',
                                'professional_declines_immediately',
                                'professional_responds_near_timeout',
                                'professional_responds_after_timeout',
                                'multiple_professionals_respond',
                                'no_professional_responds',
                                'sms_delivery_failure'
                            ]
                        }
                    ]
                }
            ],
            integrationPoints: [
                'sms_service',
                'payment_gateway',
                'database',
                'email_service',
                'working_hours_system'
            ],
            errorScenarios: [
                'database_connection_lost',
                'sms_service_unavailable',
                'payment_gateway_timeout',
                'email_service_down',
                'server_overload',
                'network_interruption'
            ]
        });

        // Professional Response Flow
        this.businessFlows.set('professional_response_flow', {
            name: 'Professional Response Flow',
            startTriggers: [
                'SMS received by professional',
                'Professional clicks response link',
                'Professional accesses booking management'
            ],
            userTypes: [
                {
                    type: 'professional',
                    variations: ['new_professional', 'experienced_professional', 'busy_professional', 'available_professional'],
                    requiredData: ['professional_id', 'response_token'],
                    optionalData: ['decline_reason', 'estimated_arrival']
                }
            ],
            steps: [
                {
                    step: 1,
                    name: 'SMS Reception',
                    conditions: [
                        'sms_delivered_successfully',
                        'sms_delivery_failed',
                        'phone_number_invalid',
                        'professional_phone_changed'
                    ]
                },
                {
                    step: 2,
                    name: 'Response Link Click',
                    conditions: [
                        'link_valid_and_active',
                        'link_expired',
                        'booking_already_assigned',
                        'booking_cancelled'
                    ]
                },
                {
                    step: 3,
                    name: 'Response Processing',
                    conditions: [
                        'accept_response',
                        'decline_response',
                        'timeout_reached',
                        'system_error'
                    ]
                }
            ]
        });
    }

    generateUserInteractionMatrix() {
        console.log('👥 Generating user interaction matrix...');
        
        const interactions = [
            {
                scenario: 'Guest_Books_Treatment_Professional_Accepts',
                users: ['guest', 'professional', 'system'],
                flow: [
                    { user: 'guest', action: 'fills_booking_form', validations: ['email', 'phone', 'address'] },
                    { user: 'system', action: 'validates_data', conditions: ['all_valid', 'some_invalid'] },
                    { user: 'system', action: 'processes_payment', conditions: ['success', 'failure'] },
                    { user: 'system', action: 'creates_booking', conditions: ['success', 'db_error'] },
                    { user: 'system', action: 'notifies_professionals', conditions: ['sms_sent', 'sms_failed'] },
                    { user: 'professional', action: 'receives_notification', conditions: ['received', 'not_received'] },
                    { user: 'professional', action: 'responds_to_booking', conditions: ['accept', 'decline', 'timeout'] },
                    { user: 'system', action: 'assigns_professional', conditions: ['assigned', 'conflict'] },
                    { user: 'system', action: 'notifies_customer', conditions: ['notified', 'notification_failed'] }
                ]
            },
            {
                scenario: 'Member_Books_With_Subscription_Multiple_Professionals',
                users: ['member', 'professional1', 'professional2', 'professional3', 'admin'],
                flow: [
                    { user: 'member', action: 'logs_in', validations: ['session_valid'] },
                    { user: 'member', action: 'selects_subscription_treatment', conditions: ['credits_available', 'credits_depleted'] },
                    { user: 'system', action: 'deducts_subscription_credit', conditions: ['success', 'insufficient_credits'] },
                    { user: 'system', action: 'notifies_multiple_professionals', conditions: ['all_notified', 'some_failed'] },
                    { user: 'professional1', action: 'responds_first', conditions: ['accept', 'decline'] },
                    { user: 'professional2', action: 'responds_second', conditions: ['accept', 'decline', 'too_late'] },
                    { user: 'professional3', action: 'responds_third', conditions: ['accept', 'decline', 'too_late'] },
                    { user: 'system', action: 'handles_multiple_responses', conditions: ['first_wins', 'conflict_resolution'] },
                    { user: 'admin', action: 'monitors_assignment', conditions: ['auto_assigned', 'manual_intervention_needed'] }
                ]
            }
        ];

        this.userInteractions.set('booking_interactions', interactions);
    }

    createValidationMatrix() {
        console.log('✅ Creating validation matrix...');
        
        const validations = {
            email_validation: {
                field: 'email',
                rules: [
                    { rule: 'format_check', regex: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/' },
                    { rule: 'length_check', min: 5, max: 255 },
                    { rule: 'domain_check', allowed_domains: ['gmail.com', 'yahoo.com', 'hotmail.com', 'walla.co.il'] },
                    { rule: 'uniqueness_check', scope: 'guest_bookings' }
                ],
                test_cases: [
                    { input: 'valid@gmail.com', expected: 'pass', category: 'valid' },
                    { input: 'invalid-email', expected: 'fail', category: 'format_error' },
                    { input: 'test@', expected: 'fail', category: 'incomplete_domain' },
                    { input: '@domain.com', expected: 'fail', category: 'missing_local' },
                    { input: 'a'.repeat(250) + '@domain.com', expected: 'fail', category: 'too_long' },
                    { input: '', expected: 'fail', category: 'empty' },
                    { input: 'test@suspicious-domain.xyz', expected: 'warn', category: 'suspicious_domain' }
                ]
            },
            phone_validation: {
                field: 'phone',
                rules: [
                    { rule: 'israeli_format', pattern: '+972[5-9]\\d{8}' },
                    { rule: 'auto_formatting', transforms: ['remove_spaces', 'add_country_code'] },
                    { rule: 'carrier_validation', carriers: ['cellcom', 'partner', 'pelephone', 'hot_mobile'] }
                ],
                test_cases: [
                    { input: '+972501234567', expected: 'pass', category: 'valid_full' },
                    { input: '0501234567', expected: 'pass_after_format', category: 'auto_format' },
                    { input: '972501234567', expected: 'pass_after_format', category: 'missing_plus' },
                    { input: '501234567', expected: 'pass_after_format', category: 'local_format' },
                    { input: '+972401234567', expected: 'fail', category: 'invalid_prefix' },
                    { input: '+1234567890', expected: 'fail', category: 'non_israeli' },
                    { input: '050-123-4567', expected: 'pass_after_format', category: 'with_dashes' },
                    { input: '050 123 4567', expected: 'pass_after_format', category: 'with_spaces' }
                ]
            },
            date_validation: {
                field: 'booking_date',
                rules: [
                    { rule: 'future_date', min_advance_hours: 2 },
                    { rule: 'working_days', allowed_days: [0, 1, 2, 3, 4, 5, 6] },
                    { rule: 'working_hours', start: '08:00', end: '22:00' },
                    { rule: 'max_advance', max_days: 90 }
                ],
                test_cases: [
                    { input: 'tomorrow_10am', expected: 'pass', category: 'valid_future' },
                    { input: 'today_1_hour_ahead', expected: 'fail', category: 'too_soon' },
                    { input: 'yesterday', expected: 'fail', category: 'past_date' },
                    { input: '100_days_future', expected: 'fail', category: 'too_far' },
                    { input: 'sunday_10am', expected: 'pass', category: 'weekend_allowed' },
                    { input: 'tuesday_6am', expected: 'fail', category: 'before_hours' },
                    { input: 'friday_11pm', expected: 'fail', category: 'after_hours' }
                ]
            }
        };

        this.validationMatrix.set('all_validations', validations);
    }

    generateEdgeCases() {
        console.log('🔍 Generating edge cases...');
        
        this.edgeCases = [
            {
                category: 'Timing Edge Cases',
                cases: [
                    'User submits booking exactly at midnight',
                    'Professional responds exactly at 30-minute timeout',
                    'Multiple users book same slot simultaneously',
                    'System clock changes during booking process',
                    'Booking submitted during daylight saving time change'
                ]
            },
            {
                category: 'Data Edge Cases',
                cases: [
                    'User with extremely long name (255+ characters)',
                    'Address with special Unicode characters',
                    'Phone number with international format variations',
                    'Email with maximum allowed length',
                    'Treatment name with special characters'
                ]
            },
            {
                category: 'System Edge Cases',
                cases: [
                    'Database connection lost mid-transaction',
                    'SMS service rate limit exceeded',
                    'Payment gateway returns unexpected response',
                    'Memory limit reached during processing',
                    'Concurrent booking modifications'
                ]
            },
            {
                category: 'User Behavior Edge Cases',
                cases: [
                    'User rapidly clicks submit button multiple times',
                    'User navigates away during payment processing',
                    'User closes browser during booking creation',
                    'User submits form with JavaScript disabled',
                    'User uses browser back button during multi-step process'
                ]
            },
            {
                category: 'Business Logic Edge Cases',
                cases: [
                    'Subscription expires exactly during booking process',
                    'Gift voucher used simultaneously by multiple users',
                    'Professional becomes unavailable after accepting booking',
                    'Treatment price changes during booking process',
                    'Working hours updated while user selecting time'
                ]
            }
        ];
    }

    createCrossSystemScenarios() {
        console.log('🔗 Creating cross-system scenarios...');
        
        this.crossSystemScenarios = [
            {
                name: 'Complete Booking with All Integrations',
                systems: ['frontend', 'backend', 'database', 'sms_service', 'payment_gateway', 'email_service'],
                scenario: 'Guest books treatment, payment processes, professional notified, booking confirmed',
                failure_points: [
                    'Frontend validation fails',
                    'Backend API timeout',
                    'Database write fails',
                    'SMS service unavailable',
                    'Payment gateway rejects',
                    'Email service down'
                ],
                recovery_mechanisms: [
                    'Client-side retry logic',
                    'Backend circuit breaker',
                    'Database transaction rollback',
                    'SMS queue for retry',
                    'Payment retry with different method',
                    'Email queue for later delivery'
                ]
            },
            {
                name: 'Professional Response Chain',
                systems: ['sms_service', 'response_handler', 'database', 'notification_service'],
                scenario: 'Multiple professionals receive SMS, first one accepts, others notified',
                failure_points: [
                    'SMS delivery partial failure',
                    'Response handler overload',
                    'Database lock timeout',
                    'Notification service delay'
                ],
                race_conditions: [
                    'Multiple professionals accept simultaneously',
                    'Booking cancelled while professional responding',
                    'System assigns professional while admin manually assigns'
                ]
            }
        ];
    }

    generateComprehensiveReport() {
        console.log('📋 Generating comprehensive report...');
        
        const report = {
            summary: {
                total_business_flows: this.businessFlows.size,
                total_user_interactions: Array.from(this.userInteractions.values()).reduce((sum, interactions) => sum + interactions.length, 0),
                total_validation_rules: Object.keys(this.validationMatrix.get('all_validations') || {}).length,
                total_edge_cases: this.edgeCases.reduce((sum, category) => sum + category.cases.length, 0),
                total_cross_system_scenarios: this.crossSystemScenarios.length
            },
            business_flows: Object.fromEntries(this.businessFlows),
            user_interactions: Object.fromEntries(this.userInteractions),
            validation_matrix: Object.fromEntries(this.validationMatrix),
            edge_cases: this.edgeCases,
            cross_system_scenarios: this.crossSystemScenarios,
            test_execution_plan: this.generateTestExecutionPlan()
        };

        fs.writeFileSync('./comprehensive-test-scenarios.json', JSON.stringify(report, null, 2));
        
        // Generate HTML report
        this.generateHTMLReport(report);
        
        console.log('💾 Comprehensive test scenarios saved to comprehensive-test-scenarios.json');
    }

    generateTestExecutionPlan() {
        return {
            phase_1_unit_tests: {
                description: 'Test individual validation functions',
                estimated_tests: 150,
                priority: 'high'
            },
            phase_2_integration_tests: {
                description: 'Test component interactions',
                estimated_tests: 75,
                priority: 'high'
            },
            phase_3_end_to_end_tests: {
                description: 'Test complete user journeys',
                estimated_tests: 50,
                priority: 'medium'
            },
            phase_4_edge_case_tests: {
                description: 'Test edge cases and error scenarios',
                estimated_tests: 100,
                priority: 'medium'
            },
            phase_5_performance_tests: {
                description: 'Test system under load',
                estimated_tests: 25,
                priority: 'low'
            }
        };
    }

    generateHTMLReport(report) {
        const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MASU Comprehensive Test Scenarios</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; line-height: 1.6; }
        .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .stat-number { font-size: 2.5rem; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 10px; }
        .section { background: white; margin: 20px 0; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .flow-item { background: #f8f9fa; margin: 15px 0; padding: 20px; border-radius: 8px; border-right: 4px solid #667eea; }
        .step-item { background: #e8f4fd; margin: 10px 0; padding: 15px; border-radius: 5px; border-right: 3px solid #007bff; }
        .test-case { background: #fff3cd; margin: 5px 0; padding: 10px; border-radius: 4px; border-right: 2px solid #ffc107; }
        .edge-case { background: #f8d7da; margin: 5px 0; padding: 10px; border-radius: 4px; border-right: 2px solid #dc3545; }
        .validation-rule { background: #d4edda; margin: 5px 0; padding: 10px; border-radius: 4px; border-right: 2px solid #28a745; }
        .user-role { display: inline-block; background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin: 2px; }
        .collapsible { cursor: pointer; background: #667eea; color: white; padding: 10px; border: none; width: 100%; text-align: right; border-radius: 5px; margin: 5px 0; }
        .collapsible:hover { background: #5a6fd8; }
        .content { display: none; padding: 15px; background: #f9f9f9; border-radius: 5px; margin-bottom: 10px; }
        .content.active { display: block; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; vertical-align: top; }
        th { background: #f8f9fa; font-weight: bold; }
        tr:nth-child(even) { background: #f9f9f9; }
        .priority-high { border-right-color: #dc3545; }
        .priority-medium { border-right-color: #ffc107; }
        .priority-low { border-right-color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 MASU Comprehensive Test Scenarios</h1>
            <p>ניתוח מקיף של כל התרחישים האפשריים - כל תנאי, ולידציה ומשתמש</p>
            <p>${new Date().toLocaleDateString('he-IL')}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${report.summary.total_business_flows}</div>
                <div class="stat-label">תהליכים עסקיים</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.total_user_interactions}</div>
                <div class="stat-label">אינטראקציות משתמש</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.total_validation_rules}</div>
                <div class="stat-label">כללי ולידציה</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.total_edge_cases}</div>
                <div class="stat-label">מקרי קצה</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.total_cross_system_scenarios}</div>
                <div class="stat-label">תרחישים רב-מערכתיים</div>
            </div>
        </div>

        <div class="section">
            <h2>🔄 תהליכים עסקיים מפורטים</h2>
            ${Object.entries(report.business_flows).map(([key, flow]) => `
                <div class="flow-item">
                    <h3>${flow.name}</h3>
                    <p><strong>טריגרים להתחלה:</strong> ${flow.startTriggers.join(', ')}</p>
                    
                    <button class="collapsible" onclick="toggleContent(this)">סוגי משתמשים (${flow.userTypes.length})</button>
                    <div class="content">
                        ${flow.userTypes.map(userType => `
                            <div class="step-item">
                                <h4>משתמש: ${userType.type}</h4>
                                <p><strong>וריאציות:</strong> ${userType.variations.join(', ')}</p>
                                <p><strong>נתונים נדרשים:</strong> ${userType.requiredData.join(', ')}</p>
                                <p><strong>נתונים אופציונליים:</strong> ${userType.optionalData.join(', ')}</p>
                            </div>
                        `).join('')}
                    </div>

                    <button class="collapsible" onclick="toggleContent(this)">שלבי התהליך (${flow.steps.length})</button>
                    <div class="content">
                        ${flow.steps.map(step => `
                            <div class="step-item">
                                <h4>שלב ${step.step}: ${step.name}</h4>
                                
                                <h5>תנאים:</h5>
                                <ul>
                                    ${step.conditions.map(condition => `<li>${condition}</li>`).join('')}
                                </ul>
                                
                                <h5>ולידציות:</h5>
                                <ul>
                                    ${step.validations.map(validation => `<li class="validation-rule">${validation}</li>`).join('')}
                                </ul>
                                
                                ${step.subScenarios ? `
                                    <h5>תת-תרחישים:</h5>
                                    ${step.subScenarios.map(subScenario => `
                                        <div class="test-case">
                                            <strong>${subScenario.scenario}:</strong>
                                            <ul>
                                                ${subScenario.testCases.map(testCase => `<li>${testCase}</li>`).join('')}
                                            </ul>
                                        </div>
                                    `).join('')}
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>

                    <p><strong>נקודות אינטגרציה:</strong> ${flow.integrationPoints.join(', ')}</p>
                    <p><strong>תרחישי שגיאה:</strong> ${flow.errorScenarios.join(', ')}</p>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>👥 מטריצת אינטראקציות משתמשים</h2>
            ${Object.entries(report.user_interactions).map(([key, interactions]) => `
                ${interactions.map(interaction => `
                    <div class="flow-item">
                        <h3>${interaction.scenario}</h3>
                        <p><strong>משתמשים מעורבים:</strong> ${interaction.users.map(user => `<span class="user-role">${user}</span>`).join('')}</p>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>משתמש</th>
                                    <th>פעולה</th>
                                    <th>תנאים/ולידציות</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${interaction.flow.map(step => `
                                    <tr>
                                        <td><span class="user-role">${step.user}</span></td>
                                        <td>${step.action}</td>
                                        <td>${(step.validations || step.conditions || []).join(', ')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `).join('')}
            `).join('')}
        </div>

        <div class="section">
            <h2>✅ מטריצת ולידציה מפורטת</h2>
            ${Object.entries(report.validation_matrix.all_validations || {}).map(([key, validation]) => `
                <div class="flow-item">
                    <h3>ולידציה: ${validation.field}</h3>
                    
                    <h4>כללים:</h4>
                    ${validation.rules.map(rule => `
                        <div class="validation-rule">
                            <strong>${rule.rule}:</strong> ${JSON.stringify(rule, null, 2).replace(/[{}]/g, '').replace(/"/g, '')}
                        </div>
                    `).join('')}
                    
                    <h4>מקרי בדיקה:</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>קלט</th>
                                <th>תוצאה צפויה</th>
                                <th>קטגוריה</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${validation.test_cases.map(testCase => `
                                <tr>
                                    <td>${testCase.input}</td>
                                    <td>${testCase.expected}</td>
                                    <td>${testCase.category}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>🔍 מקרי קצה</h2>
            ${report.edge_cases.map(category => `
                <div class="flow-item">
                    <h3>${category.category}</h3>
                    ${category.cases.map(edgeCase => `
                        <div class="edge-case">${edgeCase}</div>
                    `).join('')}
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>🔗 תרחישים רב-מערכתיים</h2>
            ${report.cross_system_scenarios.map(scenario => `
                <div class="flow-item">
                    <h3>${scenario.name}</h3>
                    <p><strong>מערכות מעורבות:</strong> ${scenario.systems.join(', ')}</p>
                    <p><strong>תרחיש:</strong> ${scenario.scenario}</p>
                    
                    <h4>נקודות כשל אפשריות:</h4>
                    ${scenario.failure_points.map(point => `
                        <div class="edge-case">${point}</div>
                    `).join('')}
                    
                    ${scenario.recovery_mechanisms ? `
                        <h4>מנגנוני התאוששות:</h4>
                        ${scenario.recovery_mechanisms.map(mechanism => `
                            <div class="validation-rule">${mechanism}</div>
                        `).join('')}
                    ` : ''}
                    
                    ${scenario.race_conditions ? `
                        <h4>תנאי מירוץ:</h4>
                        ${scenario.race_conditions.map(condition => `
                            <div class="edge-case">${condition}</div>
                        `).join('')}
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>📋 תוכנית ביצוע בדיקות</h2>
            ${Object.entries(report.test_execution_plan).map(([phase, plan]) => `
                <div class="flow-item priority-${plan.priority}">
                    <h3>${phase.replace(/_/g, ' ').toUpperCase()}</h3>
                    <p><strong>תיאור:</strong> ${plan.description}</p>
                    <p><strong>מספר בדיקות משוער:</strong> ${plan.estimated_tests}</p>
                    <p><strong>עדיפות:</strong> ${plan.priority}</p>
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

        fs.writeFileSync('./comprehensive-test-report.html', html);
        console.log('📄 Comprehensive HTML report saved to comprehensive-test-report.html');
    }
}

// Run the comprehensive test generation
const generator = new ComprehensiveTestGenerator();
generator.generateComprehensiveTests().catch(console.error); 