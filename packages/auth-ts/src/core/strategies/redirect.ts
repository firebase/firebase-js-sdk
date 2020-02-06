import { Auth } from '../../model/auth';
import { AuthError, AUTH_ERROR_FACTORY } from '../errors';
import { AuthEventType } from '../../model/auth_event';
import { PopupRedirectResolver } from '../../model/popup_redirect_resolver';
import { OAuthProvider } from '../providers/oauth';
import { UserCredential } from '../../model/user_credential';

async function initAuthStateManager(auth: Auth): Promise<void> {
  if (!auth.config.authDomain) {
    throw AUTH_ERROR_FACTORY.create(AuthError.MISSING_AUTH_DOMAIN, { appName: auth.name });
  }

  await auth.isInitialized();

  // TODO: throw OPERATION_NOT_SUPPORTED if persistence is not local or indexedDB

  // TODO: what else to do here?
}

export async function signInWithRedirect(
  auth: Auth, provider: OAuthProvider, resolver?: PopupRedirectResolver): Promise<never> {
  resolver = resolver || auth.popupRedirectResolver;
  if(!resolver) {
    throw AUTH_ERROR_FACTORY.create(AuthError.OPERATION_NOT_SUPPORTED, { appName: auth.name});
  }

  await initAuthStateManager(auth);
  // TODO: Persist current type of persistence
  // TODO: Init event listener & subscribe to events
  //       self.authEventManager_.subscribe(self);
  //       set popupRedirectEnabled_  = true on user (why?)
  // TODO: Set redirect out flag
  //       this.pendingRedirectStorageManager_.setPendingStatus()
  
  // Redirect out
  return resolver.processRedirect(auth, provider, AuthEventType.SIGN_IN_VIA_REDIRECT);
}

export async function getRedirectResult(auth: Auth): Promise<UserCredential | null> {
  throw new Error("not implemented");
}