import { By, until, WebDriver } from 'selenium-webdriver';

const ANONYMOUS_IDP_BUTTON = By.css('button.firebaseui-idp-anonymous');
const GOOGLE_IDP_BUTTON = By.css('button.firebaseui-idp-google');
const PHONE_IDP_BUTTON = By.css('button.firebaseui-idp-phone');
const EMAIL_IDP_BUTTON = By.css('button.firebaseui-idp-password');
const PHONE_INPUT = By.css('input[name="phoneNumber"]');
const SUBMIT_BUTTON = By.css('button.firebaseui-id-submit');
const PHONE_CONFIRMATION_INPUT = By.css('input[name="phoneConfirmationCode"]');
const EMAIL_INPUT = By.css('input[name="email"]');
const EMAIL_NAME_INPUT = By.css('input[name="name"]');
const EMAIL_PASSWORD_INPUT = By.css('input[type="password"]');

export class UiPage {
  constructor(private readonly driver: WebDriver) {}

  async clickGuestSignIn(): Promise<void> {
    await this.driver.wait(until.elementLocated(ANONYMOUS_IDP_BUTTON));
    return this.driver.findElement(ANONYMOUS_IDP_BUTTON).click();
  }

  async clickGoogleSignIn(): Promise<void> {
    await this.driver.wait(until.elementLocated(GOOGLE_IDP_BUTTON));
    return this.driver.findElement(GOOGLE_IDP_BUTTON).click();
  }

  async clickPhoneSignIn(): Promise<void> {
    await this.driver.wait(until.elementLocated(PHONE_IDP_BUTTON));
    return this.driver.findElement(PHONE_IDP_BUTTON).click();
  }

  async clickEmailSignIn(): Promise<void> {
    await this.driver.wait(until.elementLocated(EMAIL_IDP_BUTTON));
    return this.driver.findElement(EMAIL_IDP_BUTTON).click();
  }

  async clickSubmit(): Promise<void> {
    await this.driver.wait(until.elementLocated(SUBMIT_BUTTON));
    return this.driver.findElement(SUBMIT_BUTTON).click();
  }

  async enterPhoneNumber(number: string): Promise<void> {
    return this.fillInput(PHONE_INPUT, number);
  }

  async waitForCodeInputToBePresent(): Promise<void> {
    await this.driver.wait(until.elementLocated(PHONE_CONFIRMATION_INPUT));
  }

  async enterPhoneCode(code: string): Promise<void> {
    return this.fillInput(PHONE_CONFIRMATION_INPUT, code);
  }

  async enterEmail(email: string): Promise<void> {
    return this.fillInput(EMAIL_INPUT, email);
  }

  async enterEmailDisplayName(name: string): Promise<void>{
    return this.fillInput(EMAIL_NAME_INPUT, name);
  }

  async enterPassword(name: string): Promise<void>{
    return this.fillInput(EMAIL_PASSWORD_INPUT, name);
  }

  private async fillInput(input: By, text: string): Promise<void> {
    await this.driver.wait(until.elementLocated(input));
    const el = await this.driver.findElement(input);
    await el.click();
    await el.sendKeys(text);
  }
}