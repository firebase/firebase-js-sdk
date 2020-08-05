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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { ProviderId } from '@firebase/auth-types-exp';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { FinalizeMfaResponse } from '../../api/authentication/mfa';
import { PhoneAuthCredential } from '../../core/credentials/phone';
import { PhoneAuthProvider } from '../../core/providers/phone';
import { MultiFactorSession } from '../mfa_session';
import { PhoneMultiFactorAssertion, PhoneMultiFactorGenerator } from './phone';

use(chaiAsPromised);

describe('core/mfa/phone/PhoneMultiFactorAssertion', () => {
  let auth: TestAuth;
  let credential: PhoneAuthCredential;
  let assertion: PhoneMultiFactorAssertion;
  let session: MultiFactorSession;

  const serverResponse: FinalizeMfaResponse = {
    idToken: 'final-id-token',
    refreshToken: 'refresh-token'
  };

  beforeEach(async () => {
    mockFetch.setUp();
    auth = await testAuth();
    credential = PhoneAuthProvider.credential(
      'verification-id',
      'verification-code'
    );
    assertion = PhoneMultiFactorAssertion._fromCredential(credential);
  });
  afterEach(mockFetch.tearDown);

  describe('enroll', () => {
    beforeEach(() => {
      session = MultiFactorSession._fromIdtoken('enrollment-id-token');
    });

    it('should finalize the MFA enrollment', async () => {
      const mock = mockEndpoint(
        Endpoint.FINALIZE_PHONE_MFA_ENROLLMENT,
        serverResponse
      );
      const response = await assertion._process(auth, session);
      expect(response).to.eql(serverResponse);
      expect(mock.calls[0].request).to.eql({
        idToken: 'enrollment-id-token',
        tenantId: auth.tenantId,
        phoneVerificationInfo: {
          code: 'verification-code',
          sessionInfo: 'verification-id'
        }
      });
    });

    context('with display name', () => {
      it('should set the display name', async () => {
        const mock = mockEndpoint(
          Endpoint.FINALIZE_PHONE_MFA_ENROLLMENT,
          serverResponse
        );
        const response = await assertion._process(
          auth,
          session,
          'display-name'
        );
        expect(response).to.eql(serverResponse);
        expect(mock.calls[0].request).to.eql({
          idToken: 'enrollment-id-token',
          displayName: 'display-name',
          tenantId: auth.tenantId,
          phoneVerificationInfo: {
            code: 'verification-code',
            sessionInfo: 'verification-id'
          }
        });
      });
    });
  });

  describe('sign_in', () => {
    beforeEach(() => {
      session = MultiFactorSession._fromMfaPendingCredential(
        'mfa-pending-credential'
      );
    });

    it('should finalize the MFA sign in', async () => {
      const mock = mockEndpoint(
        Endpoint.FINALIZE_PHONE_MFA_SIGN_IN,
        serverResponse
      );
      const response = await assertion._process(auth, session);
      expect(response).to.eql(serverResponse);
      expect(mock.calls[0].request).to.eql({
        mfaPendingCredential: 'mfa-pending-credential',
        tenantId: null,
        phoneVerificationInfo: {
          code: 'verification-code',
          sessionInfo: 'verification-id'
        }
      });
    });
  });
});

describe('core/mfa/phone/PhoneMultiFactorGenerator', () => {
  describe('.assertion', () => {
    let auth: TestAuth;
    let credential: PhoneAuthCredential;

    beforeEach(async () => {
      auth = await testAuth();
      credential = PhoneAuthProvider.credential(
        'verification-id',
        'verification-code'
      );
    });

    it('can be used to create an assertion', () => {
      const assertion = PhoneMultiFactorGenerator.assertion(credential);
      expect(assertion.factorId).to.eq(ProviderId.PHONE);
    });
  });
});
