import { ActionCodeSettings, Auth, sendSignInLinkToEmail } from '@firebase/auth';
import { expect, use } from 'chai';
import {
  getTestInstance,
  randomEmail
} from '../../helpers/integration/helpers';
import { getEmulatorUrl } from '../../helpers/integration/settings';
import chaiAsPromised from 'chai-as-promised';
import { FirebaseError } from '@firebase/util';

use(chaiAsPromised);

// Assumes mobileLinksConfig.domain is set as "HOSTING_DOMAIN" in the test GCP-project.
describe('Integration test: hosting link validation', () => {
  let auth: Auth;
  let email: string;

  const AUTHORIZED_CUSTOM_DOMAIN = "localhost/action_code_return";
  const ANDROID_PACKAGE_NAME = "com.google.firebase.test.thin";
  const BASE_SETTINGS: ActionCodeSettings = {
    url: 'http://' + AUTHORIZED_CUSTOM_DOMAIN,
    handleCodeInApp: true,
    android: {packageName: ANDROID_PACKAGE_NAME},
  };
  const VALID_LINK_DOMAIN = "jscore-sandbox.testdomaindonotuse.com";
  const INVALID_LINK_DOMAIN = "invalid.testdomaindonotuse.com";
  const INVALID_LINK_DOMAIN_ERROR = "auth/invalid-hosting-link-domain";
  const TEST_TENANT_ID = 'passpol-tenant-d7hha';

  beforeEach(function () {
    auth = getTestInstance();
    email = randomEmail();

    if (getEmulatorUrl()) {
      this.skip();
    }
  });
  
  it('allows user to sign in with default firebase_hosting_link', async () => {
    // Sends email link to user using default hosting link.
    await sendSignInLinkToEmail(
      auth,
      email,
      BASE_SETTINGS
    );
  });

  it('allows user to sign in to a tenant with default firebase_hosting_link', async () => {
    auth.tenantId = TEST_TENANT_ID;
    // Sends email link to user using default hosting link.
    await sendSignInLinkToEmail(
      auth,
      email,
      BASE_SETTINGS
    );
  });

  it('allows user to sign in with custom firebase hosting link', async () => {
      // Sends email link to user using custom hosting link.
      await sendSignInLinkToEmail(
        auth,
        email,
        {
          ...BASE_SETTINGS,
          linkDomain: VALID_LINK_DOMAIN
        
        }
      );
    }); 

    it('allows user to sign in to a tenant with custom firebase hosting link', async () => {
      // Sends email link to user using custom hosting link.
      auth.tenantId = TEST_TENANT_ID;
      await sendSignInLinkToEmail(
        auth,
        email,
        {
          ...BASE_SETTINGS,
          linkDomain: VALID_LINK_DOMAIN
        
        }
      );
    }); 

    it('sign in with invalid firebase hosting link throws exception', async () => {
      // Throws an exception while sening email link to user using invalid hosting link.
      await expect(sendSignInLinkToEmail(
        auth,
        email,
        {
          ...BASE_SETTINGS,
          linkDomain: INVALID_LINK_DOMAIN
        
        }
      )).to.be.rejectedWith(FirebaseError, new RegExp(".*" + INVALID_LINK_DOMAIN_ERROR + ".*"));
    }); 
});
