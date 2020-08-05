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

import { FirebaseApp } from '@firebase/app-types';
import * as impl from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import * as externs from '@firebase/auth-types-exp';
import '@firebase/installations';
import { Observer, Unsubscribe, ErrorFn } from '@firebase/util';
import { User } from './user';
import {
  convertConfirmationResult,
  convertCredential
} from './user_credential';
import { _isPopupRedirectSupported } from './platform';

export class Auth extends impl.AuthImplCompat<User>
  implements compat.FirebaseAuth {
  readonly app: FirebaseApp;

  constructor(app: FirebaseApp) {
    const { apiKey, authDomain } = app.options;

    // TODO(avolkovi): Implement proper persistence fallback
    const hierarchy = [impl.indexedDBLocalPersistence].map<impl.Persistence>(
      impl._getInstance
    );

    // TODO: platform needs to be determined using heuristics
    impl.assertFn(apiKey, app.name, impl.AuthErrorCode.INVALID_API_KEY);
    const config: externs.Config = {
      apiKey,
      authDomain,
      apiHost: impl.DEFAULT_API_HOST,
      tokenApiHost: impl.DEFAULT_TOKEN_API_HOST,
      apiScheme: impl.DEFAULT_API_SCHEME,
      sdkClientVersion: impl._getClientVersion(impl.ClientPlatform.BROWSER)
    };

    super(app.name, config, User);
    this.app = app;

    // This promise is intended to float; auth initialization happens in the
    // background, meanwhile the auth object may be used by the app.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this._initializeWithPersistence(
      hierarchy,
      impl.browserPopupRedirectResolver
    );
  }

  _asExtern(): externs.Auth {
    // We need this unsafe cast before calling impl.* methods since our implementation of
    // setPersistence, onAuthStateChanged and onIdTokenChanged has a different signature
    return (this as unknown) as externs.Auth;
  }

  applyActionCode(code: string): Promise<void> {
    return impl.applyActionCode(this._asExtern(), code);
  }

  checkActionCode(code: string): Promise<compat.ActionCodeInfo> {
    return impl.checkActionCode(this._asExtern(), code);
  }

  confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    return impl.confirmPasswordReset(this._asExtern(), code, newPassword);
  }

  async createUserWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this._asExtern(),
      impl.createUserWithEmailAndPassword(this._asExtern(), email, password)
    );
  }
  fetchProvidersForEmail(email: string): Promise<string[]> {
    return this.fetchSignInMethodsForEmail(email);
  }
  fetchSignInMethodsForEmail(email: string): Promise<string[]> {
    return impl.fetchSignInMethodsForEmail(this._asExtern(), email);
  }
  isSignInWithEmailLink(emailLink: string): boolean {
    return impl.isSignInWithEmailLink(this._asExtern(), emailLink);
  }
  async getRedirectResult(): Promise<compat.UserCredential> {
    impl.assertFn(
      _isPopupRedirectSupported(),
      this.app.name,
      impl.AuthErrorCode.OPERATION_NOT_SUPPORTED
    );
    const credential = await impl.getRedirectResult(
      this._asExtern(),
      impl.browserPopupRedirectResolver
    );
    if (!credential) {
      return {
        credential: null,
        user: null
      };
    }
    return convertCredential(this._asExtern(), Promise.resolve(credential));
  }
  onAuthStateChanged(
    nextOrObserver: Observer<unknown> | ((a: compat.User | null) => unknown),
    error?: (error: compat.Error) => unknown,
    completed?: Unsubscribe
  ): Unsubscribe {
    return super._onAuthStateChanged(
      nextOrObserver as externs.NextOrObserver<externs.User | null>,
      error as ErrorFn,
      completed
    );
  }
  onIdTokenChanged(
    nextOrObserver: Observer<unknown> | ((a: compat.User | null) => unknown),
    error?: (error: compat.Error) => unknown,
    completed?: Unsubscribe
  ): Unsubscribe {
    return super._onIdTokenChanged(
      nextOrObserver as externs.NextOrObserver<externs.User | null>,
      error as ErrorFn,
      completed
    );
  }
  sendSignInLinkToEmail(
    email: string,
    actionCodeSettings: compat.ActionCodeSettings
  ): Promise<void> {
    return impl.sendSignInLinkToEmail(
      this._asExtern(),
      email,
      actionCodeSettings
    );
  }
  sendPasswordResetEmail(
    email: string,
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return impl.sendPasswordResetEmail(
      this._asExtern(),
      email,
      actionCodeSettings || undefined
    );
  }
  async setPersistence(persistence: string): Promise<void> {
    function convertPersistence(
      auth: externs.Auth,
      persistenceCompat: string
    ): externs.Persistence {
      switch (persistenceCompat) {
        case 'LOCAL':
          return impl.browserLocalPersistence;
        case 'SESSION':
          return impl.browserSessionPersistence;
        case 'NONE':
          return impl.inMemoryPersistence;
        default:
          return impl.fail(auth.name, impl.AuthErrorCode.ARGUMENT_ERROR);
      }
    }

    return super._setPersistence(
      convertPersistence(this._asExtern(), persistence)
    );
  }

  signInAndRetrieveDataWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return this.signInWithCredential(credential);
  }
  signInAnonymously(): Promise<compat.UserCredential> {
    return convertCredential(
      this._asExtern(),
      impl.signInAnonymously(this._asExtern())
    );
  }
  signInWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this._asExtern(),
      impl.signInWithCredential(
        this._asExtern(),
        credential as externs.AuthCredential
      )
    );
  }
  signInWithCustomToken(token: string): Promise<compat.UserCredential> {
    return convertCredential(
      this._asExtern(),
      impl.signInWithCustomToken(this._asExtern(), token)
    );
  }
  signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this._asExtern(),
      impl.signInWithEmailAndPassword(this._asExtern(), email, password)
    );
  }
  signInWithEmailLink(
    email: string,
    emailLink?: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this._asExtern(),
      impl.signInWithEmailLink(this._asExtern(), email, emailLink)
    );
  }
  signInWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      this._asExtern(),
      impl.signInWithPhoneNumber(
        this._asExtern(),
        phoneNumber,
        applicationVerifier
      )
    );
  }
  async signInWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    impl.assertFn(
      _isPopupRedirectSupported(),
      this.app.name,
      impl.AuthErrorCode.OPERATION_NOT_SUPPORTED
    );
    return convertCredential(
      this._asExtern(),
      impl.signInWithPopup(
        this._asExtern(),
        provider as externs.AuthProvider,
        impl.browserPopupRedirectResolver
      )
    );
  }
  async signInWithRedirect(provider: compat.AuthProvider): Promise<void> {
    impl.assertFn(
      _isPopupRedirectSupported(),
      this.app.name,
      impl.AuthErrorCode.OPERATION_NOT_SUPPORTED
    );
    return impl.signInWithRedirect(
      this._asExtern(),
      provider as externs.AuthProvider,
      impl.browserPopupRedirectResolver
    );
  }
  updateCurrentUser(user: User | null): Promise<void> {
    return super.updateCurrentUser(user);
  }
  verifyPasswordResetCode(code: string): Promise<string> {
    return impl.verifyPasswordResetCode(this._asExtern(), code);
  }
}
