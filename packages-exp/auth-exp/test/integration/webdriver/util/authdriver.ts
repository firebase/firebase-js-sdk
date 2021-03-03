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
import { authTestServer } from './test_server';

/** Browsers to run the tests on */
const BROWSERS = ['chrome', 'firefox'];

/** Available functions within the browser. See static/index.js */
export enum TestFunction {
  SIGN_IN_ANONYMOUSLY = 'anonymous',
  RESET = 'reset',
  AWAIT_AUTH_INIT = 'authInit',
  USER_SNAPSHOT = 'userSnap',
  AUTH_SNAPSHOT = 'authSnap'
}

/** Helper wraper around the WebDriver object */
export class AuthDriver {
  webDriver!: WebDriver;

  async start(browser: string): Promise<void> {
    await authTestServer.start();
    this.webDriver = await new Builder().forBrowser(browser).build();
    await this.webDriver.get(authTestServer.address!);
  }

  async stop(): Promise<void> {
    authTestServer.stop();
    await this.webDriver.quit();
  }

  /** Wraps a set of tests and runs them in multiple browsers */
  runTestsInAvailableBrowsers(cb: () => void): void {
    for (const browser of BROWSERS) {
      context(`Under browser: ${browser}`, () => {
        before(async () => {
          await this.start(browser);
        });

        after(async () => {
          await this.stop();
        });

        afterEach(async () => {
          await this.reset();
        });

        cb();
      });
    }
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

  async getAuthSnapshot(): Promise<Auth> {
    return this.call(TestFunction.AUTH_SNAPSHOT);
  }

  async getUserSnapshot(): Promise<User> {
    return this.call(TestFunction.USER_SNAPSHOT);
  }

  async reset(): Promise<void> {
    return this.call(TestFunction.RESET);
  }

  async waitForAuthInit(): Promise<void> {
    return this.call(TestFunction.AWAIT_AUTH_INIT);
  }

  async refresh(): Promise<void> {
    await this.webDriver.navigate().refresh();
    await this.waitForAuthInit();
  }
}
