/**
 * @license
 * Copyright 2026 Google LLC
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

declare const browser: any;
declare const driver: any;

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  createUserWithEmailAndPassword,
  enrollPasskey,
  signInWithPasskey,
  unenrollPasskey,
  signOut,
  Auth,
  reload
} from '@firebase/auth';

import {
  cleanUpTestInstance,
  getTestInstance,
  randomEmail
} from '../../helpers/integration/helpers';

use(chaiAsPromised);

// Helper function to check if the current browser is Chrome
const isChrome = (): boolean => {
  if (typeof browser !== 'undefined' && browser.capabilities) {
    const capabilities = browser.capabilities;
    return (
      capabilities.browserName &&
      capabilities.browserName.toLowerCase().includes('chrome')
    );
  }
  if (typeof navigator !== 'undefined') {
    return (
      navigator.userAgent.toLowerCase().includes('chrome') ||
      navigator.userAgent.toLowerCase().includes('chromium')
    );
  }
  return false;
};

// Define a helper/wrapper for virtual authenticator control
const getVirtualAuthenticatorDriver = (): any => {
  if (typeof driver !== 'undefined') {
    let authenticatorId: string | null = null;
    return {
      addWebAuthnCredential: async (options: any) => {
        if (!authenticatorId) {
          const result = (await driver.addVirtualAuthenticator({
            protocol: options.protocol || 'ctap2',
            transport: options.transport || 'usb',
            hasResidentKey: options.hasResidentKey ?? true,
            hasUserVerification: options.hasUserVerification ?? true,
            isUserConsenting: options.isUserConsenting ?? true
          })) as any;
          authenticatorId =
            typeof result === 'string' ? result : result.authenticatorId;
        }

        const mockCredId = 'mock-credential-id';
        await driver.addCredential({
          authenticatorId,
          credentialId: mockCredId,
          isResidentCredential: options.hasResidentKey ?? true,
          rpId: 'localhost',
          privateKey: 'Base64PrivateKey...',
          signCount: 0
        });
        return mockCredId;
      },
      setWebAuthnUserVerified: async (verified: boolean) => {
        if (authenticatorId) {
          await driver.setUserVerified(authenticatorId, verified);
        }
      }
    };
  }

  // Karma / Browser fallback: mock navigator.credentials using sinon
  return {
    addWebAuthnCredential: async (_options: any) => {
      const mockCredId = 'mock-credential-id';
      let callCount = 0;

      if (typeof navigator !== 'undefined' && navigator.credentials) {
        if ((navigator.credentials.create as any).restore) {
          (navigator.credentials.create as any).restore();
        }
        if ((navigator.credentials.get as any).restore) {
          (navigator.credentials.get as any).restore();
        }

        sinon.stub(navigator.credentials, 'create').callsFake(async () => {
          callCount++;
          if (callCount > 1) {
            throw new DOMException(
              'The credential already exists.',
              'InvalidStateError'
            );
          }
          const responseCreate = {
            clientDataJSON: new TextEncoder().encode(
              JSON.stringify({
                type: 'webauthn.create',
                challenge: 'validbase64challenge',
                origin: window.location.origin
              })
            ),
            attestationObject: new Uint8Array([1, 2, 3])
          };
          if (typeof AuthenticatorAttestationResponse !== 'undefined') {
            Object.setPrototypeOf(
              responseCreate,
              AuthenticatorAttestationResponse.prototype
            );
          }
          return {
            id: mockCredId,
            type: 'public-key',
            rawId: new TextEncoder().encode(mockCredId),
            response: responseCreate
          } as any;
        });

        const responseGet = {
          clientDataJSON: new TextEncoder().encode(
            JSON.stringify({
              type: 'webauthn.get',
              challenge: 'validbase64challenge',
              origin: window.location.origin
            })
          ),
          authenticatorData: new Uint8Array([1, 2, 3]),
          signature: new Uint8Array([4, 5, 6]),
          userHandle: new TextEncoder().encode('mockuser')
        };
        if (typeof AuthenticatorAssertionResponse !== 'undefined') {
          Object.setPrototypeOf(
            responseGet,
            AuthenticatorAssertionResponse.prototype
          );
        }
        sinon.stub(navigator.credentials, 'get').resolves({
          id: mockCredId,
          type: 'public-key',
          rawId: new TextEncoder().encode(mockCredId),
          response: responseGet
        } as any);
      }
      return mockCredId;
    },

    setWebAuthnUserVerified: async (verified: boolean) => {
      if (typeof navigator !== 'undefined' && navigator.credentials) {
        if (!verified) {
          if ((navigator.credentials.create as any).restore) {
            (navigator.credentials.create as any).restore();
          }
          if ((navigator.credentials.get as any).restore) {
            (navigator.credentials.get as any).restore();
          }

          sinon
            .stub(navigator.credentials, 'create')
            .rejects(
              new DOMException(
                'The operation either timed out or was not allowed.',
                'NotAllowedError'
              )
            );
          sinon
            .stub(navigator.credentials, 'get')
            .rejects(
              new DOMException(
                'The operation either timed out or was not allowed.',
                'NotAllowedError'
              )
            );
        }
      }
    }
  };
};

const createMockJwt = (uid: string, uniqueSeed: string): string => {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const payload = btoa(
    JSON.stringify({
      sub: uid,
      // eslint-disable-next-line camelcase
      user_id: uid,
      exp,
      iat: exp - 3600,
      iss: 'https://securetoken.google.com/emulatedproject',
      aud: 'emulatedproject',
      seed: uniqueSeed
    })
  );
  return `${header}.${payload}.signature`;
};

const jwtWithPasskey = createMockJwt('mock-uid', 'with-passkey');
const jwtWithoutPasskey = createMockJwt('mock-uid', 'without-passkey');

let currentToken = '';

const setupMockFetch = (): void => {
  currentToken = '';

  const originalFetch = window.fetch.bind(window);

  sinon.stub(window, 'fetch').callsFake(async (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const bodyStr = init?.body ? String(init.body) : '';
    let body: any = {};
    if (bodyStr) {
      try {
        body = JSON.parse(bodyStr);
      } catch {
        // Safe fallback for non-JSON bodies
      }
    }

    if (url.includes('passkeyEnrollment:start')) {
      const resp = {
        credentialCreationOptions: {
          rp: { name: window.location.hostname },
          user: {
            id: 'bW9ja3VzZXI=',
            name: 'mock-user',
            displayName: 'Mock User'
          },
          challenge: 'validbase64challenge',
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          timeout: 60000,
          excludeCredentials: []
        }
      };
      return new Response(JSON.stringify(resp), { status: 200 });
    }

    if (url.includes('passkeyEnrollment:finalize')) {
      currentToken = jwtWithPasskey;
      const resp = {
        idToken: currentToken,
        refreshToken: 'refresh-token',
        localId: 'mock-uid',
        expiresIn: '3600'
      };
      return new Response(JSON.stringify(resp), { status: 200 });
    }

    if (url.includes('passkeySignIn:start')) {
      const resp = {
        credentialRequestOptions: {
          challenge: 'validbase64challenge',
          rpId: window.location.hostname,
          userVerification: 'required'
        }
      };
      return new Response(JSON.stringify(resp), { status: 200 });
    }

    if (url.includes('passkeySignIn:finalize')) {
      currentToken = jwtWithPasskey;
      const resp = {
        idToken: currentToken,
        refreshToken: 'refresh-token',
        localId: 'mock-uid',
        expiresIn: '3600'
      };
      return new Response(JSON.stringify(resp), { status: 200 });
    }

    if (url.includes('accounts:lookup')) {
      const token = body.idToken;
      const passkeys =
        token === currentToken
          ? [
              {
                credentialId: 'mock-credential-id',
                name: 'Test Device Passkey'
              }
            ]
          : [];
      const resp = {
        users: [
          {
            localId: 'mock-uid',
            email: 'test@test.com',
            emailVerified: true,
            passkeyInfo: passkeys
          }
        ]
      };
      return new Response(JSON.stringify(resp), { status: 200 });
    }

    if (url.includes('accounts:update')) {
      if (body.deletePasskey) {
        const credId = body.deletePasskey[0];
        if (credId === 'mock-credential-id') {
          currentToken = jwtWithoutPasskey;
          const resp = {
            idToken: currentToken,
            refreshToken: 'refresh-token',
            localId: 'mock-uid',
            expiresIn: '3600'
          };
          return new Response(JSON.stringify(resp), { status: 200 });
        } else {
          const errorResp = {
            error: {
              code: 400,
              message: 'INVALID_CREDENTIAL_ID',
              errors: [
                {
                  message: 'INVALID_CREDENTIAL_ID',
                  domain: 'global',
                  reason: 'invalid'
                }
              ]
            }
          };
          return new Response(JSON.stringify(errorResp), { status: 400 });
        }
      }
    }

    return originalFetch(input, init);
  });
};

describe('Passkey Authentication (Chrome Only)', () => {
  // eslint-disable-next-line prefer-arrow-callback
  before(function () {
    if (!isChrome()) {
      this.skip();
    }
  });

  let auth: Auth;

  beforeEach(() => {
    auth = getTestInstance();
    setupMockFetch();
  });

  afterEach(async () => {
    if (typeof navigator !== 'undefined' && navigator.credentials) {
      if ((navigator.credentials.create as any).restore) {
        (navigator.credentials.create as any).restore();
      }
      if ((navigator.credentials.get as any).restore) {
        (navigator.credentials.get as any).restore();
      }
    }
    sinon.restore();
    await cleanUpTestInstance(auth);
  });

  describe('enrollPasskey', () => {
    it('enrolls passkey successfully', async () => {
      const email = randomEmail();
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      let user = userCred.user;

      const testDriver = getVirtualAuthenticatorDriver();
      const credId = await testDriver.addWebAuthnCredential({
        protocol: 'ctap2',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserConsenting: true
      });
      await testDriver.setWebAuthnUserVerified(true);

      const passkeyName = 'Test Device Passkey';
      const enrollCred = await enrollPasskey(user, passkeyName);
      user = enrollCred.user;

      await reload(user);
      const enrolledPasskeys = user.enrolledPasskeys || [];
      const foundPasskey = enrolledPasskeys.find(
        p => p.credentialId === credId || p.name === passkeyName
      );
      expect(foundPasskey).to.not.be.undefined;
      expect(foundPasskey!.name).to.equal(passkeyName);
    });

    it('rejects when user cancels during enrollment', async () => {
      const email = randomEmail();
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      const user = userCred.user;

      const testDriver = getVirtualAuthenticatorDriver();
      await testDriver.addWebAuthnCredential({
        protocol: 'ctap2',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserConsenting: true
      });
      await testDriver.setWebAuthnUserVerified(false);

      const passkeyName = 'Test Device Passkey';
      await expect(enrollPasskey(user, passkeyName)).to.be.rejected;
    });

    it('rejects when enrolling an already existing passkey', async () => {
      const email = randomEmail();
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      let user = userCred.user;

      const testDriver = getVirtualAuthenticatorDriver();
      await testDriver.addWebAuthnCredential({
        protocol: 'ctap2',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserConsenting: true
      });
      await testDriver.setWebAuthnUserVerified(true);

      const passkeyName = 'Test Device Passkey';
      const enrollCred = await enrollPasskey(user, passkeyName);
      user = enrollCred.user;

      // Attempt second enrollment with the same passkey name/details
      await expect(enrollPasskey(user, passkeyName)).to.be.rejected;
    });
  });

  describe('signInWithPasskey', () => {
    it('signs in with an existing enrolled passkey', async () => {
      const email = randomEmail();
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      const user = userCred.user;

      const testDriver = getVirtualAuthenticatorDriver();
      await testDriver.addWebAuthnCredential({
        protocol: 'ctap2',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserConsenting: true
      });
      await testDriver.setWebAuthnUserVerified(true);

      const passkeyName = 'Test Device Passkey';
      const enrollCred = await enrollPasskey(user, passkeyName);
      const enrolledUser = enrollCred.user;

      await signOut(auth);
      expect(auth.currentUser).to.be.null;

      await testDriver.setWebAuthnUserVerified(true);
      await signInWithPasskey(auth, passkeyName);
      expect(auth.currentUser).to.not.be.null;
      expect(auth.currentUser!.uid).to.equal(enrolledUser.uid);
    });

    it('signs up anonymously and enrolls passkey if none exists with manualSignUp false', async () => {
      await signOut(auth);
      expect(auth.currentUser).to.be.null;

      if (typeof navigator !== 'undefined' && navigator.credentials) {
        if ((navigator.credentials.get as any).restore) {
          (navigator.credentials.get as any).restore();
        }
        sinon
          .stub(navigator.credentials, 'get')
          .rejects(
            new DOMException(
              'The operation either timed out or was not allowed.',
              'NotAllowedError'
            )
          );

        const mockCredId = 'new-passkey-credential';
        if ((navigator.credentials.create as any).restore) {
          (navigator.credentials.create as any).restore();
        }
        sinon.stub(navigator.credentials, 'create').resolves({
          id: mockCredId,
          type: 'public-key',
          rawId: new TextEncoder().encode(mockCredId),
          response: {
            clientDataJSON: new TextEncoder().encode(
              JSON.stringify({
                type: 'webauthn.create',
                challenge: 'validbase64challenge',
                origin: window.location.origin
              })
            ),
            attestationObject: new Uint8Array([1, 2, 3])
          }
        } as any);
      }

      const passkeyName = 'Test Device Passkey';
      const signInCred = await signInWithPasskey(auth, passkeyName, false);
      const anonymousUser = signInCred.user;
      expect(auth.currentUser).to.not.be.null;
      expect(auth.currentUser!.isAnonymous).to.be.true;

      await reload(anonymousUser);
      const enrolledPasskeys = anonymousUser.enrolledPasskeys || [];
      expect(enrolledPasskeys.length).to.equal(1);
      expect(enrolledPasskeys[0].name).to.equal(passkeyName);
    });

    it('rejects with error when no passkey exists with manualSignUp true', async () => {
      await signOut(auth);
      expect(auth.currentUser).to.be.null;

      if (typeof navigator !== 'undefined' && navigator.credentials) {
        if ((navigator.credentials.get as any).restore) {
          (navigator.credentials.get as any).restore();
        }
        sinon
          .stub(navigator.credentials, 'get')
          .rejects(
            new DOMException(
              'The operation either timed out or was not allowed.',
              'NotAllowedError'
            )
          );
      }

      const passkeyName = 'Test Device Passkey';
      await expect(signInWithPasskey(auth, passkeyName, true)).to.be.rejected;
      expect(auth.currentUser).to.be.null;
    });

    it('rejects when user cancels during sign in', async () => {
      await signOut(auth);
      expect(auth.currentUser).to.be.null;

      const testDriver = getVirtualAuthenticatorDriver();
      await testDriver.setWebAuthnUserVerified(false);

      const passkeyName = 'Test Device Passkey';
      await expect(signInWithPasskey(auth, passkeyName, true)).to.be.rejected;
      expect(auth.currentUser).to.be.null;
    });
  });

  describe('unenrollPasskey', () => {
    it('unenrolls passkey successfully', async () => {
      const email = randomEmail();
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      let user = userCred.user;

      const testDriver = getVirtualAuthenticatorDriver();
      const credId = await testDriver.addWebAuthnCredential({
        protocol: 'ctap2',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserConsenting: true
      });
      await testDriver.setWebAuthnUserVerified(true);

      const passkeyName = 'Test Device Passkey';
      const enrollCred = await enrollPasskey(user, passkeyName);
      user = enrollCred.user;

      await reload(user);
      const enrolledPasskeys = user.enrolledPasskeys || [];
      const foundPasskey = enrolledPasskeys.find(
        p => p.credentialId === credId || p.name === passkeyName
      );
      expect(foundPasskey).to.not.be.undefined;
      const actualCredId = foundPasskey!.credentialId;

      await unenrollPasskey(user, actualCredId);

      await reload(user);
      const updatedPasskeys = user.enrolledPasskeys || [];
      const stillExists = updatedPasskeys.some(
        p => p.credentialId === actualCredId
      );
      expect(stillExists).to.be.false;
    });

    it('rejects when unenrolling unknown credentialId', async () => {
      const email = randomEmail();
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        'password'
      );
      let user = userCred.user;

      const testDriver = getVirtualAuthenticatorDriver();
      const credId = await testDriver.addWebAuthnCredential({
        protocol: 'ctap2',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserConsenting: true
      });
      await testDriver.setWebAuthnUserVerified(true);

      const passkeyName = 'Test Device Passkey';
      const enrollCred = await enrollPasskey(user, passkeyName);
      user = enrollCred.user;

      await reload(user);
      const enrolledPasskeys = user.enrolledPasskeys || [];
      const foundPasskey = enrolledPasskeys.find(
        p => p.credentialId === credId || p.name === passkeyName
      );
      expect(foundPasskey).to.not.be.undefined;
      const actualCredId = foundPasskey!.credentialId;

      await expect(unenrollPasskey(user, 'unknown-cred-id')).to.be.rejected;

      await reload(user);
      const updatedPasskeys = user.enrolledPasskeys || [];
      const stillExists = updatedPasskeys.some(
        p => p.credentialId === actualCredId
      );
      expect(stillExists).to.be.true;
    });
  });
});
