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

// eslint-disable-next-line import/no-extraneous-dependencies
import type { Auth, User, Persistence } from '@firebase/auth';
import { chromium, firefox, webkit } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import { resetEmulator } from '../../../helpers/integration/emulator_rest_helpers';
import {
  getEmulatorUrl,
  PROJECT_ID,
  USE_EMULATOR
} from '../../../helpers/integration/settings';
import { CoreFunction } from './functions';
import { authTestServer } from './test_server';

export const START_FUNCTION = 'startAuth';
const START_LEGACY_SDK_FUNCTION = 'startLegacySDK';

type DriverCallResult =
  | { type: 'success'; value: string /* JSON stringified */ }
  | {
      type: 'error';
      fields: string /* JSON stringified */;
      message: string;
      stack: string;
    };

/** Helper wrapper around the Playwright Page and BrowserContext objects */
export class AuthDriver {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  async start(browserName: string): Promise<void> {
    await authTestServer.start();
    const headless = process.env.HEADLESS !== 'false';
    const browserType =
      browserName === 'firefox'
        ? firefox
        : browserName === 'webkit'
          ? webkit
          : chromium;
    this.browser = await browserType.launch({ headless });
    this.context = await this.browser.newContext();
    if (process.env.WEBDRIVER_BROWSER_LOGS) {
      this.context.on('page', page => {
        page.on('console', msg => {
          console.log(msg.type(), msg.text());
        });
      });
    }
    this.page = await this.context.newPage();
    await this.goToTestPage();
  }

  async stop(): Promise<void> {
    try {
      authTestServer.stop();
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async call<T>(fn: string, ...args: unknown[]): Promise<T> {
    // When running on firefox we can't just return result immediately. For
    // some reason, the binding ends up causing a cycle dependency issue during
    // serialization which blows up the whole thing. It's okay though; this is
    // an integration test: we don't care about the internal (hidden) values of
    // these objects.
    const result = await this.page.evaluate(
      async ({ fn, args }): Promise<DriverCallResult> => {
        const parts = fn.split('.');
        let ctx: unknown = window;
        let target: unknown = window;
        for (const part of parts) {
          ctx = target;
          target = (target as Record<string, unknown>)[part];
        }
        try {
          const value = await (
            target as (...a: unknown[]) => Promise<unknown>
          ).apply(ctx, args);
          return { type: 'success', value: JSON.stringify(value) };
        } catch (e: unknown) {
          const err = e as Error;
          return {
            type: 'error',
            message: err.message,
            stack: err.stack || '',
            fields: JSON.stringify(err)
          };
        }
      },
      { fn, args }
    );

    if (result.type === 'success') {
      return (result.value ? JSON.parse(result.value) : undefined) as T;
    } else {
      const e = new Error(result.message);
      const stack = e.stack;
      Object.assign(e, JSON.parse(result.fields));

      const trimmedDriverStack = result.stack.split('at eval (')[0];
      e.stack = `${trimmedDriverStack}\nfrom WebDriver call ${fn}(...)\n${stack}`;
      throw e;
    }
  }

  async callNoWait(fn: string, ...args: unknown[]): Promise<void> {
    await this.page.evaluate(
      ({ fn, args }) => {
        const parts = fn.split('.');
        let ctx: unknown = window;
        let target: unknown = window;
        for (const part of parts) {
          ctx = target;
          target = (target as Record<string, unknown>)[part];
        }
        void (target as (...a: unknown[]) => unknown).apply(ctx, args);
      },
      { fn, args }
    );
  }

  async waitForGlobal(globalValue: string): Promise<void> {
    await this.page.waitForFunction(
      (name: string) =>
        typeof (window as unknown as Record<string, unknown>)[name] !==
        'undefined',
      globalValue
    );
  }

  async wait(
    condition: () => Promise<boolean> | boolean,
    timeoutMs = 10000
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await condition()) {
        return;
      }
      await this.pause(50);
    }
    throw new Error(`Timed out after ${timeoutMs}ms waiting for condition`);
  }

  async getAuthSnapshot(): Promise<Auth> {
    return this.call(CoreFunction.AUTH_SNAPSHOT);
  }

  async getUserSnapshot(): Promise<User> {
    return this.call(CoreFunction.USER_SNAPSHOT);
  }

  async reset(): Promise<void> {
    await resetEmulator();
    await this.goToTestPage();
    return this.call(CoreFunction.RESET);
  }

  async goToTestPage(): Promise<void> {
    await this.page.goto(authTestServer.address!);
  }

  async waitForAuthInit(): Promise<void> {
    return this.call(CoreFunction.AWAIT_AUTH_INIT);
  }

  async waitForLegacyAuthInit(): Promise<void> {
    return this.call(CoreFunction.AWAIT_LEGACY_AUTH_INIT);
  }

  async reinitOnRedirect(): Promise<void> {
    // In this unique case we don't know when the page is back; check for the
    // presence of the core module
    await this.waitForGlobal(START_FUNCTION);
    await this.injectConfigAndInitAuth();
    await this.waitForAuthInit();
  }

  pause(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => resolve(), ms);
    });
  }

  async refresh(): Promise<void> {
    await this.page.reload();
    await this.injectConfigAndInitAuth();
    await this.waitForAuthInit();
  }

  private async injectConfig(): Promise<void> {
    if (!USE_EMULATOR) {
      throw new Error(
        'Local testing against emulator requested, but ' +
          'GCLOUD_PROJECT and FIREBASE_AUTH_EMULATOR_HOST env variables ' +
          'are missing'
      );
    }

    await this.page.evaluate(
      ({ projectId, emulatorUrl }) => {
        (window as unknown as Record<string, unknown>).firebaseConfig = {
          apiKey: 'emulator-api-key',
          projectId,
          authDomain: 'localhost/emulator'
        };
        (window as unknown as Record<string, unknown>).emulatorUrl =
          emulatorUrl;
      },
      { projectId: PROJECT_ID, emulatorUrl: getEmulatorUrl() }
    );
  }

  async injectConfigAndInitAuth(): Promise<void> {
    await this.injectConfig();
    await this.call(START_FUNCTION);
  }

  async injectConfigAndInitLegacySDK(
    persistence: Persistence['type'] = 'LOCAL'
  ): Promise<void> {
    await this.injectConfig();
    await this.call(START_LEGACY_SDK_FUNCTION, persistence);
  }

  async selectPopupWindow(): Promise<void> {
    const currentPage = this.page;
    await this.wait(() => this.context.pages().length > 1);
    const pages = this.context.pages();
    const popupPage = pages.find(p => p !== currentPage);
    if (!popupPage) {
      throw new Error('Popup window not found');
    }
    this.page = popupPage;
  }

  async selectMainWindow(options: { noWait?: boolean } = {}): Promise<void> {
    if (!options.noWait) {
      await this.wait(() => this.context.pages().length === 1);
    }
    const pages = this.context.pages();
    this.page = pages[0];
  }

  async closePopup(): Promise<void> {
    // This assumes the current page is already the popup
    await this.page.close();
    return this.selectMainWindow();
  }

  async closeExtraWindows(): Promise<void> {
    const pages = this.context.pages();
    while (pages.length > 1) {
      const extraPage = pages.pop()!;
      await extraPage.close();
    }
    this.page = pages[0];
  }

  isCompatLayer(): boolean {
    return process.env.COMPAT_LAYER === 'true';
  }
}
