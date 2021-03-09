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
import { Auth, User } from '@firebase/auth-exp';
import { Builder, WebDriver } from 'selenium-webdriver';
import { resetEmulator } from '../../../helpers/integration/emulator_rest_helpers';
import {
  getEmulatorUrl,
  PROJECT_ID,
  USE_EMULATOR
} from '../../../helpers/integration/settings';
import { CoreFunction } from './functions';
import { JsLoadCondition } from './js_load_condition';
import { authTestServer } from './test_server';

const START_FUNCTION = 'startAuth';
const PASSED_ARGS = '...Array.prototype.slice.call(arguments, 0, -1)';

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
    await this.webDriver.quit();
  }

  async call<T>(fn: string, ...args: unknown[]): Promise<T> {
    // When running on firefox we can't just return result immediately. For
    // some reason, the binding ends up causing a cycle dependency issue during
    // serialization which blows up the whole thing. It's okay though; this is
    // an integration test: we don't care about the internal (hidden) values of
    // these objects.
    const {
      type,
      value
    }: {
      type: string;
      value: string;
    } = await this.webDriver.executeAsyncScript(
      `
      var callback = arguments[arguments.length - 1];
      ${fn}(${PASSED_ARGS}).then(result => {
        callback({type: 'success', value: JSON.stringify(result)});
      }).catch(e => {
        callback({type: 'error', value: JSON.stringify(e)});
      });
    `,
      ...args
    );

    const parsed: object = JSON.parse(value);
    if (type === 'success') {
      return JSON.parse(value) as T;
    } else {
      const e = new Error('Test promise rejection');
      Object.assign(e, parsed);
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

  async injectConfigAndInitAuth(): Promise<void> {
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
    await this.call(START_FUNCTION);
  }
}
