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

import { ActionCodeOperation } from '../model/public_types';

import { ActionCodeURL } from './action_code_url';

describe('core/action_code_url', () => {
  describe('._fromLink', () => {
    it('should parse correctly formatted links', () => {
      const continueUrl = 'https://www.example.com/path/to/file?a=1&b=2#c=3';
      const actionLink =
        'https://www.example.com/finishSignIn?' +
        'oobCode=CODE&mode=signIn&apiKey=API_KEY&' +
        'continueUrl=' +
        encodeURIComponent(continueUrl) +
        '&lang=en&tenantId=TENANT_ID&state=bla';
      const actionCodeUrl = ActionCodeURL.parseLink(actionLink);
      expect(actionCodeUrl!.operation).to.eq(ActionCodeOperation.EMAIL_SIGNIN);
      expect(actionCodeUrl!.code).to.eq('CODE');
      expect(actionCodeUrl!.apiKey).to.eq('API_KEY');
      // ContinueUrl should be decoded.
      expect(actionCodeUrl!.continueUrl).to.eq(continueUrl);
      expect(actionCodeUrl!.tenantId).to.eq('TENANT_ID');
      expect(actionCodeUrl!.languageCode).to.eq('en');
    });

    context('operation', () => {
      it('should identify EMAIL_SIGNIN', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=signIn&apiKey=API_KEY&' +
          'lang=en';
        const actionCodeUrl = ActionCodeURL.parseLink(actionLink);
        expect(actionCodeUrl!.operation).to.eq(
          ActionCodeOperation.EMAIL_SIGNIN
        );
      });

      it('should identify VERIFY_AND_CHANGE_EMAIL', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=verifyAndChangeEmail&apiKey=API_KEY&' +
          'lang=en';
        const actionCodeUrl = ActionCodeURL.parseLink(actionLink);
        expect(actionCodeUrl!.operation).to.eq(
          ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL
        );
      });

      it('should identify VERIFY_EMAIL', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=verifyEmail&apiKey=API_KEY&' +
          'lang=en';
        const actionCodeUrl = ActionCodeURL.parseLink(actionLink);
        expect(actionCodeUrl!.operation).to.eq(
          ActionCodeOperation.VERIFY_EMAIL
        );
      });

      it('should identify RECOVER_EMAIL', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=recoverEmail&apiKey=API_KEY&' +
          'lang=en';
        const actionCodeUrl = ActionCodeURL.parseLink(actionLink);
        expect(actionCodeUrl!.operation).to.eq(
          ActionCodeOperation.RECOVER_EMAIL
        );
      });

      it('should identify PASSWORD_RESET', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=resetPassword&apiKey=API_KEY&' +
          'lang=en';
        const actionCodeUrl = ActionCodeURL.parseLink(actionLink);
        expect(actionCodeUrl!.operation).to.eq(
          ActionCodeOperation.PASSWORD_RESET
        );
      });

      it('should identify REVERT_SECOND_FACTOR_ADDITION', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?' +
          'oobCode=CODE&mode=revertSecondFactorAddition&apiKey=API_KEY&' +
          'lang=en';
        const actionCodeUrl = ActionCodeURL.parseLink(actionLink);
        expect(actionCodeUrl!.operation).to.eq(
          ActionCodeOperation.REVERT_SECOND_FACTOR_ADDITION
        );
      });
    });

    it('should work if there is a port number in the URL', () => {
      const actionLink =
        'https://www.example.com:8080/finishSignIn?' +
        'oobCode=CODE&mode=signIn&apiKey=API_KEY&state=bla';
      const actionCodeUrl = ActionCodeURL.parseLink(actionLink);
      expect(actionCodeUrl!.operation).to.eq(ActionCodeOperation.EMAIL_SIGNIN);
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
      const actionCodeUrl = ActionCodeURL.parseLink(actionLink);
      expect(actionCodeUrl!.operation).to.eq(ActionCodeOperation.EMAIL_SIGNIN);
      expect(actionCodeUrl!.code).to.eq('CODE1');
      expect(actionCodeUrl!.apiKey).to.eq('API_KEY1');
      expect(actionCodeUrl!.continueUrl).to.be.null;
      expect(actionCodeUrl!.tenantId).to.be.null;
      expect(actionCodeUrl!.languageCode).to.be.null;
    });

    context('invalid links', () => {
      it('should handle missing API key, code & mode', () => {
        const actionLink = 'https://www.example.com/finishSignIn';
        expect(ActionCodeURL.parseLink(actionLink)).to.be.null;
      });

      it('should handle invalid mode', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?oobCode=CODE&mode=INVALID_MODE&apiKey=API_KEY';
        expect(ActionCodeURL.parseLink(actionLink)).to.be.null;
      });

      it('should handle missing code', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?mode=signIn&apiKey=API_KEY';
        expect(ActionCodeURL.parseLink(actionLink)).to.be.null;
      });

      it('should handle missing API key', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?oobCode=CODE&mode=signIn';
        expect(ActionCodeURL.parseLink(actionLink)).to.be.null;
      });

      it('should handle missing mode', () => {
        const actionLink =
          'https://www.example.com/finishSignIn?oobCode=CODE&apiKey=API_KEY';
        expect(ActionCodeURL.parseLink(actionLink)).to.be.null;
      });
    });
  });
});
