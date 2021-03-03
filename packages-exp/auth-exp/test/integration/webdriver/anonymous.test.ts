// eslint-disable-next-line import/no-extraneous-dependencies
import { OperationType, UserCredential } from '@firebase/auth-exp';
import { expect } from 'chai';
import { TestFunction, AuthDriver } from './util/authdriver';

/**
 * Simple smoke test to demonstrate webdriver testing and serve as a template
 * for future tests; anonymous is largely covered by the headless tests in
 * test/integration/flows/anonymous.test.ts
 */
describe('WebDriver anonymous auth test', () => {
  const driver = new AuthDriver();

  driver.runTestsInAvailableBrowsers(() => {
    it('basic sign in is possible', async () => {
      const cred: UserCredential = await driver.call(TestFunction.SIGN_IN_ANONYMOUSLY);
      expect(cred).not.to.be.null;
      expect(cred.user.isAnonymous).to.be.true;
      expect(cred.operationType).to.eq(OperationType.SIGN_IN);
      expect(await driver.getUserSnapshot()).to.eql(cred.user);
    });

    it('same user persists after refresh and sign in', async () => {
      const {user: before}: UserCredential = await driver.call(TestFunction.SIGN_IN_ANONYMOUSLY);
      await driver.refresh();
      
      // First, is the user signed in from persistence?
      expect(await driver.getUserSnapshot()).to.eql(before);

      // Then, sign in again and check
      const {user: after}: UserCredential = await driver.call(TestFunction.SIGN_IN_ANONYMOUSLY);
      expect(after.uid).to.eq(before.uid);
    });
  });
});