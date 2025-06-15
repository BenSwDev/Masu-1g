import { By } from 'selenium-webdriver';
import { BaseTest } from './base-test';
import { TestScenario, GuestInfo, AddressInfo, TreatmentSelection, SchedulingInfo } from './types';

export class TreatmentBookingTest extends BaseTest {
  private testData: {
    guestInfo: GuestInfo;
    addressInfo: AddressInfo;
    treatmentSelection: TreatmentSelection;
    schedulingInfo: SchedulingInfo;
  };

  constructor() {
    super();
    this.testData = {
      guestInfo: {
        firstName: 'שרה',
        lastName: 'כהן',
        email: 'sarah.cohen@example.com',
        phone: '0501234567',
        birthDate: '1990-05-15',
        gender: 'female'
      },
      addressInfo: {
        city: 'תל אביב',
        street: 'דיזנגוף',
        houseNumber: '123',
        addressType: 'apartment',
        floor: '3',
        apartmentNumber: '12',
        entrance: 'א',
        parking: true,
        notes: 'דירה מול הים'
      },
      treatmentSelection: {
        category: 'עיסוי רפואי',
        treatmentName: 'עיסוי שוודי',
        duration: '60 דקות',
        therapistPreference: 'female'
      },
      schedulingInfo: {
        date: '2024-02-15',
        time: '14:00'
      }
    };
  }

  async runTests(): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];

    try {
      // Complete Treatment Booking Flow
      this.currentScenario = 'Complete Treatment Booking Flow';
      await this.runCompleteBookingFlow();
      
      scenarios.push({
        name: 'Complete Treatment Booking Flow',
        description: 'User completes entire treatment booking process from homepage to confirmation',
        steps: []
      });

      // Validation Tests
      this.currentScenario = 'Form Validation Tests';
      await this.runValidationTests();
      
      scenarios.push({
        name: 'Form Validation Tests',
        description: 'User encounters and resolves form validation errors',
        steps: []
      });

    } catch (error) {
      console.error('❌ Treatment booking test failed:', (error as Error).message);
    }

    return scenarios;
  }

  private async runCompleteBookingFlow(): Promise<void> {
    // Step 1: Navigate to home page
    await this.navigateToHomePage();

    // Step 2: Click treatment booking button
    await this.clickLinkByText(
      'הזמנת טיפול',
      'Click Treatment Booking Button',
      'Expected: Treatment booking wizard opens'
    );

    // Step 3: Fill guest information
    await this.fillGuestInformation();

    // Step 4: Fill address information
    await this.fillAddressInformation();

    // Step 5: Select treatment
    await this.selectTreatment();

    // Step 6: Schedule appointment
    await this.scheduleAppointment();

    // Step 7: Review and confirm
    await this.reviewAndConfirm();

    // Step 8: Complete payment
    await this.completePayment();
  }

  private async fillGuestInformation(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Fill Guest Information', 'Filling out personal details form');

      // Fill basic information using actual form field names
      await this.fillFormField('firstName', this.testData.guestInfo.firstName, 'Fill First Name', 'Expected: First name is entered');
      await this.fillFormField('lastName', this.testData.guestInfo.lastName, 'Fill Last Name', 'Expected: Last name is entered');
      await this.fillFormField('email', this.testData.guestInfo.email, 'Fill Email', 'Expected: Email is entered');
      await this.fillFormField('phone', this.testData.guestInfo.phone, 'Fill Phone', 'Expected: Phone number is entered');

      // Click continue button
      await this.clickButton('המשך', 'Continue to Next Step', 'Expected: Proceeds to address step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Fill Guest Information',
        'PASS',
        duration,
        'Expected: Guest information is filled and validated',
        'User fills out their personal information including name, email, and phone number, then clicks continue'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Fill Guest Information',
        'FAIL',
        duration,
        `Expected: Guest information is filled and validated, Error: ${(error as Error).message}`,
        'User attempts to fill out personal information but encounters an error'
      );
      throw error;
    }
  }

  private async fillAddressInformation(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Fill Address Information', 'Filling out address details form');

      // Fill address fields using actual form field names from GuestAddressStep
      await this.fillFormField('city', this.testData.addressInfo.city, 'Fill City', 'Expected: City is entered');
      await this.fillFormField('street', this.testData.addressInfo.street, 'Fill Street', 'Expected: Street is entered');
      await this.fillFormField('houseNumber', this.testData.addressInfo.houseNumber, 'Fill House Number', 'Expected: House number is entered');
      
      // Select address type
      await this.selectDropdownOption('addressType', 'דירה', 'Select Address Type', 'Expected: Address type is selected');
      
      // Fill apartment-specific fields
      await this.fillFormField('floor', this.testData.addressInfo.floor!, 'Fill Floor', 'Expected: Floor is entered');
      await this.fillFormField('apartmentNumber', this.testData.addressInfo.apartmentNumber!, 'Fill Apartment Number', 'Expected: Apartment number is entered');
      await this.fillFormField('entrance', this.testData.addressInfo.entrance!, 'Fill Entrance', 'Expected: Entrance is entered');

      // Click continue button
      await this.clickButton('המשך', 'Continue to Treatment Selection', 'Expected: Proceeds to treatment selection step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Fill Address Information',
        'PASS',
        duration,
        'Expected: Address information is filled and validated',
        'User fills out their address details including city, street, apartment information, then clicks continue'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Fill Address Information',
        'FAIL',
        duration,
        `Expected: Address information is filled and validated, Error: ${(error as Error).message}`,
        'User attempts to fill out address information but encounters an error'
      );
      throw error;
    }
  }

  private async selectTreatment(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Select Treatment', 'Choosing treatment type and duration');

      // Wait for treatment selection step to load
      await this.driver.sleep(2000);

      // Select treatment category and specific treatment
      // This will depend on the actual treatment selection component structure
      await this.clickLinkByText(this.testData.treatmentSelection.category, 'Select Treatment Category', 'Expected: Treatment category is selected');
      await this.driver.sleep(1000);
      
      await this.clickLinkByText(this.testData.treatmentSelection.treatmentName, 'Select Specific Treatment', 'Expected: Specific treatment is selected');
      await this.driver.sleep(1000);

      // Select duration if available
      if (this.testData.treatmentSelection.duration) {
        await this.clickLinkByText(this.testData.treatmentSelection.duration, 'Select Duration', 'Expected: Treatment duration is selected');
        await this.driver.sleep(1000);
      }

      // Click continue button
      await this.clickButton('המשך', 'Continue to Scheduling', 'Expected: Proceeds to scheduling step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Select Treatment',
        'PASS',
        duration,
        'Expected: Treatment is selected and validated',
        'User browses available treatments, selects their preferred treatment type and duration, then clicks continue'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Select Treatment',
        'FAIL',
        duration,
        `Expected: Treatment is selected and validated, Error: ${(error as Error).message}`,
        'User attempts to select a treatment but encounters an error'
      );
      throw error;
    }
  }

  private async scheduleAppointment(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Schedule Appointment', 'Selecting date and time for appointment');

      // Wait for scheduling step to load
      await this.driver.sleep(2000);

      // Select date (this will depend on the actual date picker implementation)
      await this.clickLinkByText('15', 'Select Date', 'Expected: Appointment date is selected');
      await this.driver.sleep(1000);

      // Select time slot
      await this.clickLinkByText('14:00', 'Select Time', 'Expected: Appointment time is selected');
      await this.driver.sleep(1000);

      // Click continue button
      await this.clickButton('המשך', 'Continue to Summary', 'Expected: Proceeds to summary step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Schedule Appointment',
        'PASS',
        duration,
        'Expected: Appointment is scheduled successfully',
        'User selects their preferred date and time from available slots, then clicks continue'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Schedule Appointment',
        'FAIL',
        duration,
        `Expected: Appointment is scheduled successfully, Error: ${(error as Error).message}`,
        'User attempts to schedule an appointment but encounters an error'
      );
      throw error;
    }
  }

  private async reviewAndConfirm(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Review and Confirm', 'Reviewing booking details before payment');

      // Wait for summary step to load
      await this.driver.sleep(2000);

      // Verify booking details are displayed correctly
      const hasGuestInfo = await this.checkElementExists('//div[contains(text(), "שרה כהן")]');
      const hasAddress = await this.checkElementExists('//div[contains(text(), "תל אביב")]');
      const hasTreatment = await this.checkElementExists('//div[contains(text(), "עיסוי")]');

      if (!hasGuestInfo || !hasAddress || !hasTreatment) {
        throw new Error('Booking summary is incomplete');
      }

      // Click continue to payment
      await this.clickButton('המשך לתשלום', 'Continue to Payment', 'Expected: Proceeds to payment step');

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Review and Confirm',
        'PASS',
        duration,
        'Expected: Booking details are reviewed and confirmed',
        'User reviews their booking summary including personal details, address, treatment, and schedule, then clicks continue to payment'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Review and Confirm',
        'FAIL',
        duration,
        `Expected: Booking details are reviewed and confirmed, Error: ${(error as Error).message}`,
        'User attempts to review booking details but encounters an error'
      );
      throw error;
    }
  }

  private async completePayment(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Complete Payment', 'Processing payment for booking');

      // Wait for payment step to load
      await this.driver.sleep(2000);

      // For testing purposes, we'll simulate payment completion
      // In a real scenario, this would involve payment form interaction
      await this.clickButton('אישור הזמנה', 'Confirm Booking', 'Expected: Booking is confirmed');

      // Wait for confirmation page
      await this.driver.sleep(3000);

      // Verify confirmation page
      const hasConfirmation = await this.checkElementExists('//div[contains(text(), "הזמנה אושרה") or contains(text(), "תודה")]');
      
      if (!hasConfirmation) {
        throw new Error('Booking confirmation not displayed');
      }

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Complete Payment',
        'PASS',
        duration,
        'Expected: Payment is processed and booking is confirmed',
        'User completes the payment process and receives booking confirmation with details'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Complete Payment',
        'FAIL',
        duration,
        `Expected: Payment is processed and booking is confirmed, Error: ${(error as Error).message}`,
        'User attempts to complete payment but encounters an error'
      );
      throw error;
    }
  }

  private async runValidationTests(): Promise<void> {
    // Navigate to treatment booking
    await this.navigateToHomePage();
    await this.clickLinkByText('הזמנת טיפול', 'Navigate to Treatment Booking', 'Expected: Opens treatment booking form');

    // Test empty form validation
    await this.testEmptyFormValidation();
  }

  private async testEmptyFormValidation(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Test Empty Form Validation', 'Attempting to submit empty form');

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
        'Expected: Form validation prevents submission of empty form',
        'User tries to submit an empty form and sees helpful validation error messages'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Test Empty Form Validation',
        'FAIL',
        duration,
        `Expected: Form validation prevents submission of empty form, Error: ${(error as Error).message}`,
        'User tries to submit empty form but validation does not work as expected'
      );
      throw error;
    }
  }
} 