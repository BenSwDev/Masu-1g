# GPT OPERATOR TEST PROMPTS - MASU BOOKING SYSTEM

## GENERIC VARIABLES (Edit these for all prompts)
```
BASE_URL = "http://localhost:3000"
ADMIN_EMAIL = "admin@masu.com"
ADMIN_PASSWORD = "admin123"
TEST_GUEST_NAME = "ישראל ישראלי"
TEST_GUEST_EMAIL = "test@guest.com"
TEST_GUEST_PHONE = "0501234567"
TEST_USER_EMAIL = "user@test.com"
TEST_USER_PASSWORD = "user123"
TREATMENT_FIXED_PRICE = "עיסוי רקמות עמוקות"
TREATMENT_DURATION_BASED = "עיסוי שוודי"
SUBSCRIPTION_PACKAGE = "חבילת 5 טיפולים"
VOUCHER_AMOUNT = "200"
RECIPIENT_NAME = "דנה כהן"
RECIPIENT_PHONE = "0507654321"
COUPON_CODE = "SAVE20"
CARD_NUMBER = "4111111111111111"
CARD_EXPIRY = "12/25"
CARD_CVV = "123"
```

---

## PROMPT 1: GUEST BOOKING - FIXED PRICE TREATMENT
```
Test Scenario: Guest booking with fixed price treatment

Variables:
- Base URL: ${BASE_URL}
- Guest Name: ${TEST_GUEST_NAME}
- Guest Email: ${TEST_GUEST_EMAIL}
- Guest Phone: ${TEST_GUEST_PHONE}
- Treatment: ${TREATMENT_FIXED_PRICE}
- Card: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}

Test Steps:
1. Navigate to ${BASE_URL}/bookings/treatment
2. Select treatment: ${TREATMENT_FIXED_PRICE}
3. Verify fixed price is displayed
4. Select date: tomorrow at 10:00 AM
5. Add new address: "רחוב הרצל 1, תל אביב"
6. Select gender preference: "any"
7. Fill guest info: ${TEST_GUEST_NAME}, ${TEST_GUEST_EMAIL}, ${TEST_GUEST_PHONE}
8. Enter birth date: "01/01/1990"
9. Select gender: "male"
10. Proceed to payment
11. Enter card details: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}
12. Click payment
13. Simulate successful payment
14. Verify confirmation page shows booking details
15. Verify booking created in database
16. Verify SMS sent to professionals
17. Verify confirmation email sent to guest

Expected Results:
- Booking status: "in_process"
- Guest user created
- Payment status: "paid"
- Suitable professionals found and notified
```

---

## PROMPT 2: GUEST BOOKING - DURATION BASED TREATMENT
```
Test Scenario: Guest booking with duration-based treatment

Variables:
- Base URL: ${BASE_URL}
- Guest Name: ${TEST_GUEST_NAME}
- Guest Email: ${TEST_GUEST_EMAIL}
- Guest Phone: ${TEST_GUEST_PHONE}
- Treatment: ${TREATMENT_DURATION_BASED}
- Card: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}

Test Steps:
1. Navigate to ${BASE_URL}/bookings/treatment
2. Select treatment: ${TREATMENT_DURATION_BASED}
3. Select duration: "60 minutes"
4. Verify duration-based price is displayed
5. Select date: tomorrow at 2:00 PM
6. Add new address: "רחוב דיזנגוף 10, תל אביב"
7. Select gender preference: "female"
8. Fill guest info: ${TEST_GUEST_NAME}, ${TEST_GUEST_EMAIL}, ${TEST_GUEST_PHONE}
9. Enter birth date: "15/05/1985"
10. Select gender: "female"
11. Proceed to payment
12. Enter card details: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}
13. Click payment
14. Simulate successful payment
15. Verify confirmation page
16. Verify booking created with selected duration
17. Verify price matches duration selection

Expected Results:
- Booking includes selectedDurationId
- Price matches 60-minute duration
- All other standard booking flow completed
```

---

## PROMPT 3: GUEST BOOKING - WITH COUPON
```
Test Scenario: Guest booking with coupon code

Variables:
- Base URL: ${BASE_URL}
- Guest Name: ${TEST_GUEST_NAME}
- Guest Email: ${TEST_GUEST_EMAIL}
- Guest Phone: ${TEST_GUEST_PHONE}
- Treatment: ${TREATMENT_FIXED_PRICE}
- Coupon: ${COUPON_CODE}
- Card: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}

Test Steps:
1. Navigate to ${BASE_URL}/bookings/treatment
2. Select treatment: ${TREATMENT_FIXED_PRICE}
3. Select date: tomorrow at 3:00 PM
4. Add address: "רחוב אלנבי 5, תל אביב"
5. Select gender preference: "male"
6. Fill guest info: ${TEST_GUEST_NAME}, ${TEST_GUEST_EMAIL}, ${TEST_GUEST_PHONE}
7. Enter birth date: "20/12/1992"
8. Select gender: "male"
9. Apply coupon: ${COUPON_CODE}
10. Verify discount applied
11. Proceed to payment with discounted price
12. Enter card details: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}
13. Click payment
14. Simulate successful payment
15. Verify coupon usage recorded
16. Verify final price includes discount

Expected Results:
- Coupon discount applied correctly
- Coupon usage count incremented
- Final booking price reflects discount
```

---

## PROMPT 4: GUEST BOOKING - PAYMENT FAILURE
```
Test Scenario: Guest booking with payment failure

Variables:
- Base URL: ${BASE_URL}
- Guest Name: ${TEST_GUEST_NAME}
- Guest Email: ${TEST_GUEST_EMAIL}
- Guest Phone: ${TEST_GUEST_PHONE}
- Treatment: ${TREATMENT_FIXED_PRICE}
- Card: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}

Test Steps:
1. Navigate to ${BASE_URL}/bookings/treatment
2. Select treatment: ${TREATMENT_FIXED_PRICE}
3. Select date: tomorrow at 4:00 PM
4. Add address: "רחוב בן יהודה 8, תל אביב"
5. Select gender preference: "any"
6. Fill guest info: ${TEST_GUEST_NAME}, ${TEST_GUEST_EMAIL}, ${TEST_GUEST_PHONE}
7. Enter birth date: "10/08/1988"
8. Select gender: "female"
9. Proceed to payment
10. Enter card details: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}
11. Click payment
12. Simulate payment failure
13. Verify error message displayed
14. Click "Try Again"
15. Simulate successful payment on retry
16. Verify booking completed

Expected Results:
- Payment failure handled gracefully
- Retry mechanism works
- Booking completed after successful retry
```

---

## PROMPT 5: USER BOOKING - WITH SUBSCRIPTION
```
Test Scenario: Authenticated user booking using subscription

Variables:
- Base URL: ${BASE_URL}
- User Email: ${TEST_USER_EMAIL}
- User Password: ${TEST_USER_PASSWORD}
- Treatment: ${TREATMENT_FIXED_PRICE}

Test Steps:
1. Navigate to ${BASE_URL}/auth/login
2. Login with: ${TEST_USER_EMAIL}, ${TEST_USER_PASSWORD}
3. Navigate to ${BASE_URL}/bookings/treatment
4. Select treatment: ${TREATMENT_FIXED_PRICE}
5. Select date: tomorrow at 11:00 AM
6. Select saved address from dropdown
7. Select gender preference: "female"
8. Choose to use subscription
9. Verify subscription discount (100%) applied
10. Proceed to payment (no payment required)
11. Confirm booking
12. Verify subscription quantity decremented
13. Verify booking status: "in_process"

Expected Results:
- Subscription used successfully
- Remaining quantity reduced by 1
- No payment required
- Booking created with subscription reference
```

---

## PROMPT 6: USER BOOKING - WITH SAVED PAYMENT METHOD
```
Test Scenario: Authenticated user booking with saved payment method

Variables:
- Base URL: ${BASE_URL}
- User Email: ${TEST_USER_EMAIL}
- User Password: ${TEST_USER_PASSWORD}
- Treatment: ${TREATMENT_DURATION_BASED}

Test Steps:
1. Navigate to ${BASE_URL}/auth/login
2. Login with: ${TEST_USER_EMAIL}, ${TEST_USER_PASSWORD}
3. Navigate to ${BASE_URL}/bookings/treatment
4. Select treatment: ${TREATMENT_DURATION_BASED}
5. Select duration: "90 minutes"
6. Select date: tomorrow at 1:00 PM
7. Select saved address
8. Select gender preference: "male"
9. Choose not to use subscription
10. Select saved payment method
11. Proceed to payment
12. Confirm payment with saved card
13. Simulate successful payment
14. Verify booking completed

Expected Results:
- Saved payment method used
- Booking created successfully
- User preferences maintained
```

---

## PROMPT 7: GUEST VOUCHER PURCHASE - MONETARY
```
Test Scenario: Guest purchasing monetary voucher

Variables:
- Base URL: ${BASE_URL}
- Guest Name: ${TEST_GUEST_NAME}
- Guest Email: ${TEST_GUEST_EMAIL}
- Guest Phone: ${TEST_GUEST_PHONE}
- Amount: ${VOUCHER_AMOUNT}
- Card: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}

Test Steps:
1. Navigate to ${BASE_URL}/purchase/gift-voucher
2. Select voucher type: "monetary"
3. Enter amount: ${VOUCHER_AMOUNT}
4. Verify amount is above minimum (150)
5. Select "for myself" (not a gift)
6. Fill guest info: ${TEST_GUEST_NAME}, ${TEST_GUEST_EMAIL}, ${TEST_GUEST_PHONE}
7. Proceed to payment
8. Enter card details: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}
9. Click payment
10. Simulate successful payment
11. Verify voucher created with unique code
12. Verify confirmation email with redemption code
13. Verify voucher status: "active"

Expected Results:
- Monetary voucher created
- Unique redemption code generated
- Remaining amount equals purchase amount
- Guest info stored in voucher
```

---

## PROMPT 8: GUEST VOUCHER PURCHASE - TREATMENT
```
Test Scenario: Guest purchasing treatment voucher

Variables:
- Base URL: ${BASE_URL}
- Guest Name: ${TEST_GUEST_NAME}
- Guest Email: ${TEST_GUEST_EMAIL}
- Guest Phone: ${TEST_GUEST_PHONE}
- Treatment: ${TREATMENT_FIXED_PRICE}
- Card: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}

Test Steps:
1. Navigate to ${BASE_URL}/purchase/gift-voucher
2. Select voucher type: "treatment"
3. Select category: "massages"
4. Select treatment: ${TREATMENT_FIXED_PRICE}
5. Verify treatment price displayed
6. Select "for myself" (not a gift)
7. Fill guest info: ${TEST_GUEST_NAME}, ${TEST_GUEST_EMAIL}, ${TEST_GUEST_PHONE}
8. Proceed to payment
9. Enter card details: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}
10. Click payment
11. Simulate successful payment
12. Verify treatment voucher created
13. Verify voucher linked to specific treatment

Expected Results:
- Treatment voucher created
- TreatmentId stored in voucher
- Voucher amount equals treatment price
- Redemption code generated
```

---

## PROMPT 9: GUEST VOUCHER PURCHASE - GIFT
```
Test Scenario: Guest purchasing voucher as gift

Variables:
- Base URL: ${BASE_URL}
- Guest Name: ${TEST_GUEST_NAME}
- Guest Email: ${TEST_GUEST_EMAIL}
- Guest Phone: ${TEST_GUEST_PHONE}
- Amount: ${VOUCHER_AMOUNT}
- Recipient: ${RECIPIENT_NAME}
- Recipient Phone: ${RECIPIENT_PHONE}
- Card: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}

Test Steps:
1. Navigate to ${BASE_URL}/purchase/gift-voucher
2. Select voucher type: "monetary"
3. Enter amount: ${VOUCHER_AMOUNT}
4. Select "as a gift"
5. Fill recipient details: ${RECIPIENT_NAME}, ${RECIPIENT_PHONE}
6. Enter greeting message: "מתנה מיוחדת בשבילך!"
7. Select send date: "immediate"
8. Fill guest info: ${TEST_GUEST_NAME}, ${TEST_GUEST_EMAIL}, ${TEST_GUEST_PHONE}
9. Proceed to payment
10. Enter card details: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}
11. Click payment
12. Simulate successful payment
13. Verify gift voucher sent to recipient
14. Verify purchaser receives confirmation

Expected Results:
- Gift voucher created with recipient details
- SMS sent to recipient immediately
- Greeting message included
- Voucher status: "sent"
```

---

## PROMPT 10: USER VOUCHER PURCHASE - WITH SAVED PAYMENT
```
Test Scenario: Authenticated user purchasing voucher with saved payment

Variables:
- Base URL: ${BASE_URL}
- User Email: ${TEST_USER_EMAIL}
- User Password: ${TEST_USER_PASSWORD}
- Treatment: ${TREATMENT_DURATION_BASED}

Test Steps:
1. Navigate to ${BASE_URL}/auth/login
2. Login with: ${TEST_USER_EMAIL}, ${TEST_USER_PASSWORD}
3. Navigate to ${BASE_URL}/purchase/gift-voucher
4. Select voucher type: "treatment"
5. Select category: "massages"
6. Select treatment: ${TREATMENT_DURATION_BASED}
7. Select duration: "60 minutes"
8. Select "for myself"
9. Select saved payment method
10. Proceed to payment
11. Confirm payment
12. Simulate successful payment
13. Verify voucher added to user's voucher list
14. Verify voucher accessible in dashboard

Expected Results:
- Voucher created and linked to user
- Saved payment method used
- Voucher appears in user dashboard
- User can manage voucher
```

---

## PROMPT 11: GUEST SUBSCRIPTION PURCHASE
```
Test Scenario: Guest purchasing subscription

Variables:
- Base URL: ${BASE_URL}
- Guest Name: ${TEST_GUEST_NAME}
- Guest Email: ${TEST_GUEST_EMAIL}
- Guest Phone: ${TEST_GUEST_PHONE}
- Subscription: ${SUBSCRIPTION_PACKAGE}
- Treatment: ${TREATMENT_FIXED_PRICE}
- Card: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}

Test Steps:
1. Navigate to ${BASE_URL}/purchase/subscription
2. Select subscription: ${SUBSCRIPTION_PACKAGE}
3. Select category: "massages"
4. Select treatment: ${TREATMENT_FIXED_PRICE}
5. Verify total price calculation (quantity × treatment price)
6. Fill guest info: ${TEST_GUEST_NAME}, ${TEST_GUEST_EMAIL}, ${TEST_GUEST_PHONE}
7. Proceed to payment
8. Enter card details: ${CARD_NUMBER}, ${CARD_EXPIRY}, ${CARD_CVV}
9. Click payment
10. Simulate successful payment
11. Verify subscription created with redemption code
12. Verify email sent with subscription details
13. Verify subscription status: "active"

Expected Results:
- Subscription created for guest
- Total quantity includes bonus
- Redemption code generated
- Guest info stored in subscription
```

---

## PROMPT 12: USER SUBSCRIPTION PURCHASE
```
Test Scenario: Authenticated user purchasing subscription

Variables:
- Base URL: ${BASE_URL}
- User Email: ${TEST_USER_EMAIL}
- User Password: ${TEST_USER_PASSWORD}
- Subscription: ${SUBSCRIPTION_PACKAGE}
- Treatment: ${TREATMENT_DURATION_BASED}

Test Steps:
1. Navigate to ${BASE_URL}/auth/login
2. Login with: ${TEST_USER_EMAIL}, ${TEST_USER_PASSWORD}
3. Navigate to ${BASE_URL}/purchase/subscription
4. Select subscription: ${SUBSCRIPTION_PACKAGE}
5. Select category: "facial_treatments"
6. Select treatment: ${TREATMENT_DURATION_BASED}
7. Select duration: "45 minutes"
8. Select saved payment method
9. Proceed to payment
10. Confirm payment
11. Simulate successful payment
12. Verify subscription added to user account
13. Verify subscription available for booking use
14. Navigate to booking page and verify subscription option

Expected Results:
- Subscription linked to user account
- Available in user's subscription dashboard
- Can be used for future bookings
- Remaining quantity tracked properly
```

---

## EXECUTION INSTRUCTIONS FOR GPT OPERATOR:

1. **Setup Phase**: Ensure test environment is running and database is clean
2. **Variable Substitution**: Replace all ${VARIABLE} placeholders with actual values
3. **Sequential Execution**: Run each prompt as a separate test case
4. **Result Verification**: Check both UI feedback and database state
5. **Error Handling**: Document any failures with screenshots and logs
6. **Cleanup**: Reset test data between major test suites

**Run each prompt independently and report:**
- ✅ PASS: All steps completed successfully
- ❌ FAIL: Step failed with details
- ⚠️ PARTIAL: Some steps passed, others failed 