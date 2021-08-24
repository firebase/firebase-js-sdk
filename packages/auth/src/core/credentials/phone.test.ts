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

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { IdTokenResponse, IdTokenResponseKind } from '../../model/id_token';
import { PhoneAuthCredential } from '../credentials/phone';

describe('core/credentials/phone', () => {
  let auth: TestAuth;

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
      kind: IdTokenResponseKind.CreateAuthUri,
      expiresIn: '10',
      localId: ''
    };

    it('calls the endpoint with session and code', async () => {
      const cred = PhoneAuthCredential._fromVerification(
        'session-info',
        'code'
      );

      const route = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, response);

      expect(await cred._getIdTokenResponse(auth)).to.eql(response);
      expect(route.calls[0].request).to.eql({
        sessionInfo: 'session-info',
        code: 'code'
      });
    });

    it('calls the endpoint with proof and number', async () => {
      const cred = PhoneAuthCredential._fromTokenResponse(
        'number',
        'temp-proof'
      );

      const route = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, response);

      expect(await cred._getIdTokenResponse(auth)).to.eql(response);
      expect(route.calls[0].request).to.eql({
        temporaryProof: 'temp-proof',
        phoneNumber: 'number'
      });
    });
  });

  context('#_linkToIdToken', () => {
    const response: IdTokenResponse = {
      idToken: '',
      refreshToken: '',
      kind: IdTokenResponseKind.CreateAuthUri,
      expiresIn: '10',
      localId: 'uid'
    };

    it('calls the endpoint with session and code', async () => {
      const cred = PhoneAuthCredential._fromVerification(
        'session-info',
        'code'
      );

      const route = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, response);

      expect(await cred._linkToIdToken(auth, 'id-token')).to.eql(response);
      expect(route.calls[0].request).to.eql({
        sessionInfo: 'session-info',
        code: 'code',
        idToken: 'id-token'
      });
    });

    it('calls the endpoint with proof and number', async () => {
      const cred = PhoneAuthCredential._fromTokenResponse(
        'number',
        'temp-proof'
      );

      const route = mockEndpoint(Endpoint.SIGN_IN_WITH_PHONE_NUMBER, response);

      expect(await cred._linkToIdToken(auth, 'id-token')).to.eql(response);
      expect(route.calls[0].request).to.eql({
        temporaryProof: 'temp-proof',
        phoneNumber: 'number',
        idToken: 'id-token'
      });
    });
  });

  context('#toJSON', () => {
    it('fills out the object with everything that is set', () => {
      const cred = PhoneAuthCredential._fromVerification('id', 'code');

      expect(cred.toJSON()).to.eql({
        providerId: 'phone',
        verificationId: 'id',
        verificationCode: 'code'
      });
    });

    it('omits missing fields', () => {
      const cred = PhoneAuthCredential._fromTokenResponse('number', 'proof');

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
