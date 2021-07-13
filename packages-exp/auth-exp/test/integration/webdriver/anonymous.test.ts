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
import { OperationType, UserCredential } from '@firebase/auth-exp';
import { expect } from 'chai';
import { AnonFunction } from './util/functions';
import { browserDescribe } from './util/test_runner';

/**
 * Simple smoke test to demonstrate webdriver testing and serve as a template
 * for future tests; anonymous is largely covered by the headless tests in
 * test/integration/flows/anonymous.test.ts
 */
browserDescribe('WebDriver anonymous auth test', driver => {
  it('basic sign in is possible', async () => {
    const cred: UserCredential = await driver.call(
      AnonFunction.SIGN_IN_ANONYMOUSLY
    );
    expect(cred).not.to.be.null;
    expect(cred.user.isAnonymous).to.be.true;
    expect(cred.operationType).to.eq(OperationType.SIGN_IN);
    expect(await driver.getUserSnapshot()).to.eql(cred.user);
  });

  it('same user persists after refresh and sign in', async () => {
    const { user: before }: UserCredential = await driver.call(
      AnonFunction.SIGN_IN_ANONYMOUSLY
    );
    await driver.refresh();

    // First, is the user signed in from persistence?
    expect(await driver.getUserSnapshot()).to.eql(before);

    // Then, sign in again and check
    const { user: after }: UserCredential = await driver.call(
      AnonFunction.SIGN_IN_ANONYMOUSLY
    );
    expect(after.uid).to.eq(before.uid);
  });

  it('user persists after refresh and sign in (no init wait)', async () => {
    const { user: before }: UserCredential = await driver.call(
      AnonFunction.SIGN_IN_ANONYMOUSLY
    );
    await driver.webDriver.navigate().refresh();
    await driver.injectConfigAndInitAuth();

    // At this point we aren't waiting for auth to "settle"
    // Sign in before the first onAuthStateChanged has occurred
    const { user: after }: UserCredential = await driver.call(
      AnonFunction.SIGN_IN_ANONYMOUSLY
    );
    expect(after.uid).to.eq(before.uid);
  });
});
