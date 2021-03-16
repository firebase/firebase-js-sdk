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

import { FirebaseApp, _FirebaseService } from '@firebase/app-compat';
import * as exp from '@firebase/auth-exp/internal';
import * as compat from '@firebase/auth-types';
import {
  ErrorFn,
  isIndexedDBAvailable,
  Observer,
  Unsubscribe
} from '@firebase/util';

import {
  _validatePersistenceArgument,
  Persistence,
  _getPersistenceFromRedirect,
  _savePersistenceForRedirect
} from './persistence';
import { _isPopupRedirectSupported } from './platform';
import { CompatPopupRedirectResolver } from './popup_redirect';
import { User } from './user';
import {
  convertConfirmationResult,
  convertCredential
} from './user_credential';
import { unwrap, Wrapper } from './wrap';

const _assert: typeof exp._assert = exp._assert;

export class Auth
  implements compat.FirebaseAuth, Wrapper<exp.Auth>, _FirebaseService {
  // private readonly auth: impl.AuthImpl;

  constructor(readonly app: FirebaseApp, private readonly auth: exp.AuthImpl) {
    const { apiKey } = app.options;
    if (this.auth._deleted) {
      return;
    }

    // Note this is slightly different behavior: in this case, the stored
    // persistence is checked *first* rather than last. This is because we want
    // the fallback (if no user is found) to be the stored persistence type
    const storedPersistence = _getPersistenceFromRedirect(this.auth);
    const persistences = storedPersistence ? [storedPersistence] : [];
    persistences.push(exp.indexedDBLocalPersistence);

    // TODO(avolkovi): Implement proper persistence fallback
    const hierarchy = persistences.map<exp.PersistenceInternal>(
      exp._getInstance
    );

    // TODO: platform needs to be determined using heuristics
    _assert(apiKey, exp.AuthErrorCode.INVALID_API_KEY, {
      appName: app.name
    });

    this.auth._updateErrorMap(exp.debugErrorMap);

    // Only use a popup/redirect resolver in browser environments
    const resolver =
      typeof window !== 'undefined' ? CompatPopupRedirectResolver : undefined;

    // This promise is intended to float; auth initialization happens in the
    // background, meanwhile the auth object may be used by the app.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.auth._initializeWithPersistence(hierarchy, resolver);
  }

  get emulatorConfig(): compat.EmulatorConfig | null {
    return this.auth.emulatorConfig;
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
  useEmulator(url: string, options?: { disableWarnings: boolean }): void {
    exp.useAuthEmulator(this.auth, url, options);
  }
  applyActionCode(code: string): Promise<void> {
    return exp.applyActionCode(this.auth, code);
  }

  checkActionCode(code: string): Promise<compat.ActionCodeInfo> {
    return exp.checkActionCode(this.auth, code);
  }

  confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    return exp.confirmPasswordReset(this.auth, code, newPassword);
  }

  async createUserWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      exp.createUserWithEmailAndPassword(this.auth, email, password)
    );
  }
  fetchProvidersForEmail(email: string): Promise<string[]> {
    return this.fetchSignInMethodsForEmail(email);
  }
  fetchSignInMethodsForEmail(email: string): Promise<string[]> {
    return exp.fetchSignInMethodsForEmail(this.auth, email);
  }
  isSignInWithEmailLink(emailLink: string): boolean {
    return exp.isSignInWithEmailLink(this.auth, emailLink);
  }
  async getRedirectResult(): Promise<compat.UserCredential> {
    _assert(
      _isPopupRedirectSupported(),
      this.auth,
      exp.AuthErrorCode.OPERATION_NOT_SUPPORTED
    );
    const credential = await exp.getRedirectResult(
      this.auth,
      CompatPopupRedirectResolver
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
    return exp.sendSignInLinkToEmail(this.auth, email, actionCodeSettings);
  }
  sendPasswordResetEmail(
    email: string,
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return exp.sendPasswordResetEmail(
      this.auth,
      email,
      actionCodeSettings || undefined
    );
  }
  async setPersistence(persistence: string): Promise<void> {
    function convertPersistence(
      auth: exp.Auth,
      persistenceCompat: string
    ): exp.Persistence {
      _validatePersistenceArgument(auth, persistence);
      switch (persistenceCompat) {
        case Persistence.SESSION:
          return exp.browserSessionPersistence;
        case Persistence.LOCAL:
          return isIndexedDBAvailable()
            ? exp.indexedDBLocalPersistence
            : exp.browserLocalPersistence;
        case Persistence.NONE:
          return exp.inMemoryPersistence;
        default:
          return exp._fail(exp.AuthErrorCode.ARGUMENT_ERROR, {
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
    return convertCredential(this.auth, exp.signInAnonymously(this.auth));
  }
  signInWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      exp.signInWithCredential(this.auth, credential as exp.AuthCredential)
    );
  }
  signInWithCustomToken(token: string): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      exp.signInWithCustomToken(this.auth, token)
    );
  }
  signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      exp.signInWithEmailAndPassword(this.auth, email, password)
    );
  }
  signInWithEmailLink(
    email: string,
    emailLink?: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this.auth,
      exp.signInWithEmailLink(this.auth, email, emailLink)
    );
  }
  signInWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      this.auth,
      exp.signInWithPhoneNumber(
        this.auth,
        phoneNumber,
        unwrap(applicationVerifier)
      )
    );
  }
  async signInWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    _assert(
      _isPopupRedirectSupported(),
      this.auth,
      exp.AuthErrorCode.OPERATION_NOT_SUPPORTED
    );
    return convertCredential(
      this.auth,
      exp.signInWithPopup(
        this.auth,
        provider as exp.AuthProvider,
        CompatPopupRedirectResolver
      )
    );
  }
  async signInWithRedirect(provider: compat.AuthProvider): Promise<void> {
    _assert(
      _isPopupRedirectSupported(),
      this.auth,
      exp.AuthErrorCode.OPERATION_NOT_SUPPORTED
    );

    await _savePersistenceForRedirect(this.auth);
    return exp.signInWithRedirect(
      this.auth,
      provider as exp.AuthProvider,
      CompatPopupRedirectResolver
    );
  }
  updateCurrentUser(user: compat.User | null): Promise<void> {
    return this.auth.updateCurrentUser(unwrap(user));
  }
  verifyPasswordResetCode(code: string): Promise<string> {
    return exp.verifyPasswordResetCode(this.auth, code);
  }
  unwrap(): exp.Auth {
    return this.auth;
  }
  _delete(): Promise<void> {
    return this.auth._delete();
  }
}

function wrapObservers(
  nextOrObserver: Observer<unknown> | ((a: compat.User | null) => unknown),
  error?: (error: compat.Error) => unknown,
  complete?: Unsubscribe
): Partial<Observer<exp.User | null>> {
  let next = nextOrObserver;
  if (typeof nextOrObserver !== 'function') {
    ({ next, error, complete } = nextOrObserver);
  }

  // We know 'next' is now a function
  const oldNext = next as (a: compat.User | null) => unknown;

  const newNext = (user: exp.User | null): unknown =>
    oldNext(user && User.getOrCreate(user as exp.User));
  return {
    next: newNext,
    error: error as ErrorFn,
    complete
  };
}
