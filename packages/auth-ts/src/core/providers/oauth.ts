import { AuthProvider } from '.';
import { UserCredential } from '../../model/user_credential';
import { OAuthCredential } from '../../model/auth_credential';
import { AuthError } from '../errors';

export class OAuthProvider implements AuthProvider {
  constructor(readonly providerId: string) {}
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
  addScope(scope: string): AuthProvider {
    throw new Error('not implemented');
  }
  credential(
    idToken?: string,
    accessToken?: string,
    rawNonce?: string
  ): OAuthCredential {
    throw new Error('not implemented');
  }
  setCustomParameters(customOAuthParameters: object): AuthProvider {
    throw new Error('not implemented');
  }
}