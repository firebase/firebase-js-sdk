import { CoreFunction, UiFunction } from '../util/functions';
import { WebDriver, until } from 'selenium-webdriver';
import { User } from '@firebase/auth-types';
import { expect } from 'chai';
import { browserDescribe } from '../util/test_runner';
import { UiPage } from '../util/ui_page';
import { AuthDriver } from '../util/auth_driver';
import { IdPPage } from '../util/idp_page';
import { getPhoneVerificationCodes } from '../../../helpers/integration/emulator_rest_helpers';

// These tests only run using the compat layer. Due to npm dependency issues,
// this code needs to stay with the modular tests

browserDescribe('WebDriver integration with FirebaseUI', driver => {
  beforeEach(async () => {
    await driver.call(UiFunction.LOAD);
  });

  async function startUi(): Promise<UiPage> {
    await driver.call(UiFunction.START);
    return new UiPage(driver.webDriver);
  }

  async function waitForLoggedInPage(): Promise<void> {
    await driver.webDriver.wait(until.titleIs('User logged in'));
    await driver.reinitOnRedirect();
  }

  context('foo', () => {
    it('allows anonymous sign in', async () => {
      const page = await startUi();
      await page.clickGuestSignIn();
      await waitForLoggedInPage();
      const snap: User = (await driver.getUserSnapshot()) as User;
      expect(snap.isAnonymous).to.be.true;
      expect(snap.uid).to.be.a('string');
    });

    it('allows google redirect sign in', async () => {
      const page = await startUi();
      await page.clickGoogleSignIn();
      const widget = new IdPPage(driver.webDriver);

      // We're now on the widget page; wait for load
      await widget.pageLoad();
      await widget.clickAddAccount();
      await widget.fillEmail('bob@bob.test');
      await widget.fillDisplayName('Bob Test');
      await widget.fillScreenName('bob.test');
      await widget.fillProfilePhoto('http://bob.test/bob.png');
      await widget.clickSignIn();

      // Now we're back. Firebase UI should handle the redirect result handoff
      await driver.reinitOnRedirect();
      await driver.call(UiFunction.LOAD);
      await startUi();
      await waitForLoggedInPage();
      const snap: User = (await driver.getUserSnapshot()) as User;
      expect(snap.isAnonymous).to.be.false;
      expect(snap.displayName).to.eq('Bob Test');
      expect(snap.email).to.eq('bob@bob.test');
      expect(snap.photoURL).to.eq('http://bob.test/bob.png');
      expect(snap.uid).to.be.a('string');
      expect(snap.providerData[0]!.providerId).to.eq('google.com');
    });

    it('allows google popup sign in', async () => {
      await driver.call(UiFunction.USE_POPUP_CONFIG);
      const page = await startUi();
      await page.clickGoogleSignIn();
      const widget = new IdPPage(driver.webDriver);
      await driver.selectPopupWindow();

      // We're now on the widget page; wait for load
      await widget.pageLoad();
      await widget.clickAddAccount();
      await widget.fillEmail('bob@bob.test');
      await widget.fillDisplayName('Bob Test');
      await widget.fillScreenName('bob.test');
      await widget.fillProfilePhoto('http://bob.test/bob.png');
      await widget.clickSignIn();

      // Now we're back. Firebase UI should handle the redirect result handoff
      await driver.selectMainWindow();
      await waitForLoggedInPage();
      const snap: User = (await driver.getUserSnapshot()) as User;
      expect(snap.isAnonymous).to.be.false;
      expect(snap.displayName).to.eq('Bob Test');
      expect(snap.email).to.eq('bob@bob.test');
      expect(snap.photoURL).to.eq('http://bob.test/bob.png');
      expect(snap.uid).to.be.a('string');
      expect(snap.providerData[0]!.providerId).to.eq('google.com');
    });

    it('allows phone sign in', async () => {
      const page = await startUi();

      // It's not possible to tell the latest session and since the UI
      // is controlling the flow we can't get the session info. Instead
      // we'll rely on a random number and hope it doesn't ever clash
      // with other tests

      const phoneNumber = '415555' + Math.floor(Math.random() * 1000).toString().padStart(4, '0');
      await page.clickPhoneSignIn();
      await page.enterPhoneNumber(phoneNumber);
      await driver.pause(500);
      await page.clickSubmit();

      // Wait for the code input to show (happens after the code is sent)
      await page.waitForCodeInputToBePresent();
      
      // Get the number from the emulator REST endpoint
      const code = Object.values((await getPhoneVerificationCodes())).find(session => session.phoneNumber.includes(phoneNumber))!.code;
      await page.enterPhoneCode(code);
      await page.clickSubmit();

      await waitForLoggedInPage();
      const snap: User = (await driver.getUserSnapshot()) as User;
      expect(snap.isAnonymous).to.be.false;
      expect(snap.phoneNumber).to.eq(`+1${phoneNumber}`);
      expect(snap.uid).to.be.a('string');
    });

    it('allows email sign up/sign in', async () => {
      const page = await startUi();
      await page.clickEmailSignIn();

      await page.enterEmail('foo@foo.test');
      await page.clickSubmit();
      await page.enterEmailDisplayName('Foo Test');
      await page.enterPassword('password');
      await page.clickSubmit();

      await waitForLoggedInPage();
      const snap: User = (await driver.getUserSnapshot()) as User;
      expect(snap.isAnonymous).to.be.false;
      expect(snap.displayName).to.eq('Foo Test');
      expect(snap.email).to.eq('foo@foo.test');

      // Sign up was successful; now try signing in.
      await driver.goToTestPage();
      await driver.injectConfigAndInitAuth();
      await driver.waitForAuthInit();
      await driver.call(CoreFunction.SIGN_OUT);
      await driver.call(UiFunction.LOAD);
      await startUi();
      await page.clickEmailSignIn();
      await page.enterEmail('foo@foo.test');
      await page.clickSubmit();
      await page.enterPassword('password');
      await page.clickSubmit();

      await waitForLoggedInPage();
      expect((await driver.getUserSnapshot()).uid).to.eq(snap.uid);
    });
  });
});