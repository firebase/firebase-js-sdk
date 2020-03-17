/**
 * @license
 * Copyright 2019 Google Inc.
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

import { Auth } from '../../model/auth';
import { AuthErrorCode, AUTH_ERROR_FACTORY } from '../errors';
import { AuthEventType, EventProcessors } from '../../model/auth_event';
import { PopupRedirectResolver } from '../../model/popup_redirect_resolver';
import { OAuthProvider } from '../providers/oauth';
import { UserCredential, OperationType } from '../../model/user_credential';
import { signInWithIdp, SignInWithIdpRequest } from '../../api/authentication';
import { initializeCurrentUserFromIdTokenResponse } from '.';
import { authCredentialFromTokenResponse } from './auth_credential';
import { User } from '../../model/user';
import { generateEventId } from '../util/event_id';
import { reloadWithoutSaving } from '../account_management/reload';

export async function signInWithRedirect(
  auth: Auth,
  provider: OAuthProvider,
  resolver?: PopupRedirectResolver
): Promise<never> {
  resolver = resolver || auth.popupRedirectResolver;
  if (!resolver) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.OPERATION_NOT_SUPPORTED, {
      appName: auth.name
    });
  }

  // await initAuthStateManager(auth);
  // TODO: Persist current type of persistence
  // TODO: Init event listener & subscribe to events
  //       self.authEventManager_.subscribe(self);
  //       set popupRedirectEnabled_  = true on user (why?)
  // TODO: Set redirect out flag
  //       this.pendingRedirectStorageManager_.setPendingStatus()

  // Redirect out
  return resolver.processRedirect(
    auth,
    provider,
    AuthEventType.SIGN_IN_VIA_REDIRECT
  );
}

export async function reauthenticateWithRedirect(
  auth: Auth,
  user: User,
  provider: OAuthProvider,
  resolver?: PopupRedirectResolver
): Promise<never> {
  resolver = resolver || auth.popupRedirectResolver;
  if (!resolver) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.OPERATION_NOT_SUPPORTED, {
      appName: auth.name
    });
  }

  const eventId = generateEventId(`${user.uid}:::`);
  user.redirectEventId_ = eventId;
  await auth.setRedirectUser_(user);

  return resolver.processRedirect(
    auth,
    provider,
    AuthEventType.REAUTH_VIA_REDIRECT,
    eventId
  );
}

export async function linkWithRedirect(
  auth: Auth,
  user: User,
  provider: OAuthProvider,
  resolver?: PopupRedirectResolver
): Promise<never> {
  resolver = resolver || auth.popupRedirectResolver;
  if (!resolver) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.OPERATION_NOT_SUPPORTED, {
      appName: auth.name
    });
  }

  // First, make sure the user isn't already linked
  await reloadWithoutSaving(auth, user);
  if (user.providerData.find(p => p.providerId === provider.providerId)) {
    auth.updateCurrentUser(user);
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.PROVIDER_ALREADY_LINKED, {
      appName: auth.name
    });
  }

  const eventId = generateEventId(`${user.uid}:::`);
  user.redirectEventId_ = eventId;
  await auth.setRedirectUser_(user);

  return resolver.processRedirect(
    auth,
    provider,
    AuthEventType.LINK_VIA_REDIRECT,
    eventId
  );
}

interface PendingPromise {
  resolve: (cred: UserCredential | null) => void;
  reject: (error: Error) => void;
}

export class RedirectManager {
  private redirectOutcome: (() => Promise<UserCredential | null>) | null = null;
  private readonly redirectListeners: PendingPromise[] = [];

  getRedirectPromiseOrInit(initCb: () => void): Promise<UserCredential | null> {
    if (this.redirectOutcome) {
      return this.redirectOutcome();
    }

    return new Promise<UserCredential | null>((resolve, reject) => {
      initCb();
      this.redirectListeners.push({ resolve, reject });
    });
  }

  broadcastRedirectResult(cred: UserCredential | null, error?: Error) {
    for (const listener of this.redirectListeners) {
      if (error) {
        listener.reject(error);
      } else {
        listener.resolve(cred);
      }
    }

    this.redirectOutcome = () => {
      return error ? Promise.reject(error) : Promise.resolve(cred);
    };
  }
}

// async function onDomReady(): Promise<void> {
//   if (document.readyState == 'complete') {
//     return;
//   }
//   return new Promise((resolve) => {
//     const resolver = () => {
//       resolve();
//       window.removeEventListener('load', resolver, );
//     };
//     window.addEventListener('load', resolver);
//   });
// }

// class RedirectUserManager {
//   private readonly key: string;
//   persistence: Persistence;
//   constructor(auth: Auth) {
//     this.key = persistenceKeyName_('redirectUser', auth.config.apiKey, auth.name);
//     this.persistence = browserSessionPersistence;
//   }
//   getRedirectUser(): Promise<User | null> {
//     return this.persistence.get<User>(this.key);
//   }
//   setRedirectUser(user: User): Promise<void> {
//     return this.persistence.set(this.key, user);
//   }
//   removeRedirectUser(): Promise<void> {
//     return this.persistence.remove(this.key);
//   }
// }

// async function initRedirectUser_(auth: Auth): Promise<User | null> {
//   const redirectUserStorageManager_ = new RedirectUserManager(auth);
//   const user = await redirectUserStorageManager_.getRedirectUser();
//   await redirectUserStorageManager_.removeRedirectUser();
//   return user;
// }

// class AuthEventManager {
//   private popupRedirectEnabled_: boolean = false;
//   constructor() {}

//   static getManager(auth: Auth): AuthEventManager {
//     throw "not implemented";
//   }

//   subscribe(subscriber: User | Auth) {

//   }

//   getRedirectResult(): Promise<UserCredential | null> {
//     throw "not implemented";
//   }

//   enablePopupRedirect(user: User) {
//     if (!this.popupRedirectEnabled_) {
//       this.popupRedirectEnabled_ = true;
//       this.subscribe(user);
//     }
//   }
// }

// async function initEventManager(auth: Auth): Promise<AuthEventManager> {
//   // By this time currentUser should be ready if available and will be able
//   // to resolve linkWithRedirect if detected.
//   const authEventManager_ = AuthEventManager.getManager(auth);
//   // Subscribe Auth instance.
//   authEventManager_.subscribe(auth);
//   // Subscribe current user by enabling popup and redirect on that user.
//   if (auth.currentUser) {
//     authEventManager_.enablePopupRedirect(auth.currentUser);
//   }
//   // If a redirect user is present, subscribe to popup and redirect events.
//   // In case current user was not available and the developer called link
//   // with redirect on a signed out user, this will work and the linked
//   // logged out user will be returned in getRedirectResult.
//   // current user and redirect user are the same (was already logged in),
//   // currentUser will have priority as it is subscribed before redirect
//   // user. This change will also allow further popup and redirect events on
//   // the redirect user going forward.
//   const redirectUser = await initRedirectUser_(auth);
//   if (redirectUser) {
//     authEventManager_.enablePopupRedirect(redirectUser);
//     // Set the user language for the redirect user.
//     // TODO: setUserLanguage_(redirectUser_);
//     // Set the user Firebase frameworks for the redirect user.
//     // TODO: setUserFramework_(redirectUser_);
//   }
//   return authEventManager_;
// }

// let eventManagerProviderPromise_: Promise<AuthEventManager> | null = null;

// async function getAuthEventManager_(auth: Auth): Promise<AuthEventManager> {
//   eventManagerProviderPromise_ = eventManagerProviderPromise_ || initEventManager(auth);
//   return eventManagerProviderPromise_;
// }

// export async function getRedirectResult(
//   auth: Auth,
//   resolver?: PopupRedirectResolver
// ): Promise<UserCredential | null> {
//   throw new Error('no');
//   resolver = resolver || auth.popupRedirectResolver;
//   if (!resolver) {
//     throw AUTH_ERROR_FACTORY.create(AuthErrorCode.OPERATION_NOT_SUPPORTED, {
//       appName: auth.name
//     });
//   }
//   // return resolver.getRedirectResult(auth);
// }
