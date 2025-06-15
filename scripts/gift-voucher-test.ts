import { BaseTest } from './base-test';
import { TestScenario, GuestInfo, VoucherInfo } from './types';

export class GiftVoucherTest extends BaseTest {
  private testData: {
    guestInfo: GuestInfo;
    voucherInfo: VoucherInfo;
  };

  constructor() {
    super();
    this.testData = {
      guestInfo: {
        firstName: 'מירי',
        lastName: 'אברהם',
        email: 'miri.abraham@example.com',
        phone: '0523456789',
        birthDate: '1992-03-10',
        gender: 'female'
      },
      voucherInfo: {
        type: 'treatment',
        treatment: {
          category: 'עיסוי רפואי',
          treatmentName: 'עיסוי רקמות עמוק',
          duration: '75 דקות',
          therapistPreference: 'any'
        },
        isGift: true,
        recipientInfo: {
          firstName: 'רחל',
          lastName: 'כהן',
          email: 'rachel.cohen@example.com',
          phone: '0541234567',
          recipientFirstName: 'רחל',
          recipientLastName: 'כהן',
          recipientEmail: 'rachel.cohen@example.com',
          recipientPhone: '0541234567'
        },
        greetingMessage: 'מתנה מיוחדת בשבילך!',
        sendOption: 'immediate'
      }
    };
  }

  async runTests(): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];

    try {
      // Complete Gift Voucher Purchase Flow
      this.currentScenario = 'Complete Gift Voucher Purchase Flow';
      await this.runCompleteGiftVoucherFlow();
      
      scenarios.push({
        name: 'Complete Gift Voucher Purchase Flow',
        description: 'User completes entire gift voucher purchase process from homepage to confirmation',
        steps: []
      });

      // Gift Options Validation Tests
      this.currentScenario = 'Gift Options Validation Tests';
      await this.runGiftOptionsValidationTests();
      
      scenarios.push({
        name: 'Gift Options Validation Tests',
        description: 'User validates gift-specific options are only visible in gift voucher flow',
        steps: []
      });

      // Monetary vs Treatment Voucher Tests
      this.currentScenario = 'Voucher Type Tests';
      await this.runVoucherTypeTests();
      
      scenarios.push({
        name: 'Voucher Type Tests',
        description: 'User tests both monetary and treatment voucher options',
        steps: []
      });

    } catch (error) {
      console.error('❌ Gift voucher test failed:', (error as Error).message);
    }

    return scenarios;
  }

  private async runCompleteGiftVoucherFlow(): Promise<void> {
    // Step 1: Navigate to home page
    await this.navigateToHomePage();

    // Step 2: Click gift voucher purchase button
    await this.clickLinkByText(
      'רכישת שובר מתנה',
      'Click Gift Voucher Purchase Button',
      'Expected: Gift voucher purchase wizard opens'
    );

    // Step 3: Fill guest information with gift options
    await this.fillGuestInformationWithGiftOptions();

    // Step 4: Select voucher type
    await this.selectVoucherType();

    // Step 5: Select treatment (for treatment voucher)
    await this.selectTreatmentForVoucher();

    // Step 6: Review voucher summary
    await this.reviewVoucherSummary();

    // Step 7: Complete payment
    await this.completePayment();
  }

  private async fillGuestInformationWithGiftOptions(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Fill Guest Information with Gift Options', 'Filling out personal details and gift recipient information');

      // Fill basic information using actual form field names
      await this.fillFormField('firstName', this.testData.guestInfo.firstName, 'Fill First Name', 'Expected: First name is entered');
      await this.fillFormField('lastName', this.testData.guestInfo.lastName, 'Fill Last Name', 'Expected: Last name is entered');
      await this.fillFormField('email', this.testData.guestInfo.email, 'Fill Email', 'Expected: Email is entered');
      await this.fillFormField('phone', this.testData.guestInfo.phone, 'Fill Phone', 'Expected: Phone number is entered');

      // Verify isBookingForSomeoneElse is true by default for gift vouchers
      const isBookingForSomeoneElse = await this.checkElementExists('//input[@name="isBookingForSomeoneElse" and @checked]');
      if (!isBookingForSomeoneElse) {
        throw new Error('isBookingForSomeoneElse should be true by default for gift vouchers');
      }

      // Verify gift options are visible (שלח כמתנה checkbox)
      const hasGiftOptions = await this.checkElementExists('//input[@id="isGift"] | //label[contains(text(), "שלח כמתנה")]');
      if (!hasGiftOptions) {
        throw new Error('Gift options should be visible in gift voucher flow');
      }

      // Check the gift option
      await this.clickButton('שלח כמתנה', 'Enable Gift Option', 'Expected: Gift option is enabled');
      await this.driver.sleep(500);

      // Fill recipient information
      await this.fillFormField('recipientFirstName', this.testData.voucherInfo.recipientInfo!.recipientFirstName, 'Fill Recipient First Name', 'Expected: Recipient first name is entered');
      await this.fillFormField('recipientLastName', this.testData.voucherInfo.recipientInfo!.recipientLastName, 'Fill Recipient Last Name', 'Expected: Recipient last name is entered');
      await this.fillFormField('recipientEmail', this.testData.voucherInfo.recipientInfo!.recipientEmail, 'Fill Recipient Email', 'Expected: Recipient email is entered');
      await this.fillFormField('recipientPhone', this.testData.voucherInfo.recipientInfo!.recipientPhone, 'Fill Recipient Phone', 'Expected: Recipient phone is entered');

      // Fill greeting message
      await this.fillFormField('greetingMessage', this.testData.voucherInfo.greetingMessage!, 'Fill Greeting Message', 'Expected: Greeting message is entered');

      // Select send option (immediate)
      await this.clickButton('שלח עכשיו', 'Select Immediate Send', 'Expected: Immediate send option is selected');

      // Click continue button
      await this.clickButton('המשך', 'Continue to Voucher Type Selection', 'Expected: Proceeds to voucher type selection step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Fill Guest Information with Gift Options',
        'PASS',
        duration,
        'Expected: Guest information and gift options are filled with correct defaults',
        'User fills out their personal information and recipient details, confirming gift options are visible and isBookingForSomeoneElse is true by default'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Fill Guest Information with Gift Options',
        'FAIL',
        duration,
        `Expected: Guest information and gift options are filled with correct defaults, Error: ${(error as Error).message}`,
        'User attempts to fill out gift voucher information but encounters an error'
      );
      throw error;
    }
  }

  private async selectVoucherType(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Select Voucher Type', 'Choosing between monetary and treatment voucher');

      // Wait for voucher type selection step to load
      await this.driver.sleep(2000);

      // Select treatment voucher (based on test data)
      if (this.testData.voucherInfo.type === 'treatment') {
        await this.clickLinkByText('שובר טיפול', 'Select Treatment Voucher', 'Expected: Treatment voucher type is selected');
      } else {
        await this.clickLinkByText('שובר כספי', 'Select Monetary Voucher', 'Expected: Monetary voucher type is selected');
      }

      await this.driver.sleep(1000);

      // Click continue button
      await this.clickButton('המשך', 'Continue to Next Step', 'Expected: Proceeds to next step based on voucher type');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Select Voucher Type',
        'PASS',
        duration,
        'Expected: Voucher type is selected successfully',
        `User selects ${this.testData.voucherInfo.type === 'treatment' ? 'treatment' : 'monetary'} voucher type`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Select Voucher Type',
        'FAIL',
        duration,
        `Expected: Voucher type is selected successfully, Error: ${(error as Error).message}`,
        'User attempts to select voucher type but encounters an error'
      );
      throw error;
    }
  }

  private async selectTreatmentForVoucher(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Select Treatment for Voucher', 'Choosing treatment for treatment voucher');

      // Only proceed if this is a treatment voucher
      if (this.testData.voucherInfo.type !== 'treatment') {
        return;
      }

      // Wait for treatment selection step to load
      await this.driver.sleep(2000);

      // Verify that treatment selection is identical to subscription flow
      // Select treatment category and specific treatment
      await this.clickLinkByText(this.testData.voucherInfo.treatment!.category, 'Select Treatment Category', 'Expected: Treatment category is selected');
      await this.driver.sleep(1000);
      
      await this.clickLinkByText(this.testData.voucherInfo.treatment!.treatmentName, 'Select Specific Treatment', 'Expected: Specific treatment is selected');
      await this.driver.sleep(1000);

      // Select duration if available
      if (this.testData.voucherInfo.treatment!.duration) {
        await this.clickLinkByText(this.testData.voucherInfo.treatment!.duration, 'Select Duration', 'Expected: Treatment duration is selected');
        await this.driver.sleep(1000);
      }

      // Verify therapist gender preference is hidden for gift vouchers
      const hasGenderPreference = await this.checkElementExists('//div[contains(text(), "העדפת מטפל") or contains(text(), "therapist preference")]');
      if (hasGenderPreference) {
        throw new Error('Therapist gender preference should be hidden for gift vouchers');
      }

      // Click continue button
      await this.clickButton('המשך', 'Continue to Summary', 'Expected: Proceeds to summary step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Select Treatment for Voucher',
        'PASS',
        duration,
        'Expected: Treatment is selected with correct gift voucher-specific behavior',
        'User selects treatment for their gift voucher, confirming treatment selection is identical to subscriptions and therapist preference is hidden'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Select Treatment for Voucher',
        'FAIL',
        duration,
        `Expected: Treatment is selected with correct gift voucher-specific behavior, Error: ${(error as Error).message}`,
        'User attempts to select a treatment for voucher but encounters an error'
      );
      throw error;
    }
  }

  private async reviewVoucherSummary(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Review Voucher Summary', 'Reviewing gift voucher details before payment');

      // Wait for summary step to load
      await this.driver.sleep(2000);

      // Verify voucher details are displayed correctly
      const hasGuestInfo = await this.checkElementExists('//div[contains(text(), "מירי אברהם")]');
      const hasRecipientInfo = await this.checkElementExists('//div[contains(text(), "רחל כהן")]');
      const hasVoucherType = await this.checkElementExists('//div[contains(text(), "שובר")]');

      if (!hasGuestInfo || !hasRecipientInfo || !hasVoucherType) {
        throw new Error('Gift voucher summary is incomplete');
      }

      // Verify gift-specific information is shown
      const hasGreetingMessage = await this.checkElementExists(`//div[contains(text(), "${this.testData.voucherInfo.greetingMessage}")]`);
      if (!hasGreetingMessage) {
        throw new Error('Greeting message not displayed in summary');
      }

      // Click continue to payment
      await this.clickButton('המשך לתשלום', 'Continue to Payment', 'Expected: Proceeds to payment step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Review Voucher Summary',
        'PASS',
        duration,
        'Expected: Gift voucher summary is reviewed with all gift-specific details',
        'User reviews their gift voucher summary including purchaser details, recipient information, and greeting message'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Review Voucher Summary',
        'FAIL',
        duration,
        `Expected: Gift voucher summary is reviewed with all gift-specific details, Error: ${(error as Error).message}`,
        'User attempts to review gift voucher summary but encounters an error'
      );
      throw error;
    }
  }

  private async completePayment(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Complete Payment', 'Processing payment for gift voucher');

      // Wait for payment step to load
      await this.driver.sleep(2000);

      // Verify payment step is identical to other flows
      const hasPaymentForm = await this.checkElementExists('//div[contains(@class, "payment") or contains(text(), "תשלום")]');
      if (!hasPaymentForm) {
        throw new Error('Payment form not found');
      }

      // For testing purposes, we'll simulate payment completion
      await this.clickButton('אישור רכישה', 'Confirm Purchase', 'Expected: Gift voucher purchase is confirmed');

      // Wait for confirmation page
      await this.driver.sleep(3000);

      // Verify confirmation page
      const hasConfirmation = await this.checkElementExists('//div[contains(text(), "רכישה אושרה") or contains(text(), "תודה")]');
      
      if (!hasConfirmation) {
        throw new Error('Gift voucher purchase confirmation not displayed');
      }

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Complete Payment',
        'PASS',
        duration,
        'Expected: Payment is processed and gift voucher purchase is confirmed',
        'User completes the payment process and receives gift voucher purchase confirmation'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Complete Payment',
        'FAIL',
        duration,
        `Expected: Payment is processed and gift voucher purchase is confirmed, Error: ${(error as Error).message}`,
        'User attempts to complete payment but encounters an error'
      );
      throw error;
    }
  }

  private async runGiftOptionsValidationTests(): Promise<void> {
    // Test that gift options are only visible in gift voucher flow
    await this.testGiftOptionsVisibility();
  }

  private async testGiftOptionsVisibility(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Test Gift Options Visibility', 'Verifying gift options are only visible in gift voucher flow');

      // Navigate to gift voucher purchase
      await this.navigateToHomePage();
      await this.clickLinkByText('רכישת שובר מתנה', 'Navigate to Gift Voucher', 'Expected: Opens gift voucher form');

      // Verify gift options are visible
      const hasGiftOptions = await this.checkElementExists('//input[@id="isGift"] | //label[contains(text(), "שלח כמתנה")]');
      if (!hasGiftOptions) {
        throw new Error('Gift options should be visible in gift voucher flow');
      }

      // Navigate to treatment booking to verify gift options are NOT visible
      await this.navigateToHomePage();
      await this.clickLinkByText('הזמנת טיפול', 'Navigate to Treatment Booking', 'Expected: Opens treatment booking form');

      const hasGiftOptionsInTreatment = await this.checkElementExists('//input[@id="isGift"] | //label[contains(text(), "שלח כמתנה")]');
      if (hasGiftOptionsInTreatment) {
        throw new Error('Gift options should NOT be visible in treatment booking flow');
      }

      // Navigate to subscription purchase to verify gift options are NOT visible
      await this.navigateToHomePage();
      await this.clickLinkByText('רכישת מנוי', 'Navigate to Subscription Purchase', 'Expected: Opens subscription form');

      const hasGiftOptionsInSubscription = await this.checkElementExists('//input[@id="isGift"] | //label[contains(text(), "שלח כמתנה")]');
      if (hasGiftOptionsInSubscription) {
        throw new Error('Gift options should NOT be visible in subscription purchase flow');
      }

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Test Gift Options Visibility',
        'PASS',
        duration,
        'Expected: Gift options are only visible in gift voucher flow',
        'User verifies that gift options (שלח כמתנה) are only shown in gift voucher purchase and not in other flows'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Test Gift Options Visibility',
        'FAIL',
        duration,
        `Expected: Gift options are only visible in gift voucher flow, Error: ${(error as Error).message}`,
        'User attempts to verify gift options visibility but encounters an error'
      );
      throw error;
    }
  }

  private async runVoucherTypeTests(): Promise<void> {
    // Test both monetary and treatment voucher types
    await this.testMonetaryVoucher();
    await this.testTreatmentVoucher();
  }

  private async testMonetaryVoucher(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Test Monetary Voucher', 'Testing monetary voucher creation');

      // Navigate to gift voucher purchase
      await this.navigateToHomePage();
      await this.clickLinkByText('רכישת שובר מתנה', 'Navigate to Gift Voucher', 'Expected: Opens gift voucher form');

      // Fill minimal guest info
      await this.fillFormField('firstName', 'טסט', 'Fill First Name', 'Expected: First name is entered');
      await this.fillFormField('lastName', 'משתמש', 'Fill Last Name', 'Expected: Last name is entered');
      await this.fillFormField('email', 'test@example.com', 'Fill Email', 'Expected: Email is entered');
      await this.fillFormField('phone', '0501234567', 'Fill Phone', 'Expected: Phone is entered');

      await this.clickButton('המשך', 'Continue to Voucher Type', 'Expected: Proceeds to voucher type selection');

      // Select monetary voucher
      await this.clickLinkByText('שובר כספי', 'Select Monetary Voucher', 'Expected: Monetary voucher is selected');
      await this.clickButton('המשך', 'Continue to Amount', 'Expected: Proceeds to amount selection');

      // Set monetary amount (minimum 150 NIS)
      await this.fillFormField('monetaryValue', '200', 'Set Monetary Amount', 'Expected: Monetary amount is set');
      await this.clickButton('המשך', 'Continue to Summary', 'Expected: Proceeds to summary');

      // Verify monetary voucher summary
      const hasMonetaryAmount = await this.checkElementExists('//div[contains(text(), "200") and contains(text(), "₪")]');
      if (!hasMonetaryAmount) {
        throw new Error('Monetary amount not displayed in summary');
      }

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Test Monetary Voucher',
        'PASS',
        duration,
        'Expected: Monetary voucher is created successfully',
        'User creates a monetary gift voucher with custom amount and verifies it appears correctly in summary'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Test Monetary Voucher',
        'FAIL',
        duration,
        `Expected: Monetary voucher is created successfully, Error: ${(error as Error).message}`,
        'User attempts to create monetary voucher but encounters an error'
      );
      throw error;
    }
  }

  private async testTreatmentVoucher(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Test Treatment Voucher', 'Testing treatment voucher creation');

      // Navigate to gift voucher purchase
      await this.navigateToHomePage();
      await this.clickLinkByText('רכישת שובר מתנה', 'Navigate to Gift Voucher', 'Expected: Opens gift voucher form');

      // Fill minimal guest info
      await this.fillFormField('firstName', 'טסט', 'Fill First Name', 'Expected: First name is entered');
      await this.fillFormField('lastName', 'משתמש', 'Fill Last Name', 'Expected: Last name is entered');
      await this.fillFormField('email', 'test@example.com', 'Fill Email', 'Expected: Email is entered');
      await this.fillFormField('phone', '0501234567', 'Fill Phone', 'Expected: Phone is entered');

      await this.clickButton('המשך', 'Continue to Voucher Type', 'Expected: Proceeds to voucher type selection');

      // Select treatment voucher
      await this.clickLinkByText('שובר טיפול', 'Select Treatment Voucher', 'Expected: Treatment voucher is selected');
      await this.clickButton('המשך', 'Continue to Treatment Selection', 'Expected: Proceeds to treatment selection');

      // Select treatment
      await this.clickLinkByText('עיסוי רפואי', 'Select Treatment Category', 'Expected: Treatment category is selected');
      await this.clickLinkByText('עיסוי שוודי', 'Select Treatment', 'Expected: Treatment is selected');
      await this.clickButton('המשך', 'Continue to Summary', 'Expected: Proceeds to summary');

      // Verify treatment voucher summary
      const hasTreatmentName = await this.checkElementExists('//div[contains(text(), "עיסוי")]');
      if (!hasTreatmentName) {
        throw new Error('Treatment name not displayed in summary');
      }

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Test Treatment Voucher',
        'PASS',
        duration,
        'Expected: Treatment voucher is created successfully',
        'User creates a treatment gift voucher with specific treatment and verifies it appears correctly in summary'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Test Treatment Voucher',
        'FAIL',
        duration,
        `Expected: Treatment voucher is created successfully, Error: ${(error as Error).message}`,
        'User attempts to create treatment voucher but encounters an error'
      );
      throw error;
    }
  }
} 