import { WebDriver } from 'selenium-webdriver';

import { By, until } from '../../../../../auth-exp/test/integration/webdriver/util/auth_driver';
const ANONYMOUS_IDP_BUTTON = By.css('button.firebaseui-idp-anonymous');

export class UiPage {
  constructor(private readonly driver: WebDriver) {}

  async clickGuestSignIn(): Promise<void> {
    console.log(until.elementLocated(ANONYMOUS_IDP_BUTTON));
    await this.driver.wait(until.elementLocated(ANONYMOUS_IDP_BUTTON));
    return this.driver.findElement(ANONYMOUS_IDP_BUTTON).click();
  }
}