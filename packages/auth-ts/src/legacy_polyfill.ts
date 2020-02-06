import firebase from '@firebase/app';
import { isMobileCordova } from '@firebase/util';
import { Auth } from './model/auth';
import { signInAnonymously } from './core/strategies/anonymous';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from './core/strategies/email_and_password';
import { getRedirectResult, signInWithRedirect } from './core/strategies/redirect';
import { initializeAuth } from './core/initialize_auth';
import { OAuthProvider } from './core/providers/oauth';
import { browserPopupRedirectResolver } from './platform_browser/browser_popup_redirect_resolver';
import { cordovaPopupRedirectResolver } from './platform_cordova/cordova_popup_redirect_resolver';
import { User } from './model/user';
import { ActionCodeSettings } from './model/action_code';
import { UserCredential } from './model/user_credential';

interface FirebaseAuth extends Auth {
  signInAnonymously(): Promise<UserCredential | null>,
  createUserWithEmailAndPassword(email: string, password: string): Promise<UserCredential | null>,
  signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential | null>,
  signInWithRedirect(provider: OAuthProvider): Promise<never>,
  getRedirectResult(): Promise<UserCredential | null>,
}

interface FirebaseApp {
  auth?(): FirebaseAuth;
}

let memo: FirebaseAuth;

/**
 * Replicate the original Firebase Auth interface, which provides one stateful object with all methods defined for all platforms.
 */
(firebase as FirebaseApp).auth = function() {
  if (memo) {
    return memo;
  }
  const auth: Auth = initializeAuth();
  // TODO: maybe try not to race condition? how about that
  auth.onAuthStateChanged((user: User | null) => {
    if(user) {
      Object.assign(user, {
        sendEmailVerification(actionCodeSettings?: ActionCodeSettings) {
          return sendEmailVerification(auth, user, actionCodeSettings);
        }
      });
    }
  });
  memo = Object.assign(auth, {
    signInAnonymously() {
      return signInAnonymously(auth);
    },
    createUserWithEmailAndPassword(email: string, password: string) {
      return createUserWithEmailAndPassword(auth,email, password);
    },
    signInWithEmailAndPassword(email: string, password: string) {
      return signInWithEmailAndPassword(auth, email, password);
    },
    signInWithRedirect(provider: OAuthProvider) {
      return signInWithRedirect(auth, provider, isMobileCordova() ? cordovaPopupRedirectResolver : browserPopupRedirectResolver);
    },
    getRedirectResult() {
      return getRedirectResult(auth);
    },
  });
  return memo;
};