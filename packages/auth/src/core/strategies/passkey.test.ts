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
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth, testUser } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { UserInternal } from '../../model/user';
import { signInWithPasskey, enrollPasskey } from './passkey';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { APIUserInfo } from '../../api/account_management/account';

use(chaiAsPromised);
use(sinonChai);

describe('passkey', async () => {
  let auth: TestAuth;
  let user: UserInternal;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'mock-uid', '', true);
    mockFetch.setUp();

    const mockUserCredentialImpl = {
      _fromIdTokenResponse: sinon.stub().returns({
        user,
        operationType: 'mock-operation-type'
      })
    };

    sinon
      .stub(UserCredentialImpl, '_fromIdTokenResponse')
      .callsFake(mockUserCredentialImpl._fromIdTokenResponse);
  });

  afterEach(() => {
    sinon.restore();
    mockFetch.tearDown();
  });

  it('should sign in with passkey', async () => {
    if (typeof navigator === 'undefined') {
      return;
    }
    const mockCredential: PublicKeyCredential = {
      id: 'vnl7UPdoJi-ETJi6_obUejdIuc1eIXfUWa1rs5tmacQ',
      type: 'public-key',
      rawId: new Uint8Array([1, 2, 3]),
      response: {
        clientDataJSON: new Uint8Array([4, 5, 6]),
        attestationObject: new Uint8Array([7, 8, 9])
      }
    } as unknown as PublicKeyCredential;

    sinon.stub(navigator.credentials, 'get').resolves(mockCredential);

    mockEndpoint(Endpoint.START_PASSKEY_SIGNIN, {
      credentialRequestOptions: {
        challenge: 'validbase64challenge',
        rpId: 'rp-id',
        userVerification: 'required'
      }
    });

    mockEndpoint(Endpoint.FINALIZE_PASSKEY_SIGNIN, {
      idToken: 'id-token',
      refreshToken: 'refresh-token'
    });

    await signInWithPasskey(auth, 'name');
    expect(auth.currentUser?.uid).to.eq('mock-uid');
  });

  it('should sign in with manualSignUp set to false', async () => {
    if (typeof navigator === 'undefined') {
      return;
    }
    sinon
      .stub(navigator.credentials, 'get')
      .throws(new Error('The operation either timed out or was not allowed.'));

    const mockCredential: PublicKeyCredential = {
      id: 'vnl7UPdoJi-ETJi6_obUejdIuc1eIXfUWa1rs5tmacQ',
      type: 'public-key',
      rawId: new Uint8Array([1, 2, 3]),
      response: {
        clientDataJSON: new Uint8Array([4, 5, 6]),
        attestationObject: new Uint8Array([7, 8, 9])
      }
    } as unknown as PublicKeyCredential;

    sinon.stub(navigator.credentials, 'create').resolves(mockCredential);

    const serverUser: APIUserInfo = {
      localId: 'local-id'
    };

    mockEndpoint(Endpoint.SIGN_UP, {
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '1234',
      localId: serverUser.localId!
    });
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });

    mockEndpoint(Endpoint.START_PASSKEY_SIGNIN, {
      credentialRequestOptions: {
        challenge: 'validbase64challenge',
        rpId: 'rp-id',
        userVerification: 'required'
      }
    });

    mockEndpoint(Endpoint.START_PASSKEY_ENROLLMENT, {
      credentialCreationOptions: {
        rp: {
          name: 'mock-rp'
        },
        user: {
          id: 'mockuser',
          name: 'mock-user',
          displayName: 'Mock User'
        },
        challenge: 'validbase64challenge',
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        timeout: 60000,
        excludeCredentials: [],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: false,
          userVerification: 'required'
        },
        attestation: 'direct',
        extensions: {
          example: true
        }
      }
    });

    mockEndpoint(Endpoint.FINALIZE_PASSKEY_ENROLLMENT, {
      idToken: 'id-token',
      refreshToken: 'refresh-token'
    });

    await signInWithPasskey(auth, 'name', false);
    expect(auth.currentUser?.uid).to.eq('mock-uid');
  });

  it('should failed with no passkey found locally', async () => {
    if (typeof navigator === 'undefined') {
      return;
    }
    sinon
      .stub(navigator.credentials, 'get')
      .throws(new Error('The operation either timed out or was not allowed.'));

    mockEndpoint(Endpoint.START_PASSKEY_SIGNIN, {
      credentialRequestOptions: {
        challenge: 'validbase64challenge',
        rpId: 'rp-id',
        userVerification: 'required'
      }
    });

    mockEndpoint(Endpoint.FINALIZE_PASSKEY_SIGNIN, {
      idToken: 'id-token',
      refreshToken: 'refresh-token'
    });

    try {
      await signInWithPasskey(auth, 'name', true);
      // If the function does not throw an error, fail the test
      expect.fail('Expected function to throw an error');
    } catch (error) {
      // If the function throws an error, assert that the error message is correct
      expect((error as Error).message).to.equal(
        'The operation either timed out or was not allowed.'
      );
    }
  });

  it('should enroll passkey', async () => {
    if (typeof navigator === 'undefined') {
      return;
    }
    const mockCredential: PublicKeyCredential = {
      id: 'vnl7UPdoJi-ETJi6_obUejdIuc1eIXfUWa1rs5tmacQ',
      type: 'public-key',
      rawId: new Uint8Array([1, 2, 3]),
      response: {
        clientDataJSON: new Uint8Array([4, 5, 6]),
        attestationObject: new Uint8Array([7, 8, 9])
      }
    } as unknown as PublicKeyCredential;

    sinon.stub(navigator.credentials, 'create').resolves(mockCredential);

    mockEndpoint(Endpoint.START_PASSKEY_ENROLLMENT, {
      credentialCreationOptions: {
        rp: {
          name: 'mock-rp'
        },
        user: {
          id: 'mockuser',
          name: 'mock-user',
          displayName: 'Mock User'
        },
        challenge: 'validbase64challenge',
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        timeout: 60000,
        excludeCredentials: [],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: false,
          userVerification: 'required'
        },
        attestation: 'direct',
        extensions: {
          example: true
        }
      }
    });

    mockEndpoint(Endpoint.FINALIZE_PASSKEY_ENROLLMENT, {
      idToken: 'id-token',
      refreshToken: 'refresh-token'
    });

    const userCred = await enrollPasskey(user, 'name');
    expect(userCred.user?.uid).to.eq('mock-uid');
  });

  it('should enroll passkey failed if failed to create passkey', async () => {
    if (typeof navigator === 'undefined') {
      return;
    }
    sinon
      .stub(navigator.credentials, 'create')
      .throws(new Error('The operation either timed out or was not allowed.'));

    mockEndpoint(Endpoint.START_PASSKEY_ENROLLMENT, {
      credentialCreationOptions: {
        rp: {
          name: 'mock-rp'
        },
        user: {
          id: 'mockuser',
          name: 'mock-user',
          displayName: 'Mock User'
        },
        challenge: 'validbase64challenge',
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        timeout: 60000,
        excludeCredentials: [],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: false,
          userVerification: 'required'
        },
        attestation: 'direct',
        extensions: {
          example: true
        }
      }
    });

    mockEndpoint(Endpoint.FINALIZE_PASSKEY_ENROLLMENT, {
      idToken: 'id-token',
      refreshToken: 'refresh-token'
    });

    try {
      await enrollPasskey(user, 'name');
      // If the function does not throw an error, fail the test
      expect.fail('Expected function to throw an error');
    } catch (error) {
      // If the function throws an error, assert that the error message is correct
      expect((error as Error).message).to.equal(
        'The operation either timed out or was not allowed.'
      );
    }
  });
});
