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

import { mockEndpoint } from '../../../test/api/helper';
import { testAuth } from '../../../test/mock_auth';
import * as fetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { Auth } from '../../model/auth';
import { IdTokenResponse } from '../../model/id_token';
import { PhoneAuthCredential } from './phone_credential';

describe('core/strategies/phone_credential', () => {
  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    fetch.setUp();
  });

  afterEach(() => {
    fetch.tearDown();
  });

  context('#_getIdTokenResponse', () => {
    const response: IdTokenResponse = {
      idToken: '',
      refreshToken: '',
      kind: '',
      expiresIn: '10',
      localId: ''
    };

    it('calls the endpoint with session and code', async () => {
      const cred = new PhoneAuthCredential({
        verificationId: 'session-info',
        verificationCode: 'code'
      });

      const route = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, response);

      expect(await cred._getIdTokenResponse(auth)).to.eql(response);
      expect(route.calls[0].request).to.eql({
        sessionInfo: 'session-info',
        code: 'code'
      });
    });

    it('calls the endpoint with proof and number', async () => {
      const cred = new PhoneAuthCredential({
        temporaryProof: 'temp-proof',
        phoneNumber: 'number'
      });

      const route = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, response);

      expect(await cred._getIdTokenResponse(auth)).to.eql(response);
      expect(route.calls[0].request).to.eql({
        temporaryProof: 'temp-proof',
        phoneNumber: 'number'
      });
    });
  });

  context('#toJSON', () => {
    it('fills out the object with everything that is set', () => {
      const cred = new PhoneAuthCredential({
        temporaryProof: 'proof',
        phoneNumber: 'number',
        verificationId: 'id',
        verificationCode: 'code'
      });

      expect(cred.toJSON()).to.eql({
        providerId: 'phone',
        temporaryProof: 'proof',
        phoneNumber: 'number',
        verificationId: 'id',
        verificationCode: 'code'
      });
    });

    it('omits missing fields', () => {
      const cred = new PhoneAuthCredential({
        temporaryProof: 'proof',
        phoneNumber: 'number'
      });

      expect(cred.toJSON()).to.eql({
        providerId: 'phone',
        temporaryProof: 'proof',
        phoneNumber: 'number'
      });
    });
  });

  context('.fromJSON', () => {
    it('works if passed a string', () => {
      const cred = PhoneAuthCredential.fromJSON('{"phoneNumber": "number"}');
      expect(cred?.toJSON()).to.eql({
        providerId: 'phone',
        phoneNumber: 'number'
      });
    });

    it('works if passed an object', () => {
      const cred = PhoneAuthCredential.fromJSON({
        temporaryProof: 'proof',
        phoneNumber: 'number',
        verificationId: 'id',
        verificationCode: 'code'
      });
      expect(cred?.toJSON()).to.eql({
        providerId: 'phone',
        temporaryProof: 'proof',
        phoneNumber: 'number',
        verificationId: 'id',
        verificationCode: 'code'
      });
    });

    it('returns null if object contains no matching fields', () => {
      expect(PhoneAuthCredential.fromJSON({})).to.be.null;
    });
  });
});
