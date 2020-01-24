import { AuthProvider } from '.';
import { UserCredential } from '../../model/user_credential';
import { AuthCredential } from '../../model/auth_credential';
import { AuthError } from '../errors';

export class SAMLAuthProvider implements AuthProvider {
  constructor(readonly providerId: string) {}
  static credentialFromResult(
    userCredential: UserCredential
  ): AuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromError(error: AuthError): AuthCredential | null {
    throw new Error('not implemented');
  }
  static credentialFromJSON(json: object): AuthCredential {
    throw new Error('not implemented');
  }
}
