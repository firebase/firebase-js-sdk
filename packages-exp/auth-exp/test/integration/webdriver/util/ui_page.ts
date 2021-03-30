import { By, until, WebDriver } from 'selenium-webdriver';

const ANONYMOUS_IDP_BUTTON = By.css('button.firebaseui-idp-anonymous');
const GOOGLE_IDP_BUTTON = By.css('button.firebaseui-idp-google');

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
}