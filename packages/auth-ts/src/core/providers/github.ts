import { AuthProvider } from '.';
import { OAuthCredential } from '../../model/auth_credential';
import { UserCredential } from '../../model/user_credential';
import { AuthError } from '../errors';

export class GithubAuthProvider implements AuthProvider {
  static readonly PROVIDER_ID: string;
  static readonly GITHUB_SIGN_IN_METHOD: string;
  readonly providerId: string = 'github';
  static credential(accessToken: string): OAuthCredential {
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

  addScope(scope: string): AuthProvider {
    throw new Error('not implemented');
  }
  setCustomParameters(customOAuthParameters: object): AuthProvider {
    throw new Error('not implemented');
  }
}