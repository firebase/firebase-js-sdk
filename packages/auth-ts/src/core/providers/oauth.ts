import { AuthProvider, ProviderId } from '../providers';
import { UserCredential } from '../../model/user_credential';
import { OAuthCredential } from '../../model/auth_credential';
import { AuthError } from '../errors';
import { LanguageCode } from '../../model/auth';

export interface CustomParameters {[key: string]: string};

export class OAuthProvider implements AuthProvider {
  private defaultLanguageCode: LanguageCode | null = null;
  constructor(readonly providerId: ProviderId) {}
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
  setDefaultLanguage(languageCode: LanguageCode | null): void {
    this.defaultLanguageCode = languageCode;
  }
  setCustomParameters(customOAuthParameters: CustomParameters): AuthProvider {
    throw new Error('not implemented');
  }
  getCustomParameters(): CustomParameters {
    return {};
  }
}