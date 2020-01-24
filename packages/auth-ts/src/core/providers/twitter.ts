import { AuthProvider } from '.';
import { AuthCredential, OAuthCredential } from '../../model/auth_credential';
import { UserCredential } from '../../model/user_credential';
import { AuthError } from '../errors';

export class TwitterAuthProvider implements AuthProvider {
  static readonly PROVIDER_ID: string;
  static readonly TWITTER_SIGN_IN_METHOD: string;
  readonly providerId: string = 'twitter';
  static credential(token: string, secret: string): AuthCredential {
    throw new Error('not implemented');
  }
  static credentialFromResult(
    userCredential: UserCredential
  ): OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromError(error: AuthError): OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromJSON(json: object): OAuthCredential {
    throw new Error('not implemented');
  }

  setCustomParameters(customOAuthParameters: object): AuthProvider {
    throw new Error('not implemented');
  }
}
