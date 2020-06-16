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

import { expect } from 'chai';

import { Operation } from '@firebase/auth-types-exp';

import { testAuth } from '../../test/mock_auth';
import { Auth } from '../model/auth';
import { ActionCodeURL } from './action_code_url';

describe('core/action_code_url', () => {
  let auth: Auth;
  beforeEach(async () => {
    auth = await testAuth();
  });

  describe('._fromLink', () => {
    it('should parse correctly formatted links', () => {
      const continueUrl = 'https://www.example.com/path/to/file?a=1&b=2#c=3';
      const actionLink =
        'https://www.example.com/finishSignIn?' +
        'oobCode=CODE&mode=signIn&apiKey=API_KEY&' +
        'continueUrl=' +
        encodeURIComponent(continueUrl) +
        '&languageCode=en&tenantId=TENANT_ID&state=bla';
      const actionCodeUrl = ActionCodeURL._fromLink(auth, actionLink);
      expect(actionCodeUrl!.operation).to.eq(Operation.EMAIL_SIGNIN);
      expect(actionCodeUrl!.code).to.eq('CODE');
      expect(actionCodeUrl!.apiKey).to.eq('API_KEY');
      // ContinueUrl should be decoded.
      expect(actionCodeUrl!.continueUrl).to.eq(continueUrl);
      expect(actionCodeUrl!.tenantId).to.eq('TENANT_ID');
      expect(actionCodeUrl!.languageCode).to.eq('en');
    });

    context('operation', () => {
      it('should identitfy EMAIL_SIGNIN', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=signIn&apiKey=API_KEY&' +
          'languageCode=en';
        const actionCodeUrl = ActionCodeURL._fromLink(auth, actionLink);
        expect(actionCodeUrl!.operation).to.eq(Operation.EMAIL_SIGNIN);
      });

      it('should identitfy VERIFY_AND_CHANGE_EMAIL', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=verifyAndChangeEmail&apiKey=API_KEY&' +
          'languageCode=en';
        const actionCodeUrl = ActionCodeURL._fromLink(auth, actionLink);
        expect(actionCodeUrl!.operation).to.eq(
          Operation.VERIFY_AND_CHANGE_EMAIL
        );
      });

      it('should identitfy VERIFY_EMAIL', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=verifyEmail&apiKey=API_KEY&' +
          'languageCode=en';
        const actionCodeUrl = ActionCodeURL._fromLink(auth, actionLink);
        expect(actionCodeUrl!.operation).to.eq(Operation.VERIFY_EMAIL);
      });

      it('should identitfy RECOVER_EMAIL', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=recoverEmail&apiKey=API_KEY&' +
          'languageCode=en';
        const actionCodeUrl = ActionCodeURL._fromLink(auth, actionLink);
        expect(actionCodeUrl!.operation).to.eq(Operation.RECOVER_EMAIL);
      });

      it('should identitfy PASSWORD_RESET', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=resetPassword&apiKey=API_KEY&' +
          'languageCode=en';
        const actionCodeUrl = ActionCodeURL._fromLink(auth, actionLink);
        expect(actionCodeUrl!.operation).to.eq(Operation.PASSWORD_RESET);
      });

      it('should identitfy REVERT_SECOND_FACTOR_ADDITION', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=revertSecondFactorAddition&apiKey=API_KEY&' +
          'languageCode=en';
        const actionCodeUrl = ActionCodeURL._fromLink(auth, actionLink);
        expect(actionCodeUrl!.operation).to.eq(
          Operation.REVERT_SECOND_FACTOR_ADDITION
        );
      });
    });

    it('should work if there is a port number in the URL', () => {
      const actionLink =
        'https://www.example.com:8080/finishSignIn?' +
        'oobCode=CODE&mode=signIn&apiKey=API_KEY&state=bla';
      const actionCodeUrl = ActionCodeURL._fromLink(auth, actionLink);
      expect(actionCodeUrl!.operation).to.eq(Operation.EMAIL_SIGNIN);
      expect(actionCodeUrl!.code).to.eq('CODE');
      expect(actionCodeUrl!.apiKey).to.eq('API_KEY');
      expect(actionCodeUrl!.continueUrl).to.be.null;
      expect(actionCodeUrl!.tenantId).to.be.null;
      expect(actionCodeUrl!.languageCode).to.be.null;
    });

    it('should ignore parameters after anchor', () => {
      const actionLink =
        'https://www.example.com/finishSignIn?' +
        'oobCode=CODE1&mode=signIn&apiKey=API_KEY1&state=bla' +
        '#oobCode=CODE2&mode=signIn&apiKey=API_KEY2&state=bla';
      const actionCodeUrl = ActionCodeURL._fromLink(auth, actionLink);
      expect(actionCodeUrl!.operation).to.eq(Operation.EMAIL_SIGNIN);
      expect(actionCodeUrl!.code).to.eq('CODE1');
      expect(actionCodeUrl!.apiKey).to.eq('API_KEY1');
      expect(actionCodeUrl!.continueUrl).to.be.null;
      expect(actionCodeUrl!.tenantId).to.be.null;
      expect(actionCodeUrl!.languageCode).to.be.null;
    });

    context('invalid links', () => {
      it('should handle missing API key, code & mode', () => {
        const actionLink = 'https://www.example.com/finishSignIn';
        expect(ActionCodeURL._fromLink(auth, actionLink)).to.be.null;
      });

      it('should handle invalid mode', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?oobCode=CODE&mode=INVALID_MODE&apiKey=API_KEY';
        expect(ActionCodeURL._fromLink(auth, actionLink)).to.be.null;
      });

      it('should handle missing code', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?mode=signIn&apiKey=API_KEY';
        expect(ActionCodeURL._fromLink(auth, actionLink)).to.be.null;
      });

      it('should handle missing API key', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?oobCode=CODE&mode=signIn';
        expect(ActionCodeURL._fromLink(auth, actionLink)).to.be.null;
      });

      it('should handle missing mode', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?oobCode=CODE&apiKey=API_KEY';
        expect(ActionCodeURL._fromLink(auth, actionLink)).to.be.null;
      });
    });
  });
});
