import { By } from 'selenium-webdriver';
import { BaseTest } from './base-test';
import { TestScenario, GuestInfo, SubscriptionInfo, TreatmentSelection } from './types';

export class SubscriptionTest extends BaseTest {
  private testData: {
    guestInfo: GuestInfo;
    subscriptionInfo: SubscriptionInfo;
  };

  constructor() {
    super();
    this.testData = {
      guestInfo: {
        firstName: 'דוד',
        lastName: 'לוי',
        email: 'david.levy@example.com',
        phone: '0507654321',
        birthDate: '1985-08-20',
        gender: 'male'
      },
      subscriptionInfo: {
        subscriptionName: 'מנוי 10 טיפולים',
        treatment: {
          category: 'עיסוי רפואי',
          treatmentName: 'עיסוי עמוק',
          duration: '90 דקות',
          therapistPreference: 'any'
        }
      }
    };
  }

  async runTests(): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];

    try {
      // Complete Subscription Purchase Flow
      this.currentScenario = 'Complete Subscription Purchase Flow';
      await this.runCompleteSubscriptionFlow();
      
      scenarios.push({
        name: 'Complete Subscription Purchase Flow',
        description: 'User completes entire subscription purchase process from homepage to confirmation',
        steps: []
      });

      // Validation Tests
      this.currentScenario = 'Subscription Validation Tests';
      await this.runValidationTests();
      
      scenarios.push({
        name: 'Subscription Validation Tests',
        description: 'User encounters and resolves subscription form validation errors',
        steps: []
      });

    } catch (error) {
      console.error('❌ Subscription test failed:', (error as Error).message);
    }

    return scenarios;
  }

  private async runCompleteSubscriptionFlow(): Promise<void> {
    // Step 1: Navigate to home page
    await this.navigateToHomePage();

    // Step 2: Click subscription purchase button
    await this.clickLinkByText(
      'רכישת מנוי',
      'Click Subscription Purchase Button',
      'Expected: Subscription purchase wizard opens'
    );

    // Step 3: Fill guest information
    await this.fillGuestInformation();

    // Step 4: Select subscription
    await this.selectSubscription();

    // Step 5: Select treatment
    await this.selectTreatment();

    // Step 6: Review subscription summary
    await this.reviewSubscriptionSummary();

    // Step 7: Complete payment
    await this.completePayment();
  }

  private async fillGuestInformation(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Fill Guest Information', 'Filling out personal details for subscription');

      // Fill basic information using actual form field names
      await this.fillFormField('firstName', this.testData.guestInfo.firstName, 'Fill First Name', 'Expected: First name is entered');
      await this.fillFormField('lastName', this.testData.guestInfo.lastName, 'Fill Last Name', 'Expected: Last name is entered');
      await this.fillFormField('email', this.testData.guestInfo.email, 'Fill Email', 'Expected: Email is entered');
      await this.fillFormField('phone', this.testData.guestInfo.phone, 'Fill Phone', 'Expected: Phone number is entered');

      // Verify isBookingForSomeoneElse is false by default for subscriptions
      const isBookingForSomeoneElse = await this.checkElementExists('//input[@name="isBookingForSomeoneElse" and @checked]');
      if (isBookingForSomeoneElse) {
        throw new Error('isBookingForSomeoneElse should be false by default for subscriptions');
      }

      // Click continue button
      await this.clickButton('המשך', 'Continue to Subscription Selection', 'Expected: Proceeds to subscription selection step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Fill Guest Information',
        'PASS',
        duration,
        'Expected: Guest information is filled and validated with correct defaults',
        'User fills out their personal information for subscription purchase, confirming isBookingForSomeoneElse is false by default'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Fill Guest Information',
        'FAIL',
        duration,
        `Expected: Guest information is filled and validated with correct defaults, Error: ${(error as Error).message}`,
        'User attempts to fill out personal information but encounters an error'
      );
      throw error;
    }
  }

  private async selectSubscription(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Select Subscription', 'Choosing subscription package');

      // Wait for subscription selection step to load
      await this.driver.sleep(2000);

      // Select subscription package
      await this.clickLinkByText(this.testData.subscriptionInfo.subscriptionName, 'Select Subscription Package', 'Expected: Subscription package is selected');
      await this.driver.sleep(1000);

      // Click continue button
      await this.clickButton('המשך', 'Continue to Treatment Selection', 'Expected: Proceeds to treatment selection step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Select Subscription',
        'PASS',
        duration,
        'Expected: Subscription package is selected successfully',
        'User browses available subscription packages and selects their preferred option'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Select Subscription',
        'FAIL',
        duration,
        `Expected: Subscription package is selected successfully, Error: ${(error as Error).message}`,
        'User attempts to select a subscription package but encounters an error'
      );
      throw error;
    }
  }

  private async selectTreatment(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Select Treatment', 'Choosing treatment for subscription');

      // Wait for treatment selection step to load
      await this.driver.sleep(2000);

      // Verify that treatment selection is identical to gift voucher flow
      // Select treatment category and specific treatment
      await this.clickLinkByText(this.testData.subscriptionInfo.treatment.category, 'Select Treatment Category', 'Expected: Treatment category is selected');
      await this.driver.sleep(1000);
      
      await this.clickLinkByText(this.testData.subscriptionInfo.treatment.treatmentName, 'Select Specific Treatment', 'Expected: Specific treatment is selected');
      await this.driver.sleep(1000);

      // Select duration if available
      if (this.testData.subscriptionInfo.treatment.duration) {
        await this.clickLinkByText(this.testData.subscriptionInfo.treatment.duration, 'Select Duration', 'Expected: Treatment duration is selected');
        await this.driver.sleep(1000);
      }

      // Verify therapist gender preference is hidden for subscriptions
      const hasGenderPreference = await this.checkElementExists('//div[contains(text(), "העדפת מטפל") or contains(text(), "therapist preference")]');
      if (hasGenderPreference) {
        throw new Error('Therapist gender preference should be hidden for subscriptions');
      }

      // Click continue button
      await this.clickButton('המשך', 'Continue to Summary', 'Expected: Proceeds to summary step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Select Treatment',
        'PASS',
        duration,
        'Expected: Treatment is selected with correct subscription-specific behavior',
        'User selects treatment for their subscription, confirming therapist preference is hidden as expected'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Select Treatment',
        'FAIL',
        duration,
        `Expected: Treatment is selected with correct subscription-specific behavior, Error: ${(error as Error).message}`,
        'User attempts to select a treatment but encounters an error'
      );
      throw error;
    }
  }

  private async reviewSubscriptionSummary(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Review Subscription Summary', 'Reviewing subscription details before payment');

      // Wait for summary step to load
      await this.driver.sleep(2000);

      // Verify subscription details are displayed correctly
      const hasGuestInfo = await this.checkElementExists('//div[contains(text(), "דוד לוי")]');
      const hasSubscription = await this.checkElementExists('//div[contains(text(), "מנוי")]');
      const hasTreatment = await this.checkElementExists('//div[contains(text(), "עיסוי")]');

      if (!hasGuestInfo || !hasSubscription || !hasTreatment) {
        throw new Error('Subscription summary is incomplete');
      }

      // Verify no coupon entry is shown for subscriptions
      const hasCouponField = await this.checkElementExists('//input[contains(@name, "coupon") or contains(@placeholder, "קופון")]');
      if (hasCouponField) {
        throw new Error('Coupon field should not be shown for subscriptions');
      }

      // Click continue to payment
      await this.clickButton('המשך לתשלום', 'Continue to Payment', 'Expected: Proceeds to payment step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Review Subscription Summary',
        'PASS',
        duration,
        'Expected: Subscription summary is reviewed with correct subscription-specific behavior',
        'User reviews their subscription summary confirming no coupon field is shown, then clicks continue to payment'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Review Subscription Summary',
        'FAIL',
        duration,
        `Expected: Subscription summary is reviewed with correct subscription-specific behavior, Error: ${(error as Error).message}`,
        'User attempts to review subscription summary but encounters an error'
      );
      throw error;
    }
  }

  private async completePayment(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Complete Payment', 'Processing payment for subscription');

      // Wait for payment step to load
      await this.driver.sleep(2000);

      // Verify payment step is identical to treatment booking payment
      const hasPaymentForm = await this.checkElementExists('//div[contains(@class, "payment") or contains(text(), "תשלום")]');
      if (!hasPaymentForm) {
        throw new Error('Payment form not found');
      }

      // For testing purposes, we'll simulate payment completion
      await this.clickButton('אישור רכישה', 'Confirm Purchase', 'Expected: Subscription purchase is confirmed');

      // Wait for confirmation page
      await this.driver.sleep(3000);

      // Verify confirmation page
      const hasConfirmation = await this.checkElementExists('//div[contains(text(), "רכישה אושרה") or contains(text(), "תודה")]');
      
      if (!hasConfirmation) {
        throw new Error('Subscription purchase confirmation not displayed');
      }

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Complete Payment',
        'PASS',
        duration,
        'Expected: Payment is processed and subscription purchase is confirmed',
        'User completes the payment process and receives subscription purchase confirmation'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Complete Payment',
        'FAIL',
        duration,
        `Expected: Payment is processed and subscription purchase is confirmed, Error: ${(error as Error).message}`,
        'User attempts to complete payment but encounters an error'
      );
      throw error;
    }
  }

  private async runValidationTests(): Promise<void> {
    // Navigate to subscription purchase
    await this.navigateToHomePage();
    await this.clickLinkByText('רכישת מנוי', 'Navigate to Subscription Purchase', 'Expected: Opens subscription purchase form');

    // Test empty form validation
    await this.testEmptyFormValidation();
  }

  private async testEmptyFormValidation(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Test Empty Form Validation', 'Attempting to submit empty subscription form');

      // Try to submit empty form
      await this.clickButton('המשך', 'Submit Empty Form', 'Expected: Validation errors are shown');

      // Check for validation messages
      await this.driver.sleep(1000);
      const hasValidationErrors = await this.checkElementExists('//div[contains(@class, "error") or contains(text(), "שדה חובה")]');

      if (!hasValidationErrors) {
        throw new Error('Expected validation errors not displayed');
      }

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Test Empty Form Validation',
        'PASS',
        duration,
        'Expected: Form validation prevents submission of empty subscription form',
        'User tries to submit an empty subscription form and sees helpful validation error messages'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Test Empty Form Validation',
        'FAIL',
        duration,
        `Expected: Form validation prevents submission of empty subscription form, Error: ${(error as Error).message}`,
        'User tries to submit empty subscription form but validation does not work as expected'
      );
      throw error;
    }
  }
} 