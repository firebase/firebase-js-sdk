/** Available in the browser. See static/anonymous.js */
export enum AnonFunction {
  SIGN_IN_ANONYMOUSLY = 'anonymous.anonymous',
};

/** Available redirect functions. See static/redirect.js */
export enum RedirectFunction {
  IDP_REDIRECT = 'redirect.idpRedirect',
  IDP_REAUTH_REDIRECT = 'redirect.idpReauthRedirect',
  IDP_LINK_REDIRECT = 'redirect.idpLinkRedirect',
  REDIRECT_RESULT = 'redirect.redirectResult',
  GENERATE_CREDENTIAL_FROM_RESULT = 'redirect.generateCredentialFromRedirectResultAndStore',
  SIGN_IN_WITH_REDIRECT_CREDENTIAL = 'redirect.signInWithRedirectCredential',
  LINK_WITH_ERROR_CREDENTIAL = 'redirect.linkWithErrorCredential',
  CREATE_FAKE_GOOGLE_USER = 'redirect.createFakeGoogleUser',
  TRY_TO_SIGN_IN_UNVERIFIED = 'redirect.tryToSignInUnverified',
};

/** Available core functions within the browser. See static/core.js */
export enum CoreFunction {
  RESET = 'core.reset',
  AWAIT_AUTH_INIT = 'core.authInit',
  USER_SNAPSHOT = 'core.userSnap',
  AUTH_SNAPSHOT = 'core.authSnap',
  SIGN_OUT = 'core.signOut',
}