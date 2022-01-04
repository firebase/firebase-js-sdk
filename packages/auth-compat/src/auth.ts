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
import * as exp from '@firebase/auth/internal';
import * as compat from '@firebase/auth-types';
import { Provider } from '@firebase/component';
import { ErrorFn, Observer, Unsubscribe } from '@firebase/util';

import {
  _validatePersistenceArgument,
  Persistence,
  _getPersistencesFromRedirect,
  _savePersistenceForRedirect
} from './persistence';
import { _isPopupRedirectSupported } from './platform';
import { CompatPopupRedirectResolver } from './popup_redirect';
import { User } from './user';
import {
  convertConfirmationResult,
  convertCredential
} from './user_credential';
import { ReverseWrapper, Wrapper } from './wrap';

const _assert: typeof exp._assert = exp._assert;

export class Auth
  implements compat.FirebaseAuth, Wrapper<exp.Auth>, _FirebaseService
{
  static Persistence = Persistence;
  readonly _delegate: exp.AuthImpl;

  constructor(readonly app: FirebaseApp, provider: Provider<'auth'>) {
    if (provider.isInitialized()) {
      this._delegate = provider.getImmediate() as exp.AuthImpl;
      this.linkUnderlyingAuth();
      return;
    }

    const { apiKey } = app.options;
    // TODO: platform needs to be determined using heuristics
    _assert(apiKey, exp.AuthErrorCode.INVALID_API_KEY, {
      appName: app.name
    });

    // TODO: platform needs to be determined using heuristics
    _assert(apiKey, exp.AuthErrorCode.INVALID_API_KEY, {
      appName: app.name
    });

    // Only use a popup/redirect resolver in browser environments
    const resolver =
      typeof window !== 'undefined' ? CompatPopupRedirectResolver : undefined;
    this._delegate = provider.initialize({
      options: {
        persistence: buildPersistenceHierarchy(apiKey, app.name),
        popupRedirectResolver: resolver
      }
    }) as exp.AuthImpl;

    this._delegate._updateErrorMap(exp.debugErrorMap);
    this.linkUnderlyingAuth();
  }

  get emulatorConfig(): compat.EmulatorConfig | null {
    return this._delegate.emulatorConfig;
  }

  get currentUser(): compat.User | null {
    if (!this._delegate.currentUser) {
      return null;
    }

    return User.getOrCreate(this._delegate.currentUser);
  }
  get languageCode(): string | null {
    return this._delegate.languageCode;
  }
  set languageCode(languageCode: string | null) {
    this._delegate.languageCode = languageCode;
  }
  get settings(): compat.AuthSettings {
    return this._delegate.settings;
  }
  get tenantId(): string | null {
    return this._delegate.tenantId;
  }
  set tenantId(tid: string | null) {
    this._delegate.tenantId = tid;
  }
  useDeviceLanguage(): void {
    this._delegate.useDeviceLanguage();
  }
  signOut(): Promise<void> {
    return this._delegate.signOut();
  }
  useEmulator(url: string, options?: { disableWarnings: boolean }): void {
    exp.connectAuthEmulator(this._delegate, url, options);
  }
  applyActionCode(code: string): Promise<void> {
    return exp.applyActionCode(this._delegate, code);
  }

  checkActionCode(code: string): Promise<compat.ActionCodeInfo> {
    return exp.checkActionCode(this._delegate, code);
  }

  confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    return exp.confirmPasswordReset(this._delegate, code, newPassword);
  }

  async createUserWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this._delegate,
      exp.createUserWithEmailAndPassword(this._delegate, email, password)
    );
  }
  fetchProvidersForEmail(email: string): Promise<string[]> {
    return this.fetchSignInMethodsForEmail(email);
  }
  fetchSignInMethodsForEmail(email: string): Promise<string[]> {
    return exp.fetchSignInMethodsForEmail(this._delegate, email);
  }
  isSignInWithEmailLink(emailLink: string): boolean {
    return exp.isSignInWithEmailLink(this._delegate, emailLink);
  }
  async getRedirectResult(): Promise<compat.UserCredential> {
    _assert(
      _isPopupRedirectSupported(),
      this._delegate,
      exp.AuthErrorCode.OPERATION_NOT_SUPPORTED
    );
    const credential = await exp.getRedirectResult(
      this._delegate,
      CompatPopupRedirectResolver
    );
    if (!credential) {
      return {
        credential: null,
        user: null
      };
    }
    return convertCredential(this._delegate, Promise.resolve(credential));
  }

  // This function should only be called by frameworks (e.g. FirebaseUI-web) to log their usage.
  // It is not intended for direct use by developer apps. NO jsdoc here to intentionally leave it
  // out of autogenerated documentation pages to reduce accidental misuse.
  addFrameworkForLogging(framework: string): void {
    exp.addFrameworkForLogging(this._delegate, framework);
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
    return this._delegate.onAuthStateChanged(next!, error, complete);
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
    return this._delegate.onIdTokenChanged(next!, error, complete);
  }
  sendSignInLinkToEmail(
    email: string,
    actionCodeSettings: compat.ActionCodeSettings
  ): Promise<void> {
    return exp.sendSignInLinkToEmail(this._delegate, email, actionCodeSettings);
  }
  sendPasswordResetEmail(
    email: string,
    actionCodeSettings?: compat.ActionCodeSettings | null
  ): Promise<void> {
    return exp.sendPasswordResetEmail(
      this._delegate,
      email,
      actionCodeSettings || undefined
    );
  }
  async setPersistence(persistence: string): Promise<void> {
    _validatePersistenceArgument(this._delegate, persistence);
    let converted;
    switch (persistence) {
      case Persistence.SESSION:
        converted = exp.browserSessionPersistence;
        break;
      case Persistence.LOCAL:
        // Not using isIndexedDBAvailable() since it only checks if indexedDB is defined.
        const isIndexedDBFullySupported = await exp
          ._getInstance<exp.PersistenceInternal>(exp.indexedDBLocalPersistence)
          ._isAvailable();
        converted = isIndexedDBFullySupported
          ? exp.indexedDBLocalPersistence
          : exp.browserLocalPersistence;
        break;
      case Persistence.NONE:
        converted = exp.inMemoryPersistence;
        break;
      default:
        return exp._fail(exp.AuthErrorCode.ARGUMENT_ERROR, {
          appName: this._delegate.name
        });
    }

    return this._delegate.setPersistence(converted);
  }

  signInAndRetrieveDataWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return this.signInWithCredential(credential);
  }
  signInAnonymously(): Promise<compat.UserCredential> {
    return convertCredential(
      this._delegate,
      exp.signInAnonymously(this._delegate)
    );
  }
  signInWithCredential(
    credential: compat.AuthCredential
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this._delegate,
      exp.signInWithCredential(this._delegate, credential as exp.AuthCredential)
    );
  }
  signInWithCustomToken(token: string): Promise<compat.UserCredential> {
    return convertCredential(
      this._delegate,
      exp.signInWithCustomToken(this._delegate, token)
    );
  }
  signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this._delegate,
      exp.signInWithEmailAndPassword(this._delegate, email, password)
    );
  }
  signInWithEmailLink(
    email: string,
    emailLink?: string
  ): Promise<compat.UserCredential> {
    return convertCredential(
      this._delegate,
      exp.signInWithEmailLink(this._delegate, email, emailLink)
    );
  }
  signInWithPhoneNumber(
    phoneNumber: string,
    applicationVerifier: compat.ApplicationVerifier
  ): Promise<compat.ConfirmationResult> {
    return convertConfirmationResult(
      this._delegate,
      exp.signInWithPhoneNumber(
        this._delegate,
        phoneNumber,
        applicationVerifier
      )
    );
  }
  async signInWithPopup(
    provider: compat.AuthProvider
  ): Promise<compat.UserCredential> {
    _assert(
      _isPopupRedirectSupported(),
      this._delegate,
      exp.AuthErrorCode.OPERATION_NOT_SUPPORTED
    );
    return convertCredential(
      this._delegate,
      exp.signInWithPopup(
        this._delegate,
        provider as exp.AuthProvider,
        CompatPopupRedirectResolver
      )
    );
  }
  async signInWithRedirect(provider: compat.AuthProvider): Promise<void> {
    _assert(
      _isPopupRedirectSupported(),
      this._delegate,
      exp.AuthErrorCode.OPERATION_NOT_SUPPORTED
    );

    await _savePersistenceForRedirect(this._delegate);
    return exp.signInWithRedirect(
      this._delegate,
      provider as exp.AuthProvider,
      CompatPopupRedirectResolver
    );
  }
  updateCurrentUser(user: compat.User | null): Promise<void> {
    // remove ts-ignore once overloads are defined for exp functions to accept compat objects
    // @ts-ignore
    return this._delegate.updateCurrentUser(user);
  }
  verifyPasswordResetCode(code: string): Promise<string> {
    return exp.verifyPasswordResetCode(this._delegate, code);
  }
  unwrap(): exp.Auth {
    return this._delegate;
  }
  _delete(): Promise<void> {
    return this._delegate._delete();
  }
  private linkUnderlyingAuth(): void {
    (this._delegate as unknown as ReverseWrapper<Auth>).wrapped = () => this;
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

function buildPersistenceHierarchy(
  apiKey: string,
  appName: string
): exp.Persistence[] {
  // Note this is slightly different behavior: in this case, the stored
  // persistence is checked *first* rather than last. This is because we want
  // to prefer stored persistence type in the hierarchy. This is an empty
  // array if window is not available or there is no pending redirect
  const persistences = _getPersistencesFromRedirect(apiKey, appName);

  // If "self" is available, add indexedDB
  if (
    typeof self !== 'undefined' &&
    !persistences.includes(exp.indexedDBLocalPersistence)
  ) {
    persistences.push(exp.indexedDBLocalPersistence);
  }

  // If "window" is available, add HTML Storage persistences
  if (typeof window !== 'undefined') {
    for (const persistence of [
      exp.browserLocalPersistence,
      exp.browserSessionPersistence
    ]) {
      if (!persistences.includes(persistence)) {
        persistences.push(persistence);
      }
    }
  }

  // Add in-memory as a final fallback
  if (!persistences.includes(exp.inMemoryPersistence)) {
    persistences.push(exp.inMemoryPersistence);
  }

  return persistences;
}
