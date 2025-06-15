import { Builder, WebDriver, By, until, WebElement } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import { TestResult, TestScenario } from './types';

export abstract class BaseTest {
  protected driver: WebDriver;
  protected results: TestResult[] = [];
  protected currentScenario: string = '';

  constructor() {
    this.driver = this.createDriver();
  }

  private createDriver(): WebDriver {
    const options = new chrome.Options();
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--headless'); // Run completely headless
    options.addArguments('--disable-web-security');
    options.addArguments('--disable-features=VizDisplayCompositor');
    options.addArguments('--disable-background-timer-throttling');
    options.addArguments('--disable-backgrounding-occluded-windows');
    options.addArguments('--disable-renderer-backgrounding');

    return new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  }

  protected async logStep(step: string, action: string): Promise<void> {
    console.log(`🔄 ${this.currentScenario} - ${step}: ${action}`);
  }

  protected async recordResult(scenario: string, step: string, status: 'PASS' | 'FAIL', duration: number, message: string, userAction?: string): Promise<void> {
    const result: TestResult = {
      scenario,
      step,
      status,
      duration,
      message,
      userAction: userAction || `User performs: ${step}`,
      timestamp: new Date()
    };
    
    this.results.push(result);
    
    const statusIcon = status === 'PASS' ? '✅' : '❌';
    console.log(`${statusIcon} ${scenario} - ${step}: ${message} (${duration}ms)`);
    if (userAction) {
      console.log(`   👤 User Action: ${userAction}`);
    }
  }

  protected async navigateToHomePage(): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep('Navigate to Home Page', 'Opening MASU website homepage');
      
      await this.driver.get('http://localhost:3000');
      
      // Wait for page to load - check for body element instead of specific title
      await this.driver.wait(until.elementLocated(By.css('body')), 10000);
      
      // Additional wait for page content to load
      await this.driver.sleep(2000);
      
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Navigate to Home Page',
        'PASS',
        duration,
        'Expected: Home page loads successfully',
        'User opens their web browser and navigates to the MASU website homepage at localhost:3000'
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        'Navigate to Home Page',
        'FAIL',
        duration,
        `Expected: Home page loads successfully, Error: ${(error as Error).message}`,
        'User tries to open the MASU website but the page fails to load'
      );
      throw error;
    }
  }

  protected async clickLinkByText(linkText: string, stepName: string, expectedResult: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep(stepName, `Looking for and clicking link with text: ${linkText}`);
      
      // Try multiple selector strategies for Hebrew text
      const selectors = [
        `//a[contains(text(), "${linkText}")]`,
        `//button[contains(text(), "${linkText}")]`,
        `//div[contains(text(), "${linkText}")]//ancestor::a`,
        `//span[contains(text(), "${linkText}")]//ancestor::a`,
        `//a[contains(@href, "${this.getLinkHrefFromText(linkText)}")]`,
        `//*[contains(text(), "${linkText}") and (self::a or self::button)]`
      ];

      let element: WebElement | null = null;
      let lastError: Error | null = null;

      for (const selector of selectors) {
        try {
          element = await this.driver.wait(until.elementLocated(By.xpath(selector)), 5000);
          if (element && await element.isDisplayed() && await element.isEnabled()) {
            break;
          }
        } catch (error) {
          lastError = error as Error;
          continue;
        }
      }

      if (!element) {
        throw new Error(`Could not find clickable element with text: ${linkText}`);
      }

      // Scroll to element and click
      await this.driver.executeScript('arguments[0].scrollIntoView(true);', element);
      await this.driver.sleep(500);
      await element.click();
      await this.driver.sleep(1000);

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        stepName,
        'PASS',
        duration,
        expectedResult,
        `User successfully clicks on "${linkText}" link/button`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        stepName,
        'FAIL',
        duration,
        `${expectedResult}, Error: ${(error as Error).message}`,
        `User tries to click on "${linkText}" but the element is not found or not clickable`
      );
      throw error;
    }
  }

  private getLinkHrefFromText(linkText: string): string {
    const linkMap: Record<string, string> = {
      'הזמנת טיפול': '/book-treatment',
      'רכישת מנוי': '/book-subscription', 
      'רכישת שובר מתנה': '/book-gift-voucher'
    };
    return linkMap[linkText] || '';
  }

  protected async fillFormField(fieldName: string, value: string, stepName: string, expectedResult: string, userAction?: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep(stepName, `Filling field ${fieldName} with value: ${value}`);
      
      // Try multiple selector strategies for form fields
      const selectors = [
        `input[name="${fieldName}"]`,
        `input[id="${fieldName}"]`,
        `textarea[name="${fieldName}"]`,
        `textarea[id="${fieldName}"]`,
        `select[name="${fieldName}"]`,
        `select[id="${fieldName}"]`,
        `input[placeholder*="${fieldName}"]`,
        `//input[@name="${fieldName}" or @id="${fieldName}"]`,
        `//textarea[@name="${fieldName}" or @id="${fieldName}"]`,
        `//select[@name="${fieldName}" or @id="${fieldName}"]`
      ];

      let element: WebElement | null = null;

      for (const selector of selectors) {
        try {
          if (selector.startsWith('//')) {
            element = await this.driver.wait(until.elementLocated(By.xpath(selector)), 3000);
          } else {
            element = await this.driver.wait(until.elementLocated(By.css(selector)), 3000);
          }
          if (element && await element.isDisplayed() && await element.isEnabled()) {
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!element) {
        throw new Error(`Could not find form field: ${fieldName}`);
      }

      // Clear and fill the field
      await element.clear();
      await element.sendKeys(value);
      await this.driver.sleep(300);

      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        stepName,
        'PASS',
        duration,
        expectedResult,
        userAction || `User types "${value}" into the ${fieldName} field`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario,
        stepName,
        'FAIL',
        duration,
        `${expectedResult}, Error: ${(error as Error).message}`,
        userAction || `User tries to fill the ${fieldName} field but encounters an error`
      );
      throw error;
    }
  }

  protected async clickButton(buttonText: string, stepName: string, expectedResult: string, userAction?: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep(stepName, `Looking for and clicking button: ${buttonText}`);
      
      const selectors = [
        `//button[contains(text(), '${buttonText}')]`,
        `//button[@type='submit' and contains(text(), '${buttonText}')]`,
        `//input[@type='submit' and @value='${buttonText}']`,
        `//a[contains(@class, 'button') and contains(text(), '${buttonText}')]`,
        `//div[@role='button' and contains(text(), '${buttonText}')]`
      ];

      let element: WebElement | null = null;
      for (const selector of selectors) {
        try {
          element = await this.driver.wait(until.elementLocated(By.xpath(selector)), 3000);
          if (element) break;
        } catch (e) {
          continue;
        }
      }

      if (!element) {
        throw new Error(`Could not find button: ${buttonText}`);
      }

      await this.driver.executeScript("arguments[0].scrollIntoView(true);", element);
      await this.driver.sleep(500);
      await element.click();
      await this.driver.sleep(1000);
      
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario, 
        stepName, 
        'PASS', 
        duration, 
        expectedResult,
        userAction || `User clicks the "${buttonText}" button`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario, 
        stepName, 
        'FAIL', 
        duration, 
        `${expectedResult}, Error: ${(error as Error).message}`,
        userAction || `User tries to click the "${buttonText}" button but it's not found or not clickable`
      );
      throw error;
    }
  }

  protected async selectDropdownOption(fieldName: string, optionText: string, stepName: string, expectedResult: string, userAction?: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.logStep(stepName, `Selecting option "${optionText}" from dropdown "${fieldName}"`);
      
      // First try to find and click the dropdown trigger
      const triggerSelectors = [
        `//button[@role='combobox' and contains(@aria-label, '${fieldName}')]`,
        `//div[contains(@class, 'select-trigger')]//button`,
        `//button[contains(@class, 'select-trigger')]`,
        `select[name="${fieldName}"]`
      ];

      let triggerElement: WebElement | null = null;
      for (const selector of triggerSelectors) {
        try {
          const locator = selector.startsWith('//') ? By.xpath(selector) : By.css(selector);
          triggerElement = await this.driver.wait(until.elementLocated(locator), 2000);
          if (triggerElement) break;
        } catch (e) {
          continue;
        }
      }

      if (!triggerElement) {
        throw new Error(`Could not find dropdown trigger for: ${fieldName}`);
      }

      // Click to open dropdown
      await triggerElement.click();
      await this.driver.sleep(500);

      // Find and click the option
      const optionSelectors = [
        `//div[@role='option' and contains(text(), '${optionText}')]`,
        `//li[contains(text(), '${optionText}')]`,
        `//option[contains(text(), '${optionText}')]`,
        `//div[contains(@class, 'select-item') and contains(text(), '${optionText}')]`
      ];

      let optionElement: WebElement | null = null;
      for (const selector of optionSelectors) {
        try {
          optionElement = await this.driver.wait(until.elementLocated(By.xpath(selector)), 2000);
          if (optionElement) break;
        } catch (e) {
          continue;
        }
      }

      if (!optionElement) {
        throw new Error(`Could not find option "${optionText}" in dropdown`);
      }

      await optionElement.click();
      await this.driver.sleep(500);
      
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario, 
        stepName, 
        'PASS', 
        duration, 
        expectedResult,
        userAction || `User opens the ${fieldName} dropdown and selects "${optionText}"`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.recordResult(
        this.currentScenario, 
        stepName, 
        'FAIL', 
        duration, 
        `${expectedResult}, Error: ${(error as Error).message}`,
        userAction || `User tries to select "${optionText}" from ${fieldName} dropdown but encounters an error`
      );
      throw error;
    }
  }

  protected async waitForElement(selector: string, timeout: number = 10000): Promise<WebElement> {
    const locator = selector.startsWith('//') ? By.xpath(selector) : By.css(selector);
    return await this.driver.wait(until.elementLocated(locator), timeout);
  }

  protected async checkElementExists(xpath: string): Promise<boolean> {
    try {
      const element = await this.driver.findElement(By.xpath(xpath));
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  public getResults(): TestResult[] {
    return this.results;
  }

  public async cleanup(): Promise<void> {
    try {
      if (this.driver) {
        await this.driver.quit();
      }
    } catch (error) {
      console.error('Error during cleanup:', (error as Error).message);
    }
  }

  public abstract runTests(): Promise<TestScenario[]>;
} 