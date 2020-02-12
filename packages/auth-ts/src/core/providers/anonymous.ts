import { AuthCredential } from '../strategies/auth_credential';
import { ProviderId, SignInMethod, AuthProvider } from '.';
import { Auth } from '../..';
import { IdTokenResponse } from '../../model/id_token';
import { signUp } from '../../api/authentication';

export class AnonymousCredential implements AuthCredential {
  providerId = ProviderId.ANONYMOUS;
  signInMethod = SignInMethod.ANONYMOUS;
  toJSON(): object {
    throw new Error('Method not implemented.');
  }
  async getIdTokenResponse_(auth: Auth): Promise<IdTokenResponse> {
    return signUp(auth, {
      returnSecureToken: true
    });
  }
}

export class AnonymousProvider implements AuthProvider {
  providerId = ProviderId.ANONYMOUS;
  static credential(): AnonymousCredential {
    return new AnonymousCredential();
  }
}
