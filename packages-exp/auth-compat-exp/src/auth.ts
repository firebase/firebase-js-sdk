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
import { _FirebaseService } from '@firebase/app-types-exp';
import * as impl from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import * as externs from '@firebase/auth-types-exp';
import {
  ErrorFn,
  isIndexedDBAvailable,
  Observer,
  Unsubscribe
} from '@firebase/util';

import { _validatePersistenceArgument, Persistence } from './persistence';
import { _getClientPlatform, _isPopupRedirectSupported } from './platform';
import { User } from './user';
import {
  convertConfirmationResult,
  convertCredential
} from './user_credential';
import { unwrap, Wrapper } from './wrap';

const PERSISTENCE_KEY = 'persistence';

export class Auth
  implements compat.FirebaseAuth, Wrapper<externs.Auth>, _FirebaseService {
  // private readonly auth: impl.AuthImpl;

  constructor(readonly app: FirebaseApp, private readonly auth: impl.AuthImpl) {
    const { apiKey } = app.options;
    if (this.auth._deleted) {
      return;
    }

    // Note this is slightly different behavior: in this case, the stored
    // persistence is checked *first* rather than last. This is because we want
    // the fallback (if no user is found) to be the stored persistence type
    const storedPersistence = this.getPersistenceFromRedirect();
    const persistences = storedPersistence ? [storedPersistence] : [];
    persistences.push(impl.indexedDBLocalPersistence);

    // TODO(avolkovi): Implement proper persistence fallback
    const hierarchy = persistences.map<impl.Persistence>(impl._getInstance);

    // TODO: platform needs to be determined using heuristics
    impl.assertFn(apiKey, impl.AuthErrorCode.INVALID_API_KEY, {
      appName: app.name
    });

    // This promise is intended to float; auth initialization happens in the
    // background, meanwhile the auth object may be used by the app.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.auth._initializeWithPersistence(
      hierarchy,
      impl.browserPopupRedirectResolver
    );
  }

  get currentUser(): compat.User | null {
    if (!this.auth.currentUser) {
      return null;
    }

    return User.getOrCreate(this.auth.currentUser);
  }
  get languageCode(): string | null {
    return this.auth.languageCode;
  }
  get settings(): compat.AuthSettings {
    return this.auth.settings;
  }
  get tenantId(): string | null {
    return this.auth.tenantId;
  }
  useDeviceLanguage(): void {
    this.auth.useDeviceLanguage();
  }
  signOut(): Promise<void> {
    return this.auth.signOut();
  }
  useEmulator(url: string): void {
    this.auth.useEmulator(url);
  }
  applyActionCode(code: string): Promise<void> {
    return impl.applyActionCode(this.auth, code);
  }

  checkActionCode(code: string): Promise<compat.ActionCodeInfo> {
    return impl.checkActionCode(this.auth, code);
  }

  confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    return impl.confirmPasswordReset(this.auth, code, newPassword);
  }

  async createUserWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      impl.createUserWithEmailAndPassword(this.auth, email, password)
    );
  }
  fetchProvidersForEmail(email: string): Promise<string[]> {
    return this.fetchSignInMethodsForEmail(email);
  }
  fetchSignInMethodsForEmail(email: string): Promise<string[]> {
    return impl.fetchSignInMethodsForEmail(this.auth, email);
  }
  isSignInWithEmailLink(emailLink: string): boolean {
    return impl.isSignInWithEmailLink(this.auth, emailLink);
  }
  async getRedirectResult(): Promise<compat.UserCredential> {
    impl.assertFn(
      _isPopupRedirectSupported(),
      impl.AuthErrorCode.OPERATION_NOT_SUPPORTED,
      { appName: this.app.name }
    );
    const credential = await impl.getRedirectResult(
      this.auth,
      impl.browserPopupRedirectResolver
    );
    if (!credential) {
      return {
        credential: null,
        user: null
      };
    }
    return convertCredential(this.auth, Promise.resolve(credential));
  }
  onAuthStateChanged(
    nextOrObserver: Observer<unknown> | ((a: compat.User | null) => unknown),
    errorFn?: (error: compat.Error) => unknown,
    completed?: Unsubscribe
  ): Unsubscribe {
    const { next, error, complete } = wrapObservers(
      nextOrObserver,
      errorFn,
      completed
    );
    return this.auth.onAuthStateChanged(next!, error, complete);
  }
  onIdTokenChanged(
    nextOrObserver: Observer<unknown> | ((a: compat.User | null) => unknown),
    errorFn?: (error: compat.Error) => unknown,
    completed?: Unsubscribe
  ): Unsubscribe {
    const { next, error, complete } = wrapObservers(
      nextOrObserver,
      errorFn,
      completed
    );
    return this.auth.onIdTokenChanged(next!, error, complete);
  }
  sendSignInLinkToEmail(
    email: string,
    actionCodeSettings: compat.ActionCodeSettings
  ): Promise<void> {
    return impl.sendSignInLinkToEmail(this.auth, email, actionCodeSettings);
  }
  sendPasswordResetEmail(
    email: string,
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return impl.sendPasswordResetEmail(
      this.auth,
      email,
      actionCodeSettings || undefined
    );
  }
  async setPersistence(persistence: string): Promise<void> {
    function convertPersistence(
      auth: externs.Auth,
      persistenceCompat: string
    ): externs.Persistence {
      _validatePersistenceArgument(auth, persistence);
      switch (persistenceCompat) {
        case Persistence.SESSION:
          return impl.browserSessionPersistence;
        case Persistence.LOCAL:
          return isIndexedDBAvailable()
            ? impl.indexedDBLocalPersistence
            : impl.browserLocalPersistence;
        case Persistence.NONE:
          return impl.inMemoryPersistence;
        default:
          return impl.fail(impl.AuthErrorCode.ARGUMENT_ERROR, {
            appName: auth.name
          });
      }
    }

    return this.auth.setPersistence(convertPersistence(this.auth, persistence));
  }

  signInAndRetrieveDataWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return this.signInWithCredential(credential);
  }
  signInAnonymously(): Promise<compat.UserCredential> {
    return convertCredential(this.auth, impl.signInAnonymously(this.auth));
  }
  signInWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      impl.signInWithCredential(this.auth, credential as externs.AuthCredential)
    );
  }
  signInWithCustomToken(token: string): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      impl.signInWithCustomToken(this.auth, token)
    );
  }
  signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      impl.signInWithEmailAndPassword(this.auth, email, password)
    );
  }
  signInWithEmailLink(
    email: string,
    emailLink?: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      impl.signInWithEmailLink(this.auth, email, emailLink)
    );
  }
  signInWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      this.auth,
      impl.signInWithPhoneNumber(
        this.auth,
        phoneNumber,
        unwrap(applicationVerifier)
      )
    );
  }
  async signInWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    impl.assertFn(
      _isPopupRedirectSupported(),
      impl.AuthErrorCode.OPERATION_NOT_SUPPORTED,
      { appName: this.app.name }
    );
    return convertCredential(
      this.auth,
      impl.signInWithPopup(
        this.auth,
        provider as externs.AuthProvider,
        impl.browserPopupRedirectResolver
      )
    );
  }
  async signInWithRedirect(provider: compat.AuthProvider): Promise<void> {
    impl.assertFn(
      _isPopupRedirectSupported(),
      impl.AuthErrorCode.OPERATION_NOT_SUPPORTED,
      { appName: this.app.name }
    );
    this.savePersistenceForRedirect();
    return impl.signInWithRedirect(
      this.auth,
      provider as externs.AuthProvider,
      impl.browserPopupRedirectResolver
    );
  }
  updateCurrentUser(user: compat.User | null): Promise<void> {
    return this.auth.updateCurrentUser(unwrap(user));
  }
  verifyPasswordResetCode(code: string): Promise<string> {
    return impl.verifyPasswordResetCode(this.auth, code);
  }
  unwrap(): externs.Auth {
    return this.auth;
  }
  _delete(): Promise<void> {
    return this.auth._delete();
  }

  private savePersistenceForRedirect(): void {
    const win = getSelfWindow();
    const key = impl._persistenceKeyName(
      PERSISTENCE_KEY,
      this.auth.config.apiKey,
      this.auth.name
    );
    if (win?.sessionStorage) {
      win.sessionStorage.setItem(key, this.auth._getPersistence());
    }
  }

  private getPersistenceFromRedirect(): externs.Persistence | null {
    const win = getSelfWindow();
    if (!win?.sessionStorage) {
      return null;
    }

    const key = impl._persistenceKeyName(
      PERSISTENCE_KEY,
      this.auth.config.apiKey,
      this.auth.name
    );
    const persistence = win.sessionStorage.getItem(key);

    switch (persistence) {
      case impl.inMemoryPersistence.type:
        return impl.inMemoryPersistence;
      case impl.indexedDBLocalPersistence.type:
        return impl.indexedDBLocalPersistence;
      case impl.browserSessionPersistence.type:
        return impl.browserSessionPersistence;
      case impl.browserLocalPersistence.type:
        return impl.browserLocalPersistence;
      default:
        return null;
    }
  }
}

function getSelfWindow(): Window | null {
  return typeof window !== 'undefined' ? window : null;
}

function wrapObservers(
  nextOrObserver: Observer<unknown> | ((a: compat.User | null) => unknown),
  error?: (error: compat.Error) => unknown,
  complete?: Unsubscribe
): Partial<Observer<externs.User | null>> {
  let next = nextOrObserver;
  if (typeof nextOrObserver !== 'function') {
    ({ next, error, complete } = nextOrObserver);
  }

  // We know 'next' is now a function
  const oldNext = next as (a: compat.User | null) => unknown;

  const newNext = (user: externs.User | null): unknown =>
    oldNext(user && User.getOrCreate(user as externs.User));
  return {
    next: newNext,
    error: error as ErrorFn,
    complete
  };
}
