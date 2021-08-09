/**
 * Enumeration of supported providers.
 *
 */
 export const enum ProviderId {
    /** @internal */
    ANONYMOUS = 'anonymous',
    /** @internal */
    CUSTOM = 'custom',
    /** Facebook provider ID */
    FACEBOOK = 'facebook.com',
    /** @internal */
    FIREBASE = 'firebase',
    /** GitHub provider ID */
    GITHUB = 'github.com',
    /** Google provider ID */
    GOOGLE = 'google.com',
    /** Password provider */
    PASSWORD = 'password',
    /** Phone provider */
    PHONE = 'phone',
    /** Twitter provider ID */
    TWITTER = 'twitter.com'
  }
  
  /**
   * Enumeration of supported sign-in methods.
   *
   */
  export const enum SignInMethod {
    /** @internal */
    ANONYMOUS = 'anonymous',
    /** Email link sign in method */
    EMAIL_LINK = 'emailLink',
    /** Email/password sign in method */
    EMAIL_PASSWORD = 'password',
    /** Facebook sign in method */
    FACEBOOK = 'facebook.com',
    /** GitHub sign in method */
    GITHUB = 'github.com',
    /** Google sign in method */
    GOOGLE = 'google.com',
    /** Phone sign in method */
    PHONE = 'phone',
    /** Twitter sign in method */
    TWITTER = 'twitter.com'
  }
  
  /**
   * Enumeration of supported operation types.
   *
   */
  export const enum OperationType {
    /** Operation involving linking an additional provider to an already signed-in user. */
    LINK = 'link',
    /** Operation involving using a provider to reauthenticate an already signed-in user. */
    REAUTHENTICATE = 'reauthenticate',
    /** Operation involving signing in a user. */
    SIGN_IN = 'signIn'
  }