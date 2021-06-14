/**
 * An enum of factors that may be used for multifactor authentication.
 *
 * @public
 */
 export const FactorId = {
  /** Phone as second factor */
  PHONE: 'phone'
};

/**
 * Enumeration of supported providers.
 *
 * @public
 */
 export const ProviderId = {
  /** @internal */
  ANONYMOUS: 'anonymous',
  /** @internal */
  CUSTOM: 'custom',
  /** Facebook provider ID */
  FACEBOOK: 'facebook.com',
  /** @internal */
  FIREBASE: 'firebase',
  /** GitHub provider ID */
  GITHUB: 'github.com',
  /** Google provider ID */
  GOOGLE: 'google.com',
  /** Password provider */
  PASSWORD: 'password',
  /** Phone provider */
  PHONE: 'phone',
  /** Twitter provider ID */
  TWITTER: 'twitter.com'
};


/**
 * Enumeration of supported sign-in methods.
 *
 * @public
 */
 export const SignInMethod = {
  /** @internal */
  ANONYMOUS: 'anonymous',
  /** Email link sign in method */
  EMAIL_LINK: 'emailLink',
  /** Email/password sign in method */
  EMAIL_PASSWORD: 'password',
  /** Facebook sign in method */
  FACEBOOK: 'facebook.com',
  /** GitHub sign in method */
  GITHUB: 'github.com',
  /** Google sign in method */
  GOOGLE: 'google.com',
  /** Phone sign in method */
  PHONE: 'phone',
  /** Twitter sign in method */
  TWITTER: 'twitter.com'
};

/**
 * Enumeration of supported operation types.
 *
 * @public
 */
 export const OperationType = {
  /** Operation involving linking an additional provider to an already signed-in user. */
  LINK: 'link',
  /** Operation involving using a provider to reauthenticate an already signed-in user. */
  REAUTHENTICATE: 'reauthenticate',
  /** Operation involving signing in a user. */
  SIGN_IN: 'signIn'
};


/**
 * An enumeration of the possible email action types.
 *
 * @public
 */
 export const ActionCodeOperation = {
  /** The email link sign-in action. */
  EMAIL_SIGNIN: 'EMAIL_SIGNIN',
  /** The password reset action. */
  PASSWORD_RESET: 'PASSWORD_RESET',
  /** The email revocation action. */
  RECOVER_EMAIL: 'RECOVER_EMAIL',
  /** The revert second factor addition email action. */
  REVERT_SECOND_FACTOR_ADDITION: 'REVERT_SECOND_FACTOR_ADDITION',
  /** The revert second factor addition email action. */
  VERIFY_AND_CHANGE_EMAIL: 'VERIFY_AND_CHANGE_EMAIL',
  /** The email verification action. */
  VERIFY_EMAIL: 'VERIFY_EMAIL'
};