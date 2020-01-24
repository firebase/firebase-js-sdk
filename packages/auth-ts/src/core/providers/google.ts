import { AuthProvider } from '.';
import { UserCredential } from '../../model/user_credential';
import { OAuthCredential } from '../../model/auth_credential';
import { AuthError } from '../errors';

export class GoogleAuthProvider implements AuthProvider {
  static readonly PROVIDER_ID: string;
  static readonly GOOGLE_SIGN_IN_METHOD: string;
  readonly providerId: string = 'google';
  static credentialFromResult(
    userCredential: UserCredential
  ): OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromError(error: AuthError): OAuthCredential | null {
    throw new Error('not implemented');
  }
  static credential(
    idToken?: string | null,
    accessToken?: string | null
  ): OAuthCredential {
    throw new Error('not implemented');
  }
  static credentialFromJSON(json: object): OAuthCredential {
    throw new Error('not implemented');
  }
  addScope(scope: string): AuthProvider {
    throw new Error('not implemented');
  }
  setCustomParameters(customOAuthParameters: object): AuthProvider {
    throw new Error('not implemented');
  }
}