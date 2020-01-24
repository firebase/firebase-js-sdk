import { AuthProvider } from '.';
import { AuthCredential } from '../../model/auth_credential';

export class EmailAuthProvider implements AuthProvider {
  static readonly PROVIDER_ID: string;
  static readonly EMAIL_PASSWORD_SIGN_IN_METHOD: string;
  static readonly EMAIL_LINK_SIGN_IN_METHOD: string;
  readonly providerId: string = 'email';
  static credential(email: string, password: string): AuthCredential {
    throw new Error('not implemented');
  }
  static credentialWithLink(email: string, emailLink: string): AuthCredential {
    throw new Error('not implemented');
  }
}
