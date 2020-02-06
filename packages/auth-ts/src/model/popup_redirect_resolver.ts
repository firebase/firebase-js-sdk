import { Auth } from '../../src';
import { AuthEventType } from './auth_event';
import { UserCredential } from './user_credential';
import { AuthProvider } from '../core/providers';

export interface PopupRedirectResolver {
  processPopup(
    auth: Auth,
    provider: AuthProvider,
    authType: AuthEventType
  ): Promise<UserCredential>;
  processRedirect(
    auth: Auth,
    provider: AuthProvider,
    authType: AuthEventType
  ): Promise<never>;
}
