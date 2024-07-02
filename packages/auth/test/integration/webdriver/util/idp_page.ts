/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { By, until, WebDriver } from 'selenium-webdriver';
import { JsLoadCondition } from './js_load_condition';

const ADD_ACCOUNT_BUTTON = By.css('.js-new-account');
const SIGN_IN_BUTTON = By.id('sign-in');
const EMAIL_INPUT = By.id('email-input');
const DISPLAY_NAME_INPUT = By.id('display-name-input');
const SCREEN_NAME_INPUT = By.id('screen-name-input');
const PROFILE_PHOTO_INPUT = By.id('profile-photo-input');
const ACCOUNT_LIST_ITEMS = By.css('#accounts-list li');

export class IdPPage {
  static PAGE_TITLE = 'Auth Emulator IDP Login Widget';

  constructor(private readonly driver: WebDriver) {}

  async pageLoad(): Promise<void> {
    await this.driver.wait(until.titleContains('Auth Emulator'));
    await this.driver.wait(new JsLoadCondition('toggleForm'));
  }

  async clickAddAccount(): Promise<void> {
    await this.driver.wait(until.elementLocated(ADD_ACCOUNT_BUTTON));
    await this.driver.findElement(ADD_ACCOUNT_BUTTON).click();
  }

  async clickSignIn(): Promise<void> {
    await this.driver.wait(until.elementLocated(SIGN_IN_BUTTON));
    const button = await this.driver.findElement(SIGN_IN_BUTTON);
    await this.driver.wait(until.elementIsEnabled(button));
    await button.click();
  }

  async selectExistingAccountByEmail(email: string): Promise<void> {
    await this.driver.wait(until.elementLocated(ACCOUNT_LIST_ITEMS));
    const accounts = await this.driver.findElements(ACCOUNT_LIST_ITEMS);
    for (const account of accounts) {
      if ((await account.getText()).includes(email)) {
        await account.click();
        return;
      }
    }
  }

  fillEmail(email: string): Promise<void> {
    return this.fillInput(EMAIL_INPUT, email);
  }

  fillDisplayName(displayName: string): Promise<void> {
    return this.fillInput(DISPLAY_NAME_INPUT, displayName);
  }

  fillScreenName(screenName: string): Promise<void> {
    return this.fillInput(SCREEN_NAME_INPUT, screenName);
  }

  fillProfilePhoto(profilePhoto: string): Promise<void> {
    return this.fillInput(PROFILE_PHOTO_INPUT, profilePhoto);
  }

  private async fillInput(input: By, text: string): Promise<void> {
    await this.driver.wait(until.elementLocated(input));
    const el = await this.driver.findElement(input);
    await el.click();
    await el.sendKeys(text);
  }
}
