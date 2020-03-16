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

import firebase from '@firebase/app';
import { isMobileCordova } from '@firebase/util';
import { Auth } from './model/auth';
import { signInAnonymously } from './core/strategies/anonymous';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode
} from './core/strategies/email_and_password';
import { signInWithRedirect } from './core/strategies/redirect';
import { initializeAuth } from './core/initialize_auth';
import { OAuthProvider } from './core/providers/oauth';
import { browserPopupRedirectResolver } from './platform_browser/browser_popup_redirect_resolver';
import { cordovaPopupRedirectResolver } from './platform_cordova/cordova_popup_redirect_resolver';
import { User, ProfileInfo } from './model/user';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from './core/strategies/email_link';
import { ActionCodeSettings } from './model/action_code_settings';
import { fetchSignInMethodsForEmail } from './core/strategies/email';
import {
  signInWithCredential,
  linkWithCredential,
  reauthenticateWithCredential
} from './core/strategies/auth_credential';
import {
  EmailAuthProvider,
  emailAuthCredentialWithLink
} from './core/providers/email';
import { ActionCodeURL, actionCodeURLfromLink } from './model/action_code_url';
import { deleteUser } from './core/account_management/delete';
import { ActionCodeInfo } from './model/action_code_info';
import { checkActionCode } from './core/strategies/action_code';
import { updateProfile } from './core/account_management/update_profile';
import { reload } from './core/account_management/reload';
import { GoogleAuthProvider } from './core/providers/google';
import { OperationType } from './model/user_credential';
import { FacebookAuthProvider } from './core/providers/facebook';
import { GithubAuthProvider } from './core/providers/github';
import { SAMLAuthProvider } from './core/providers/saml';
import { PhoneAuthProvider, PhoneAuthCredential } from './core/providers/phone';
import { TwitterAuthProvider } from './core/providers/twitter';
import { RecaptchaVerifier } from './platform_browser/recaptcha_verifier';
import { ApplicationVerifier } from './model/application_verifier';
import { ConfirmationResult } from './model/confirmation_result';
import {
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  reauthenticateWithPhoneNumber
} from './core/strategies/sms';
import { AuthCredential } from './model/auth_credential';
import { ProviderId } from './core/providers';
import { unlink } from './core/account_management/unlink';
import {
  updateEmail,
  updatePassword
} from './core/account_management/update_email_password';
import { updatePhoneNumber } from './core/account_management/update_phone_number';
import { browserLocalPersistence } from './core/persistence/browser_local';
import { browserSessionPersistence } from './core/persistence/browser_session';
import { inMemoryPersistence } from './core/persistence/in_memory';
import { indexedDBLocalPersistence } from './core/persistence/indexed_db';

interface FirebaseAuth extends Auth {}
interface UserCredential {
  user: User | null;
  credential: AuthCredential | null;
  operationType: OperationType | null;
}

interface FirebaseApp {
  auth?(): FirebaseAuth;
}

let memo: FirebaseAuth;

enum Persistence {
  LOCAL = 'local',
  SESSION = 'session',
  NONE = 'none'
}

/**
 * Replicate the original Firebase Auth interface, which provides one stateful object with all methods defined for all platforms.
 */
(firebase as FirebaseApp).auth = function() {
  if (memo) {
    return memo;
  }
  const auth: Auth = initializeAuth(firebase.app(), {
    // TODO: The legacy SDK migrates localStorage -> indexedDB
    persistence: [
      browserSessionPersistence,
      indexedDBLocalPersistence,
      browserLocalPersistence
    ]
  });
  // TODO: maybe try not to race condition? how about that
  auth.onAuthStateChanged((user: User | null) => {
    if (user) {
      Object.assign(user, {
        apiKey: auth.config.apiKey,
        appName: auth.name,
        authDomain: auth.config.authDomain,
        stsTokenManager: Object.assign(user.stsTokenManager, {
          apiKey: auth.config.apiKey
        }),
        sendEmailVerification(
          actionCodeSettings?: ActionCodeSettings
        ): Promise<void> {
          return sendEmailVerification(auth, user, actionCodeSettings);
        },
        delete(): Promise<void> {
          return deleteUser(auth, user);
        },
        reload(): Promise<void> {
          return reload(auth, user);
        },
        reauthenticateWithCredential(
          credential: AuthCredential
        ): Promise<UserCredential> {
          return reauthenticateWithCredential(auth, user, credential);
        },
        reauthenticateWithPhoneNumber(
          number: string,
          appVerifier: ApplicationVerifier
        ): Promise<ConfirmationResult> {
          return reauthenticateWithPhoneNumber(auth, user, number, appVerifier);
        },
        updateProfile(profile: ProfileInfo): Promise<void> {
          return updateProfile(auth, user, profile);
        },
        linkWithCredential(
          credential: AuthCredential
        ): Promise<UserCredential> {
          return linkWithCredential(auth, user, credential);
        },
        linkWithPhoneNumber(
          phoneNumber: string,
          appVerifier: ApplicationVerifier
        ): Promise<ConfirmationResult> {
          return linkWithPhoneNumber(auth, user, phoneNumber, appVerifier);
        },
        unlink(providerId: string): Promise<User> {
          return unlink(auth, user, providerId as ProviderId);
        },
        updateEmail(newEmail: string): Promise<void> {
          return updateEmail(auth, user, newEmail);
        },
        updatePassword(newPassword: string): Promise<void> {
          return updatePassword(auth, user, newPassword);
        },
        updatePhoneNumber(phoneCredential: PhoneAuthCredential): Promise<void> {
          return updatePhoneNumber(auth, user, phoneCredential);
        }
      });
    }
  });
  const originalSetPersistence = auth.setPersistence;
  memo = Object.assign(auth, {
    ActionCodeURL: Object.assign(ActionCodeURL, {
      parseLink(link: string): ActionCodeURL | null {
        return actionCodeURLfromLink(auth, link);
      }
    }),
    EmailAuthProvider: Object.assign(EmailAuthProvider, {
      credentialWithLink(email: string, emailLink: string): AuthCredential {
        return emailAuthCredentialWithLink(auth, email, emailLink);
      }
    }),
    checkActionCode(code: string): Promise<ActionCodeInfo> {
      return checkActionCode(auth, code);
    },
    confirmPasswordReset(code: string, newPassword: string): Promise<void> {
      return confirmPasswordReset(auth, code, newPassword);
    },
    fetchSignInMethodsForEmail(email: string): Promise<string[]> {
      return fetchSignInMethodsForEmail(auth, email);
    },
    async getRedirectResult(): Promise<UserCredential> {
      const resolver = isMobileCordova()
        ? cordovaPopupRedirectResolver
        : browserPopupRedirectResolver;

      const result = await resolver.getRedirectResult(auth);
      if (!result) {
        return { user: null, credential: null, operationType: null };
      }
      return result;
    },
    isSignInWithEmailLink(emailLink: string): boolean {
      return isSignInWithEmailLink(auth, emailLink);
    },
    sendPasswordResetEmail(
      email: string,
      actionCodeSettings?: ActionCodeSettings
    ): Promise<void> {
      return sendPasswordResetEmail(auth, email, actionCodeSettings);
    },
    sendSignInLinkToEmail(
      email: string,
      actionCodeSettings?: ActionCodeSettings
    ): Promise<void> {
      return sendSignInLinkToEmail(auth, email, actionCodeSettings);
    },
    signInAnonymously(): Promise<UserCredential> {
      return signInAnonymously(auth);
    },
    signInWithCredential(credential: AuthCredential): Promise<UserCredential> {
      return signInWithCredential(auth, credential);
    },
    createUserWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<UserCredential> {
      return createUserWithEmailAndPassword(auth, email, password);
    },
    signInWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<UserCredential> {
      return signInWithEmailAndPassword(auth, email, password);
    },
    signInWithEmailLink(
      email: string,
      emailLink?: string
    ): Promise<UserCredential> {
      return signInWithEmailLink(auth, email, emailLink);
    },
    signInWithRedirect(provider: OAuthProvider): Promise<never> {
      return signInWithRedirect(
        auth,
        provider,
        isMobileCordova()
          ? cordovaPopupRedirectResolver
          : browserPopupRedirectResolver
      );
    },
    signInWithPhoneNumber(
      phoneNumber: string,
      appVerifier: ApplicationVerifier
    ): Promise<ConfirmationResult> {
      return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    },
    verifyPasswordResetCode(code: string): Promise<string> {
      return verifyPasswordResetCode(auth, code);
    },
    setPersistence(persistence: Persistence): Promise<void> {
      switch (persistence) {
        case Persistence.LOCAL:
          return originalSetPersistence.apply(auth, [browserLocalPersistence]);
        case Persistence.SESSION:
          return originalSetPersistence.apply(auth, [
            browserSessionPersistence
          ]);
        default:
          return originalSetPersistence.apply(auth, [inMemoryPersistence]);
      }
    }
  });
  return memo;
};

interface FirebaseNamespace {
  auth?: {
    (app?: FirebaseApp): FirebaseAuth;
    // Auth: typeof FirebaseAuth;
    EmailAuthProvider: typeof EmailAuthProvider;
    FacebookAuthProvider: typeof FacebookAuthProvider;
    GithubAuthProvider: typeof GithubAuthProvider;
    GoogleAuthProvider: typeof GoogleAuthProvider;
    OAuthProvider: typeof OAuthProvider;
    SAMLAuthProvider: typeof SAMLAuthProvider;
    PhoneAuthProvider: typeof PhoneAuthProvider;
    RecaptchaVerifier: typeof RecaptchaVerifier;
    TwitterAuthProvider: typeof TwitterAuthProvider;
    Auth: {
      Persistence: typeof Persistence;
    };
  };
}

Object.assign((firebase as FirebaseNamespace).auth, {
  EmailAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  SAMLAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  TwitterAuthProvider,
  Auth: {
    Persistence
  }
});
