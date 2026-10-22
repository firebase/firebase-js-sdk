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

import { Page } from 'playwright';
import { AuthDriver } from './auth_driver';

const ADD_ACCOUNT_BUTTON = '.js-new-account';
const SIGN_IN_BUTTON = '#sign-in';
const EMAIL_INPUT = '#email-input';
const DISPLAY_NAME_INPUT = '#display-name-input';
const SCREEN_NAME_INPUT = '#screen-name-input';
const PROFILE_PHOTO_INPUT = '#profile-photo-input';
const ACCOUNT_LIST_ITEMS = '#accounts-list li';

export class IdPPage {
  static PAGE_TITLE = 'Auth Emulator IDP Login Widget';

  constructor(private readonly driver: AuthDriver | Page) {}

  private get page(): Page {
    return 'page' in this.driver ? this.driver.page : this.driver;
  }

  async pageLoad(): Promise<void> {
    await this.page.waitForFunction(
      () =>
        document.title.includes('Auth Emulator') &&
        typeof (window as unknown as Record<string, unknown>)['toggleForm'] !==
          'undefined'
    );
  }

  async clickAddAccount(): Promise<void> {
    await this.page.locator(ADD_ACCOUNT_BUTTON).click();
  }

  async clickSignIn(): Promise<void> {
    await this.page.locator(SIGN_IN_BUTTON).click();
  }

  async selectExistingAccountByEmail(email: string): Promise<void> {
    await this.page.locator(ACCOUNT_LIST_ITEMS).first().waitFor();
    const accounts = await this.page.locator(ACCOUNT_LIST_ITEMS).all();
    for (const account of accounts) {
      if ((await account.innerText()).includes(email)) {
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

  private async fillInput(selector: string, text: string): Promise<void> {
    const el = this.page.locator(selector);
    await el.click();
    await el.fill(text);
  }
}
