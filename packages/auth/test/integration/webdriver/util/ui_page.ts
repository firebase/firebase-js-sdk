/**
 * @license
 * Copyright 2021 Google LLC
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

import type { Page } from 'playwright';
import type { AuthDriver } from './auth_driver';

const ANONYMOUS_IDP_BUTTON = 'button.firebaseui-idp-anonymous';
const GOOGLE_IDP_BUTTON = 'button.firebaseui-idp-google';
const PHONE_IDP_BUTTON = 'button.firebaseui-idp-phone';
const EMAIL_IDP_BUTTON = 'button.firebaseui-idp-password';
const PHONE_INPUT = 'input[name="phoneNumber"]';
const SUBMIT_BUTTON = 'button.firebaseui-id-submit';
const PHONE_CONFIRMATION_INPUT = 'input[name="phoneConfirmationCode"]';
const EMAIL_INPUT = 'input[name="email"]';
const EMAIL_NAME_INPUT = 'input[name="name"]';
const EMAIL_PASSWORD_INPUT = 'input[type="password"]';

export class UiPage {
  constructor(private readonly driver: AuthDriver | Page) {}

  private get page(): Page {
    return 'page' in this.driver ? this.driver.page : this.driver;
  }

  async clickGuestSignIn(): Promise<void> {
    await this.page.locator(ANONYMOUS_IDP_BUTTON).click();
  }

  async clickGoogleSignIn(): Promise<void> {
    await this.page.locator(GOOGLE_IDP_BUTTON).click();
  }

  async clickPhoneSignIn(): Promise<void> {
    await this.page.locator(PHONE_IDP_BUTTON).click();
  }

  async clickEmailSignIn(): Promise<void> {
    const button = this.page.locator(`${EMAIL_IDP_BUTTON}:not([disabled])`);
    await button.waitFor({ state: 'visible' });
    await button.evaluate((el: HTMLElement) => el.click());
  }

  async clickSubmit(): Promise<void> {
    const button = this.page.locator(`${SUBMIT_BUTTON}:not([disabled])`);
    await button.waitFor({ state: 'visible' });
    await button.evaluate((el: HTMLElement) => el.click());
  }

  async enterPhoneNumber(phoneNumber: string): Promise<void> {
    return this.fillInput(PHONE_INPUT, phoneNumber);
  }

  async waitForCodeInputToBePresent(): Promise<void> {
    await this.page
      .locator(PHONE_CONFIRMATION_INPUT)
      .waitFor({ state: 'attached' });
  }

  async enterPhoneCode(code: string): Promise<void> {
    return this.fillInput(PHONE_CONFIRMATION_INPUT, code);
  }

  async enterEmail(email: string): Promise<void> {
    return this.fillInput(EMAIL_INPUT, email);
  }

  async enterEmailDisplayName(name: string): Promise<void> {
    return this.fillInput(EMAIL_NAME_INPUT, name);
  }

  async enterPassword(name: string): Promise<void> {
    return this.fillInput(EMAIL_PASSWORD_INPUT, name);
  }

  private async fillInput(selector: string, text: string): Promise<void> {
    const el = this.page.locator(selector);
    await el.waitFor({ state: 'visible' });
    await el.click();
    await this.page.waitForTimeout(100);
    await el.evaluate((input: HTMLInputElement, val: string) => {
      input.value = val;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, text);
  }
}
