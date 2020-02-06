import { PopupRedirectResolver } from '../model/popup_redirect_resolver';
import { Auth } from '../../src';
import { AuthEventType } from '../model/auth_event';
import { UserCredential } from '../model/user_credential';
import { OAuthProvider } from '../core/providers/oauth';

export class CordovaPopupRedirectResolver implements PopupRedirectResolver {
  processPopup(
    auth: Auth,
    provider: OAuthProvider,
    authType: AuthEventType
  ): Promise<UserCredential> {
    throw new Error('not implemented');
  }

  processRedirect(
    auth: Auth,
    provider: OAuthProvider,
    authType: AuthEventType
  ): Promise<never> {
    throw new Error('not implemented');
  }
}

export const cordovaPopupRedirectResolver: CordovaPopupRedirectResolver = new CordovaPopupRedirectResolver();
