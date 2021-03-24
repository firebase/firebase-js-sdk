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
import { Auth, User, Persistence } from '@firebase/auth-exp';
import { Builder, Condition, WebDriver } from 'selenium-webdriver';
import { resetEmulator } from '../../../helpers/integration/emulator_rest_helpers';
import {
  getEmulatorUrl,
  PROJECT_ID,
  USE_EMULATOR
} from '../../../helpers/integration/settings';
import { CoreFunction } from './functions';
import { JsLoadCondition } from './js_load_condition';
import { authTestServer } from './test_server';
export { By, until } from 'selenium-webdriver';

export const START_FUNCTION = 'startAuth';
const START_LEGACY_SDK_FUNCTION = 'startLegacySDK';
const PASSED_ARGS = '...Array.prototype.slice.call(arguments, 0, -1)';

type DriverCallResult =
  | { type: 'success'; value: string /* JSON stringified */ }
  | {
      type: 'error';
      fields: string /* JSON stringified */;
      message: string;
      stack: string;
    };

/** Helper wraper around the WebDriver object */
export class AuthDriver {
  webDriver!: WebDriver;

  async start(browser: string): Promise<void> {
    await authTestServer.start();
    this.webDriver = await new Builder().forBrowser(browser).build();
    await this.goToTestPage();
  }

  async stop(): Promise<void> {
    authTestServer.stop();
    if (process.env.WEBDRIVER_BROWSER_LOGS) {
      await this.webDriver
        .manage()
        .logs()
        .get('browser')
        .then(
          logs => {
            for (const { level, message } of logs) {
              console.log(level.name, message);
            }
          },
          () =>
            console.log(
              'Failed to dump browser logs (this is normal for Firefox).'
            )
        );
    }
    await this.webDriver.quit();
  }

  async call<T>(fn: string, ...args: unknown[]): Promise<T> {
    // When running on firefox we can't just return result immediately. For
    // some reason, the binding ends up causing a cycle dependency issue during
    // serialization which blows up the whole thing. It's okay though; this is
    // an integration test: we don't care about the internal (hidden) values of
    // these objects.
    const result = await this.webDriver.executeAsyncScript<DriverCallResult>(
      `
      var callback = arguments[arguments.length - 1];
      ${fn}(${PASSED_ARGS}).then(result => {
        callback({type: 'success', value: JSON.stringify(result)});
      }).catch(e => {
        callback({type: 'error', message: e.message, stack: e.stack, fields: JSON.stringify(e)});
      });
    `,
      ...args
    );

    if (result.type === 'success') {
      return JSON.parse(result.value) as T;
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
    return this.webDriver.executeScript(`${fn}(...arguments)`, ...args);
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
    await this.webDriver.get(authTestServer.address!);
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
    await this.webDriver.wait(new JsLoadCondition(START_FUNCTION));
    await this.injectConfigAndInitAuth();
    await this.waitForAuthInit();
  }

  pause(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => resolve(), ms);
    });
  }

  async refresh(): Promise<void> {
    await this.webDriver.navigate().refresh();
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

    await this.webDriver.executeScript(`
      window.firebaseConfig = {
        apiKey: 'emulator-api-key',
        projectId: '${PROJECT_ID}',
        authDomain: 'http://localhost/emulator',
      };
      window.emulatorUrl = '${getEmulatorUrl()}';
    `);
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
    const currentWindowHandle = await this.webDriver.getWindowHandle();
    const condition = new Condition(
      'Waiting for popup to open',
      async driver => {
        return (await driver.getAllWindowHandles()).length > 1;
      }
    );
    await this.webDriver.wait(condition);
    const handles = await this.webDriver.getAllWindowHandles();
    return this.webDriver
      .switchTo()
      .window(handles.find(h => h !== currentWindowHandle)!);
  }

  async selectMainWindow(options: { noWait?: boolean } = {}): Promise<void> {
    if (!options.noWait) {
      const condition = new Condition(
        'Waiting for popup to close',
        async driver => {
          return (await driver.getAllWindowHandles()).length === 1;
        }
      );
      await this.webDriver.wait(condition);
    }
    const handles = await this.webDriver.getAllWindowHandles();
    return this.webDriver.switchTo().window(handles[0]);
  }

  async closePopup(): Promise<void> {
    // This assumes the current driver is already the popup
    await this.webDriver.close();
    return this.selectMainWindow();
  }

  async closeExtraWindows(): Promise<void> {
    const handles = await this.webDriver.getAllWindowHandles();
    await this.webDriver.switchTo().window(handles[handles.length - 1]);
    while (handles.length > 1) {
      await this.webDriver.close();
      handles.pop();
      await this.webDriver.switchTo().window(handles[handles.length - 1]);
    }
  }

  isCompatLayer(): boolean {
    return process.env.COMPAT_LAYER === 'true';
  }
}
