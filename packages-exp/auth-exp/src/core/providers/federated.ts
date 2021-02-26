import { AuthProvider } from '../../model/public_types';

/**
 * Map of OAuth Custom Parameters.
 *
 * @public
 */
export type CustomParameters = Record<string, string>;

/**
 * The base class for all Federated providers (OAuth (including OIDC), SAML).
 * 
 * This class is not meant to be instantiated directly.
 * 
 * @public
 */
export abstract class FederatedAuthProvider implements AuthProvider {
  /** @internal */
  defaultLanguageCode: string | null = null;
  /** @internal */
  private customParameters: CustomParameters = {};

  /**
   * Constructor for generic OAuth providers.
   *
   * @param providerId - Provider for which credentials should be generated.
   */
  constructor(readonly providerId: string) {
  }

  /**
   * Set the language gode.
   *
   * @param languageCode - language code
   */
  setDefaultLanguage(languageCode: string | null): void {
    this.defaultLanguageCode = languageCode;
  }

  /**
   * Sets the OAuth custom parameters to pass in an OAuth request for popup and redirect sign-in
   * operations.
   *
   * @remarks
   * For a detailed list, check the reserved required OAuth 2.0 parameters such as `client_id`,
   * `redirect_uri`, `scope`, `response_type`, and `state` are not allowed and will be ignored.
   *
   * @param customOAuthParameters - The custom OAuth parameters to pass in the OAuth request.
   */
  setCustomParameters(customOAuthParameters: CustomParameters): AuthProvider {
    this.customParameters = customOAuthParameters;
    return this;
  }

  /**
   * Retrieve the current list of {@link CustomParameters}.
   */
  getCustomParameters(): CustomParameters {
    return this.customParameters;
  }
}