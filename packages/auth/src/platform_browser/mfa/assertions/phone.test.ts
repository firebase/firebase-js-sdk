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

import { ProviderId } from '../../../model/enums';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { mockEndpoint } from '../../../../test/helpers/api/helper';
import {
  testAuth,
  TestAuth,
  testUser
} from '../../../../test/helpers/mock_auth';
import * as mockFetch from '../../../../test/helpers/mock_fetch';
import { Endpoint } from '../../../api';
import { FinalizeMfaResponse } from '../../../api/authentication/mfa';
import { PhoneAuthCredential } from '../../../core/credentials/phone';
import { MultiFactorSessionImpl } from '../../../mfa/mfa_session';
import { PhoneAuthProvider } from '../../providers/phone';
import {
  PhoneMultiFactorAssertionImpl,
  PhoneMultiFactorGenerator
} from './phone';

use(chaiAsPromised);

describe('platform_browser/mfa/phone', () => {
  let auth: TestAuth;
  let credential: PhoneAuthCredential;
  let assertion: PhoneMultiFactorAssertionImpl;
  let session: MultiFactorSessionImpl;

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
    assertion = PhoneMultiFactorAssertionImpl._fromCredential(credential);
  });
  afterEach(mockFetch.tearDown);

  describe('enroll', () => {
    const user = testUser(auth, 'uid');
    beforeEach(() => {
      session = MultiFactorSessionImpl._fromIdtoken(
        'enrollment-id-token',
        user
      );
    });

    it('should finalize the MFA enrollment', async () => {
      const mock = mockEndpoint(
        Endpoint.FINALIZE_MFA_ENROLLMENT,
        serverResponse
      );
      const response = await assertion._process(auth, session);
      expect(response).to.eql(serverResponse);
      expect(mock.calls[0].request).to.eql({
        idToken: 'enrollment-id-token',
        phoneVerificationInfo: {
          code: 'verification-code',
          sessionInfo: 'verification-id'
        }
      });
      expect(session.user).to.not.be.undefined;
      expect(session.user).to.eql(user);
    });

    context('with display name', () => {
      it('should set the display name', async () => {
        const mock = mockEndpoint(
          Endpoint.FINALIZE_MFA_ENROLLMENT,
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
          phoneVerificationInfo: {
            code: 'verification-code',
            sessionInfo: 'verification-id'
          }
        });
        expect(session.user).to.not.be.undefined;
        expect(session.user).to.eql(user);
      });
    });
  });

  describe('sign_in', () => {
    beforeEach(() => {
      session = MultiFactorSessionImpl._fromMfaPendingCredential(
        'mfa-pending-credential'
      );
    });

    it('should finalize the MFA sign in', async () => {
      const mock = mockEndpoint(Endpoint.FINALIZE_MFA_SIGN_IN, serverResponse);
      const response = await assertion._process(auth, session);
      expect(response).to.eql(serverResponse);
      expect(mock.calls[0].request).to.eql({
        mfaPendingCredential: 'mfa-pending-credential',
        phoneVerificationInfo: {
          code: 'verification-code',
          sessionInfo: 'verification-id'
        }
      });
      expect(session.user).to.be.undefined;
    });
  });
});

describe('core/mfa/phone/PhoneMultiFactorGenerator', () => {
  describe('.assertion', () => {
    let credential: PhoneAuthCredential;

    beforeEach(async () => {
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
