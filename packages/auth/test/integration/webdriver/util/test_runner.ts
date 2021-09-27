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

import { AuthDriver } from './auth_driver';

/*
 * The most expensive operation in these tests is setting up / tearing down the
 * driver. In order to avoid that cost, all of the tests are collected and
 * bundled into single suites for each browser. To do this, we create a new
 * describe function that is used to generate the new suites.
 *
 * This test is started with the --delay flag, which allows us to control when
 * test execution starts. Collection of the tests is synchronous, but we need
 * a way to ensure that run() is called after they're all added. To accomplish
 * this, we put the final construction of the suites (and the subsequent run()
 * call) after a delay of 1ms.
 */

interface TempSuite {
  generator: (driver: AuthDriver, browser: string) => void;
  title: string;
}

/** The browsers that these tests will run in */
const BROWSERS = ['chrome', 'firefox'];

/** One single AuthDriver instance to control everything */
const DRIVER = new AuthDriver();
const SUITES: TempSuite[] = [];

/** Main entry point for all WebDriver tests */
export function browserDescribe(
  title: string,
  generator: (driver: AuthDriver, browser: string) => void
): void {
  SUITES.push({
    title,
    generator
  });
}

// Construct the final suites after a delay of 1ms, then kick off tests
setTimeout(() => {
  for (const browser of BROWSERS) {
    describe(`Testing in browser "${browser}"`, () => {
      before(async function () {
        this.timeout(20000); // Starting browsers can be slow.
        await DRIVER.start(browser);
      });

      after(async () => {
        await DRIVER.stop();
      });

      // It's assumed that the tests will start with a clean slate (i.e.
      // no storage).
      beforeEach(async () => {
        await DRIVER.closeExtraWindows();
        await DRIVER.reset();
        await DRIVER.injectConfigAndInitAuth();
      });

      for (const { title, generator } of SUITES) {
        describe(title, () => generator(DRIVER, browser));
      }
    });
  }

  run();
}, 1);
