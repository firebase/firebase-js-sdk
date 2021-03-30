import { UiFunction } from '../util/functions';
import { WebDriver, until } from 'selenium-webdriver';
import { User } from '@firebase/auth-types';
import { expect } from 'chai';
import { browserDescribe } from '../util/test_runner';
import { UiPage } from '../util/ui_page';
import { AuthDriver } from '../util/auth_driver';
import { IdPPage } from '../util/idp_page';

// These tests only run using the compat layer. Due to npm dependency issues,
// this code needs to stay with the modular tests

browserDescribe('WebDriver integration with FirebaseUI', driver => {
  let page: UiPage;

  beforeEach(async () => {
    await startUi();
    page = new UiPage(driver.webDriver);
  });

  async function waitForLoggedInPage(): Promise<void> {
    await driver.webDriver.wait(until.titleIs('User logged in'));
    await driver.reinitOnRedirect();
  }

  async function startUi(): Promise<void> {
    return driver.call(UiFunction.START);
  }

  context.only('foo', () => {
    it('allows anonymous sign in', async () => {
      await page.clickGuestSignIn();
      await waitForLoggedInPage();
      const snap: User = (await driver.getUserSnapshot()) as User;
      expect(snap.isAnonymous).to.be.true;
      expect(snap.uid).to.be.a('string');
    });

    it('allows google redirect sign in', async () => {
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
      await startUi();
      await waitForLoggedInPage();
      const snap: User = (await driver.getUserSnapshot()) as User;
      expect(snap.isAnonymous).to.be.false;
      expect(snap.displayName).to.eq('Bob Test');
      expect(snap.email).to.eq('bob@bob.test');
      expect(snap.photoURL).to.eq('bob.test');
      expect(snap.uid).to.be.a('string');
    });
  });
});