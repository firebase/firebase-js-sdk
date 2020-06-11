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

import { ProviderId, SignInMethod } from '@firebase/auth-types-exp';
// eslint-disable-next-line import/no-extraneous-dependencies
import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { testAuth } from '../../../test/mock_auth';
import { Auth } from '../../model/auth';
import { EmailAuthProvider } from './email';

use(chaiAsPromised);

describe('core/providers/email', () => {
  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
  });

  describe('.credential', () => {
    it('should return an email & password credential', () => {
      const credential = EmailAuthProvider.credential('some-email', 'some-password');
      expect(credential.email).to.eq('some-email');
      expect(credential.password).to.eq('some-password');
      expect(credential.providerId).to.eq(ProviderId.PASSWORD);
      expect(credential.signInMethod).to.eq(SignInMethod.EMAIL_PASSWORD);
    });
  });

  describe('.credentialWithLink', () => {
    it('should return an email link credential', () => {
      const continueUrl = 'https://www.example.com/path/to/file?a=1&b=2#c=3';
      const actionLink =
        'https://www.example.com/finishSignIn?' +
        'oobCode=CODE&mode=signIn&apiKey=API_KEY&' +
        'continueUrl=' +
        encodeURIComponent(continueUrl) +
        '&languageCode=en&state=bla';

      const credential = EmailAuthProvider.credentialWithLink(auth, 'some-email', actionLink);
      expect(credential.email).to.eq('some-email');
      expect(credential.password).to.eq('CODE');
      expect(credential.providerId).to.eq(ProviderId.PASSWORD);
      expect(credential.signInMethod).to.eq(SignInMethod.EMAIL_LINK);
    });

    context('invalid email link', () => {
      it('should throw an error', () => {
        const actionLink = 'https://www.example.com/finishSignIn?';
        expect(() =>
          EmailAuthProvider.credentialWithLink(auth, 'some-email', actionLink)
        ).to.throw(FirebaseError, 'Firebase: Error (auth/argument-error)');
      });
    });

    context('mismatched tenant ID', () => {
      it('should throw an error', () => {
        const continueUrl = 'https://www.example.com/path/to/file?a=1&b=2#c=3';
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=signIn&apiKey=API_KEY&' +
          'continueUrl=' +
          encodeURIComponent(continueUrl) +
          '&languageCode=en&tenantId=OTHER_TENANT_ID&state=bla';
        expect(() =>
          EmailAuthProvider.credentialWithLink(auth, 'some-email', actionLink)
        ).to.throw(
          FirebaseError,
          "Firebase: The provided tenant ID does not match the Auth instance's tenant ID (auth/tenant-id-mismatch)."
        );
      });
    });
  });
});