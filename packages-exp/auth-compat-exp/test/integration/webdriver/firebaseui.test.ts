import { browserDescribe } from '../../../../auth-exp/test/integration/webdriver/util/test_runner';
import { UiFunction } from './util/functions';
import { WebDriver, until } from 'selenium-webdriver';
import { UiPage } from './util/ui_page';
import { User } from '@firebase/auth-types';
import { expect } from 'chai';

async function waitForLogInPage(driver: WebDriver): Promise<void> {
  await driver.wait(until.titleIs('User logged in'));
}

browserDescribe('WebDriver integration with FirebaseUI', driver => {
  let page: UiPage;

  beforeEach(async () => {
    await driver.call(UiFunction.START);
    page = new UiPage(driver.webDriver);
  });

  it.only('starts the UI', async () => {
    await page.clickGuestSignIn();
    await waitForLogInPage(driver.webDriver);
    const snap: User = (await driver.getUserSnapshot()) as User;
    expect(snap.isAnonymous).to.be.true;
    expect(snap.uid).to.be.a('string');
  });
});