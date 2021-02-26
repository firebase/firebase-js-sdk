import { SignInWithIdpResponse } from '../../api/authentication/idp';
import { TaggedWithTokenResponse } from '../../model/id_token';
import { AuthError, UserCredential } from '../../model/public_types';
import { UserCredentialInternal } from '../../model/user';
import { AuthCredential } from '../credentials';
import { SAMLAuthCredential } from '../credentials/saml';
import { AuthErrorCode } from '../errors';
import { _assert } from '../util/assert';
import { FederatedAuthProvider } from './federated';

const SAML_PROVIDER_PREFIX = 'saml.';

/**
 * An AuthProvider for SAML.
 * 
 * @public
 */
export class SAMLAuthProvider extends FederatedAuthProvider {

  /**
   * Constructor. The providerId must start with "saml."
   * @param providerId 
   */
  constructor(providerId: string) {
    _assert(providerId.startsWith(SAML_PROVIDER_PREFIX), AuthErrorCode.ARGUMENT_ERROR);
    super(providerId);
  }

  static credentialFromResult(
    userCredential: UserCredential): AuthCredential | null {
    return SAMLAuthProvider.samlCredentialFromTaggedObject(
      userCredential as UserCredentialInternal
    );
  }

  static credentialFromError(error: AuthError): AuthCredential | null {
    return SAMLAuthProvider.samlCredentialFromTaggedObject(
      (error.customData || {}) as TaggedWithTokenResponse
    );
  }

  static credentialFromJSON(json: string|object): AuthCredential {
    const credential = SAMLAuthCredential.fromJSON(json);
    _assert(credential, AuthErrorCode.ARGUMENT_ERROR);
    return credential;
  }

  private static samlCredentialFromTaggedObject({
    _tokenResponse: tokenResponse
  }: TaggedWithTokenResponse): SAMLAuthCredential | null {
    if (!tokenResponse) {
      return null;
    }

    const {
      pendingToken,
      providerId
    } = tokenResponse as SignInWithIdpResponse;

    if (!pendingToken || !providerId) {
      return null;
    }

    try {
      return SAMLAuthCredential._create(providerId, pendingToken);
    } catch (e) {
      return null;
    }
  }
}