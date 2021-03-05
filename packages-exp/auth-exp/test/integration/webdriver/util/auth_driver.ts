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
import { JsLoadCondition } from './js_load_condition';
import { authTestServer } from './test_server';

/** Available functions within the browser. See static/index.js */
export enum TestFunction {
  SIGN_IN_ANONYMOUSLY = 'anonymous',
  RESET = 'reset',
  AWAIT_AUTH_INIT = 'authInit',
  USER_SNAPSHOT = 'userSnap',
  AUTH_SNAPSHOT = 'authSnap',
  START_AUTH = 'startAuth',
  IDP_REDIRECT = 'idpRedirect',
  REDIRECT_RESULT = 'redirectResult'
}

/** Helper wraper around the WebDriver object */
export class AuthDriver {
  webDriver!: WebDriver;

  async start(browser: string): Promise<void> {
    await authTestServer.start();
    this.webDriver = await new Builder().forBrowser(browser).build();
    await this.webDriver.get(authTestServer.address!);
    await this.injectConfigAndInitAuth();
  }

  async stop(): Promise<void> {
    authTestServer.stop();
    await this.webDriver.quit();
  }

  async call<T>(fn: TestFunction): Promise<T> {
    // When running on firefox we can't just return result immediately. For
    // some reason, the binding ends up causing a cycle dependency issue during
    // serialization which blows up the whole thing. It's okay though; this is
    // an integration test: we don't care about the internal (hidden) values of
    // these objects.
    const result = await this.webDriver.executeAsyncScript(`
      var callback = arguments[arguments.length - 1];
      ${fn}().then(result => {
        callback(JSON.stringify(result));
      });
    `);
    return JSON.parse(result as string) as T;
  }

  async callNoWait(fn: TestFunction): Promise<void> {
    return this.webDriver.executeScript(`${fn}()`);
  }

  async getAuthSnapshot(): Promise<Auth> {
    return this.call(TestFunction.AUTH_SNAPSHOT);
  }

  async getUserSnapshot(): Promise<User> {
    return this.call(TestFunction.USER_SNAPSHOT);
  }

  async reset(): Promise<void> {
    await resetEmulator();
    await this.webDriver.get(authTestServer.address!);
    return this.call(TestFunction.RESET);
  }

  async waitForAuthInit(): Promise<void> {
    return this.call(TestFunction.AWAIT_AUTH_INIT);
  }

  async reinitOnRedirect(): Promise<void> {
    // In this unique case we don't know when the page is back; check for the
    // presence of the init function
    // await this.webDriver.wait(this.webDriver.executeScript('typeof authInit !== "undefined"'));
    await this.webDriver.wait(new JsLoadCondition(TestFunction.START_AUTH));
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
    await this.call(TestFunction.START_AUTH);
  }
}
