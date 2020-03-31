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
import {
  signInWithRedirect,
  reauthenticateWithRedirect,
  linkWithRedirect
} from './core/strategies/redirect';
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
import { UserCredential } from './model/user_credential';
import { ProviderId, AuthProvider } from './core/providers';
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
import {
  signInWithPopup,
  reauthenticateWithPopup,
  linkWithPopup
} from './core/strategies/popup';
import { signInWithCustomToken } from './core/strategies/custom_token';
import { PhoneMultiFactorGenerator } from './core/mfa/multi_factor_assertion';
import { MultiFactorAssertion, MultiFactorInfo } from './model/multi_factor';
import { multiFactor } from './core/mfa/multi_factor';
import { AuthErrorCode } from './core/errors';
import { getMultiFactorResolver } from './core/mfa/multi_factor_resolver';
import {
  AdditionalUserInfo,
  getAdditionalUserInfo
} from './model/additional_user_info';

interface FirebaseAuth extends Auth {}
interface LegacyUserCredential {
  user: User | null;
  credential: AuthCredential | null;
  operationType: OperationType | null;
  // TODO: Change to be legacy AdditionalUserInfo
  additionalUserInfo: AdditionalUserInfo | null;
}

function addAdditionalUserInfo(
  userCredential: UserCredential
): LegacyUserCredential {
  return Object.assign({}, userCredential, {
    additionalUserInfo: getAdditionalUserInfo(userCredential)
  });
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

const firebaseApp = firebase as FirebaseApp;

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
    PhoneMultiFactorGenerator: {
      assertion(cred: PhoneAuthCredential): MultiFactorAssertion;
    };
  };
}

/**
 * Replicate the original Firebase Auth interface, which provides one stateful object with all methods defined for all platforms.
 */
firebaseApp.auth = function() {
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

  async function catchMfaErr<T>(cb: () => Promise<T>): Promise<T> {
    try {
      return await cb();
    } catch (e) {
      if (e.code === `auth/${AuthErrorCode.MFA_REQUIRED}`) {
        e.resolver = getMultiFactorResolver(auth, e);
      }

      throw e;
    }
  }

  // TODO: maybe try not to race condition? how about that
  auth.onAuthStateChanged((user: User | null) => {
    if (user) {
      const mfaUser = multiFactor(user);
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
        ): Promise<LegacyUserCredential> {
          return catchMfaErr(() =>
            reauthenticateWithCredential(auth, user, credential)
          ).then(addAdditionalUserInfo);
        },
        reauthenticateWithPhoneNumber(
          number: string,
          appVerifier: ApplicationVerifier
        ): Promise<ConfirmationResult> {
          return reauthenticateWithPhoneNumber(auth, user, number, appVerifier);
        },
        reauthenticateWithRedirect(provider: OAuthProvider): Promise<never> {
          const resolver = isMobileCordova()
            ? cordovaPopupRedirectResolver
            : browserPopupRedirectResolver;
          return catchMfaErr(() =>
            reauthenticateWithRedirect(auth, user, provider, resolver)
          );
        },
        reauthenticateWithPopup(
          provider: OAuthProvider
        ): Promise<LegacyUserCredential | null> {
          const resolver = isMobileCordova()
            ? cordovaPopupRedirectResolver
            : browserPopupRedirectResolver;
          return catchMfaErr(() =>
            reauthenticateWithPopup(auth, user, provider, resolver)
          ).then(cred => (!!cred ? addAdditionalUserInfo(cred) : null));
        },
        updateProfile(profile: ProfileInfo): Promise<void> {
          return updateProfile(auth, user, profile);
        },
        linkWithCredential(
          credential: AuthCredential
        ): Promise<LegacyUserCredential> {
          return linkWithCredential(auth, user, credential).then(
            addAdditionalUserInfo
          );
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
        },
        linkWithRedirect(provider: OAuthProvider): Promise<never> {
          const resolver = isMobileCordova()
            ? cordovaPopupRedirectResolver
            : browserPopupRedirectResolver;
          return linkWithRedirect(auth, user, provider, resolver);
        },
        linkWithPopup(
          provider: OAuthProvider
        ): Promise<LegacyUserCredential | null> {
          const resolver = isMobileCordova()
            ? cordovaPopupRedirectResolver
            : browserPopupRedirectResolver;
          return linkWithPopup(auth, user, provider, resolver).then(cred =>
            !!cred ? addAdditionalUserInfo(cred) : null
          );
        },
        multiFactor: {
          getSession() {
            return mfaUser.getSession();
          },
          enroll(assertion: MultiFactorAssertion, displayName?: string) {
            return mfaUser.enroll(auth, assertion, displayName);
          },
          unenroll(option: MultiFactorInfo | string): Promise<void> {
            return mfaUser.unenroll(auth, option);
          },
          get enrolledFactors(): MultiFactorInfo[] {
            return mfaUser.enrolledFactors;
          }
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
    async getRedirectResult(): Promise<LegacyUserCredential> {
      const resolver = isMobileCordova()
        ? cordovaPopupRedirectResolver
        : browserPopupRedirectResolver;

      const result = await catchMfaErr(() => resolver.getRedirectResult(auth));
      if (!result) {
        return {
          user: null,
          credential: null,
          operationType: null,
          additionalUserInfo: null
        };
      }
      return addAdditionalUserInfo(result);
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
    signInAnonymously(): Promise<LegacyUserCredential> {
      return signInAnonymously(auth).then(addAdditionalUserInfo);
    },
    signInWithCredential(
      credential: AuthCredential
    ): Promise<LegacyUserCredential> {
      return catchMfaErr(() => signInWithCredential(auth, credential)).then(
        addAdditionalUserInfo
      );
    },
    createUserWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<LegacyUserCredential> {
      return createUserWithEmailAndPassword(auth, email, password).then(
        addAdditionalUserInfo
      );
    },
    signInWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<LegacyUserCredential> {
      return catchMfaErr(() =>
        signInWithEmailAndPassword(auth, email, password)
      ).then(addAdditionalUserInfo);
    },
    signInWithCustomToken(token: string): Promise<LegacyUserCredential> {
      return catchMfaErr(() => signInWithCustomToken(auth, token)).then(
        addAdditionalUserInfo
      );
    },
    signInWithEmailLink(
      email: string,
      emailLink?: string
    ): Promise<LegacyUserCredential> {
      return catchMfaErr(() =>
        signInWithEmailLink(auth, email, emailLink)
      ).then(addAdditionalUserInfo);
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
    signInWithPopup(
      provider: OAuthProvider
    ): Promise<LegacyUserCredential | null> {
      return catchMfaErr(() =>
        signInWithPopup(
          auth,
          provider,
          isMobileCordova()
            ? cordovaPopupRedirectResolver
            : browserPopupRedirectResolver
        )
      ).then(cred => (!!cred ? addAdditionalUserInfo(cred) : cred));
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

  const LegacyPhoneMultiFactorGenerator = {
    assertion(credential: PhoneAuthCredential) {
      return PhoneMultiFactorGenerator.assertion(auth, credential);
    }
  };

  Object.assign(firebaseApp.auth, {
    PhoneMultiFactorGenerator: LegacyPhoneMultiFactorGenerator
  });
  return memo;
};

Object.assign(firebaseApp.auth, {
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
