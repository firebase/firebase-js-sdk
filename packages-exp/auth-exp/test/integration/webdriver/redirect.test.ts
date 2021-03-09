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

import {
  OperationType,
  UserCredential,
  User,
  OAuthCredential
  // eslint-disable-next-line import/no-extraneous-dependencies
} from '@firebase/auth-exp';
import { expect, use } from 'chai';
import { IdPPage } from './util/idp_page';
import * as chaiAsPromised from 'chai-as-promised';
import { browserDescribe } from './util/test_runner';
import {
  AnonFunction,
  CoreFunction,
  EmailFunction,
  RedirectFunction
} from './util/functions';

use(chaiAsPromised);

browserDescribe('WebDriver redirect IdP test', driver => {
  beforeEach(async () => {
    await driver.pause(200); // Race condition on auth init
  });

  it('allows users to sign in', async () => {
    await driver.callNoWait(RedirectFunction.IDP_REDIRECT);
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
      RedirectFunction.REDIRECT_RESULT
    );
    expect(redirectResult.operationType).to.eq(OperationType.SIGN_IN);
    expect(redirectResult.user).to.eql(currentUser);
  });

  it('can link with another account account', async () => {
    // First, sign in anonymously
    const { user: anonUser }: UserCredential = await driver.call(
      AnonFunction.SIGN_IN_ANONYMOUSLY
    );

    // Then, link with redirect
    await driver.callNoWait(RedirectFunction.IDP_LINK_REDIRECT);
    const widget = new IdPPage(driver.webDriver);
    await widget.pageLoad();
    await widget.clickAddAccount();
    await widget.fillEmail('bob@bob.test');
    await widget.clickSignIn();

    await driver.reinitOnRedirect();
    // Back on page; check for the current user matching the anonymous account
    // as well as the new IdP account
    const user: User = await driver.getUserSnapshot();
    expect(user.uid).to.eq(anonUser.uid);
    expect(user.email).to.eq('bob@bob.test');
  });

  it('can be converted to a credential', async () => {
    // Start with redirect
    await driver.callNoWait(RedirectFunction.IDP_REDIRECT);
    const widget = new IdPPage(driver.webDriver);
    await widget.pageLoad();
    await widget.clickAddAccount();
    await widget.fillEmail('bob@bob.test');
    await widget.clickSignIn();

    // Generate a credential, then store it on the window before logging out
    await driver.reinitOnRedirect();
    const first = await driver.getUserSnapshot();
    const cred: OAuthCredential = await driver.call(
      RedirectFunction.GENERATE_CREDENTIAL_FROM_RESULT
    );
    expect(cred.accessToken).to.be.a('string');
    expect(cred.idToken).to.be.a('string');
    expect(cred.signInMethod).to.eq('google.com');

    // We've now generated that credential. Sign out and sign back in using it
    await driver.call(CoreFunction.SIGN_OUT);
    const { user: second }: UserCredential = await driver.call(
      RedirectFunction.SIGN_IN_WITH_REDIRECT_CREDENTIAL
    );
    expect(second.uid).to.eq(first.uid);
    expect(second.providerData).to.eql(first.providerData);
  });

  it('handles account exists different credential errors', async () => {
    // Start with redirect and a verified account
    await driver.callNoWait(RedirectFunction.IDP_REDIRECT);
    const widget = new IdPPage(driver.webDriver);
    await widget.pageLoad();
    await widget.clickAddAccount();
    await widget.fillEmail('bob@bob.test');
    await widget.clickSignIn();
    await driver.reinitOnRedirect();

    const original = await driver.getUserSnapshot();
    expect(original.emailVerified).to.be.true;

    // Try to sign in with an unverified Facebook account
    // TODO: Convert this to the widget once unverified accounts work
    // Come back and verify error / prepare for link
    await expect(
      driver.call(RedirectFunction.TRY_TO_SIGN_IN_UNVERIFIED, 'bob@bob.test')
    ).to.be.rejected.and.eventually.have.property(
      'code',
      'auth/account-exists-with-different-credential'
    );

    // Now do the link
    await driver.call(RedirectFunction.LINK_WITH_ERROR_CREDENTIAL);

    // Check the user for both providers
    const user = await driver.getUserSnapshot();
    expect(user.uid).to.eq(original.uid);
    expect(user.providerData.map(d => d.providerId)).to.have.members([
      'google.com',
      'facebook.com'
    ]);
  });

  it('does not auto-upgrade anon accounts', async () => {
    const { user: anonUser }: UserCredential = await driver.call(
      AnonFunction.SIGN_IN_ANONYMOUSLY
    );
    await driver.callNoWait(RedirectFunction.IDP_REDIRECT);
    const widget = new IdPPage(driver.webDriver);
    await widget.pageLoad();
    await widget.clickAddAccount();
    await widget.fillEmail('bob@bob.test');
    await widget.clickSignIn();

    // On redirect, check that the signed in user is different
    await driver.reinitOnRedirect();
    const curUser = await driver.getUserSnapshot();
    expect(curUser.uid).not.to.eq(anonUser.uid);
  });

  it('linking with anonymous user upgrades account', async () => {
    const { user: anonUser }: UserCredential = await driver.call(
      AnonFunction.SIGN_IN_ANONYMOUSLY
    );
    await driver.callNoWait(RedirectFunction.IDP_LINK_REDIRECT);
    const widget = new IdPPage(driver.webDriver);
    await widget.pageLoad();
    await widget.clickAddAccount();
    await widget.fillEmail('bob@bob.test');
    await widget.clickSignIn();

    // On redirect, check that the signed in user is upgraded
    await driver.reinitOnRedirect();
    const curUser = await driver.getUserSnapshot();
    expect(curUser.uid).to.eq(anonUser.uid);
    expect(curUser.isAnonymous).to.be.false;
  });

  it('is possible to link with different email', async () => {
    const { user: emailUser }: UserCredential = await driver.call(
      EmailFunction.CREATE_USER,
      'user@test.test'
    );

    // Link using pre-poulated user
    await driver.callNoWait(RedirectFunction.IDP_LINK_REDIRECT);

    const widget = new IdPPage(driver.webDriver);
    await widget.pageLoad();
    await widget.clickAddAccount();
    await widget.fillEmail('other-user@test.test');
    await widget.clickSignIn();

    // Check the linked account
    await driver.reinitOnRedirect();
    const curUser = await driver.getUserSnapshot();
    expect(curUser.uid).to.eq(emailUser.uid);
    expect(curUser.emailVerified).to.be.false;
    expect(curUser.providerData.length).to.eq(2);
  });

  it('is possible to link with the same email', async () => {
    const { user: emailUser }: UserCredential = await driver.call(
      EmailFunction.CREATE_USER,
      'same@test.test'
    );

    // Link using pre-poulated user
    await driver.callNoWait(RedirectFunction.IDP_LINK_REDIRECT);

    const widget = new IdPPage(driver.webDriver);
    await widget.pageLoad();
    await widget.clickAddAccount();
    await widget.fillEmail('same@test.test');
    await widget.clickSignIn();

    // Check the linked account
    await driver.reinitOnRedirect();
    const curUser = await driver.getUserSnapshot();
    expect(curUser.uid).to.eq(emailUser.uid);
    expect(curUser.emailVerified).to.be.true;
    expect(curUser.providerData.length).to.eq(2);
  });

  context('with existing user', () => {
    let user1: User;
    let user2: User;

    beforeEach(async () => {
      // Create a couple existing users
      let cred: UserCredential = await driver.call(
        RedirectFunction.CREATE_FAKE_GOOGLE_USER,
        'bob@bob.test'
      );
      user1 = cred.user;
      cred = await driver.call(
        RedirectFunction.CREATE_FAKE_GOOGLE_USER,
        'sally@sally.test'
      );
      user2 = cred.user;
      await driver.call(CoreFunction.SIGN_OUT);
    });

    it('a user can sign in again', async () => {
      // Sign in using pre-poulated user
      await driver.callNoWait(RedirectFunction.IDP_REDIRECT);

      // This time, select an existing account
      const widget = new IdPPage(driver.webDriver);
      await widget.pageLoad();
      await widget.selectExistingAccountByEmail(user1.email!);

      // Double check the new sign in matches the old
      await driver.reinitOnRedirect();
      const user = await driver.getUserSnapshot();
      expect(user.uid).to.eq(user1.uid);
      expect(user.email).to.eq(user1.email);
    });

    it('reauthenticate works for the correct user', async () => {
      // Sign in using pre-poulated user
      await driver.callNoWait(RedirectFunction.IDP_REDIRECT);

      const widget = new IdPPage(driver.webDriver);
      await widget.pageLoad();
      await widget.selectExistingAccountByEmail(user1.email!);

      // Double check the new sign in matches the old
      await driver.reinitOnRedirect();
      let user = await driver.getUserSnapshot();
      expect(user.uid).to.eq(user1.uid);
      expect(user.email).to.eq(user1.email);

      // Reauthenticate specifically
      await driver.callNoWait(RedirectFunction.IDP_REAUTH_REDIRECT);
      await widget.pageLoad();
      await widget.selectExistingAccountByEmail(user1.email!);

      await driver.reinitOnRedirect();
      user = await driver.getUserSnapshot();
      expect(user.uid).to.eq(user1.uid);
      expect(user.email).to.eq(user1.email);
    });

    it('reauthenticate throws for wrong user', async () => {
      // Sign in using pre-poulated user
      await driver.callNoWait(RedirectFunction.IDP_REDIRECT);

      const widget = new IdPPage(driver.webDriver);
      await widget.pageLoad();
      await widget.selectExistingAccountByEmail(user1.email!);

      // Immediately reauth but with the wrong user
      await driver.reinitOnRedirect();
      await driver.callNoWait(RedirectFunction.IDP_REAUTH_REDIRECT);
      await widget.pageLoad();
      await widget.selectExistingAccountByEmail(user2.email!);

      await driver.reinitOnRedirect();
      await expect(
        driver.call(RedirectFunction.REDIRECT_RESULT)
      ).to.be.rejected.and.eventually.have.property(
        'code',
        'auth/user-mismatch'
      );
    });

    it('handles aborted sign ins', async () => {
      await driver.callNoWait(RedirectFunction.IDP_REDIRECT);
      const widget = new IdPPage(driver.webDriver);

      // Don't actually sign in; go back to the previous page
      await widget.pageLoad();
      await driver.goToTestPage();
      await driver.reinitOnRedirect();
      expect(await driver.getUserSnapshot()).to.be.null;

      // Now do sign in
      await driver.callNoWait(RedirectFunction.IDP_REDIRECT);
      // Use user1
      await widget.pageLoad();
      await widget.selectExistingAccountByEmail(user1.email!);

      // Ensure the user was signed in...
      await driver.reinitOnRedirect();
      let user = await driver.getUserSnapshot();
      expect(user.uid).to.eq(user1.uid);
      expect(user.email).to.eq(user1.email);

      // Now open another sign in, but return
      await driver.callNoWait(RedirectFunction.IDP_REAUTH_REDIRECT);
      await widget.pageLoad();
      await driver.goToTestPage();
      await driver.reinitOnRedirect();

      // Make sure state remained
      user = await driver.getUserSnapshot();
      expect(user.uid).to.eq(user1.uid);
      expect(user.email).to.eq(user1.email);
    });
  });
});
