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

// eslint-disable-next-line import/no-extraneous-dependencies
import { OperationType, UserCredential } from '@firebase/auth-exp';
import { expect } from 'chai';
import { TestFunction } from './util/auth_driver';
import { IdPPage } from './util/idp_page';
import { browserDescribe } from './util/test_runner';

browserDescribe('WebDriver redirect IdP test', driver => {
  it('allows users to sign in', async () => {
    await driver.pause(200); // Race condition on auth init
    await driver.callNoWait(TestFunction.IDP_REDIRECT);
    const widget = new IdPPage(driver.webDriver);

    // We're now on the widget page; wait for load
    await widget.pageLoad();
    await widget.clickAddAccount();
    await widget.fillEmail('bob@bob.test');
    await widget.fillDisplayName('Bob Test');
    await widget.fillScreenName('bob.test');
    await widget.fillProfilePhoto('http://bob.test/bob.png');
    await widget.clickSignIn();

    await driver.reinitOnRedirect();

    const currentUser = await driver.getUserSnapshot();
    expect(currentUser.email).to.eq('bob@bob.test');
    expect(currentUser.displayName).to.eq('Bob Test');
    expect(currentUser.photoURL).to.eq('http://bob.test/bob.png');

    const redirectResult: UserCredential = await driver.call(
      TestFunction.REDIRECT_RESULT
    );
    expect(redirectResult.operationType).to.eq(OperationType.SIGN_IN);
    expect(redirectResult.user).to.eql(currentUser);
  });
});
