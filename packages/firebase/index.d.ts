/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * <code>firebase</code> is a global namespace from which all the Firebase
 * services are accessed.
 */
declare namespace firebase {
  /**
   * @hidden
   */
  type NextFn<T> = (value: T) => void;
  /**
   * @hidden
   */
  type ErrorFn<E = Error> = (error: E) => void;
  /**
   * @hidden
   */
  type CompleteFn = () => void;

  /**
   * `FirebaseError` is a subclass of the standard JavaScript `Error` object. In
   * addition to a message string and stack trace, it contains a string code.
   */
  interface FirebaseError {
    /**
     * Error codes are strings using the following format: `"service/string-code"`.
     * Some examples include `"app/no-app"` and `"auth/user-not-found"`.
     *
     * While the message for a given error can change, the code will remain the same
     * between backward-compatible versions of the Firebase SDK.
     */
    code: string;
    /**
     * An explanatory message for the error that just occurred.
     *
     * This message is designed to be helpful to you, the developer. It is not
     * intended to be displayed to the end user of your application (as it will
     * generally not convey meaningful information to them).
     */
    message: string;
    /**
     * The name of the class of errors, namely `"FirebaseError"`.
     */
    name: string;
    /**
     * A string value containing the execution backtrace when the error originally
     * occurred. This may not always be available.
     *
     * This information can be useful to you and can be sent to
     * {@link https://firebase.google.com/support/ Firebase Support} to help
     * explain the cause of an error.
     */
    stack?: string;
  }

  /**
   * @hidden
   */
  interface Observer<T, E = Error> {
    next: NextFn<T>;
    error: ErrorFn<E>;
    complete: CompleteFn;
  }

  /**
   * The current SDK version.
   */
  var SDK_VERSION: string;

  /**
   * @hidden
   */
  type Unsubscribe = () => void;

  /**
   * A user account.
   */
  interface User extends firebase.UserInfo {
    /**
     * Deletes and signs out the user.
     *
     * <b>Important:</b> this is a security sensitive operation that requires the
     * user to have recently signed in. If this requirement isn't met, ask the user
     * to authenticate again and then call
     * {@link firebase.User.reauthenticateWithCredential}.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/requires-recent-login</dt>
     * <dd>Thrown if the user's last sign-in time does not meet the security
     *     threshold. Use {@link firebase.User.reauthenticateWithCredential} to
     *     resolve. This does not apply if the user is anonymous.</dd>
     * </dl>
     *
     * @return {!firebase.Promise<void>}
     */
    delete(): Promise<void>;
    emailVerified: boolean;
    getIdTokenResult(
      forceRefresh?: boolean
    ): Promise<firebase.auth.IdTokenResult>;
    /**
     * Returns a JWT token used to identify the user to a Firebase service.
     *
     * Returns the current token if it has not expired, otherwise this will
     * refresh the token and return a new one.
     *
     * @param {boolean=} forceRefresh Force refresh regardless of token
     *     expiration.
     * @return {!firebase.Promise<string>}
     */
    getIdToken(forceRefresh?: boolean): Promise<string>;
    isAnonymous: boolean;
    /**
     * Links the user account with the given credentials, and returns any available
     * additional user information, such as user name.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/provider-already-linked</dt>
     * <dd>Thrown if the provider has already been linked to the user. This error is
     *     thrown even if this is not the same provider's account that is currently
     *     linked to the user.</dd>
     * <dt>auth/invalid-credential</dt>
     * <dd>Thrown if the provider's credential is not valid. This can happen if it
     *     has already expired when calling link, or if it used invalid token(s).
     *     See the Firebase documentation for your provider, and make sure you pass
     *     in the correct parameters to the credential method.</dd>
     * <dt>auth/credential-already-in-use</dt>
     * <dd>Thrown if the account corresponding to the credential already exists
     *     among your users, or is already linked to a Firebase User.
     *     For example, this error could be thrown if you are upgrading an anonymous
     *     user to a Google user by linking a Google credential to it and the Google
     *     credential used is already associated with an existing Firebase Google
     *     user.
     *     The fields <code>error.email</code>, <code>error.phoneNumber</code>, and
     *     <code>error.credential</code> ({@link firebase.auth.AuthCredential})
     *     may be provided, depending on the type of credential. You can recover
     *     from this error by signing in with <code>error.credential</code> directly
     *     via {@link firebase.auth.Auth.signInWithCredential}.</dd>
     * <dt>auth/email-already-in-use</dt>
     * <dd>Thrown if the email corresponding to the credential already exists
     *     among your users. When thrown while linking a credential to an existing
     *     user, an <code>error.email</code> and <code>error.credential</code>
     *     ({@link firebase.auth.AuthCredential}) fields are also provided.
     *     You have to link the credential to the existing user with that email if
     *     you wish to continue signing in with that credential. To do so, call
     *     {@link firebase.auth.Auth.fetchProvidersForEmail}, sign in to
     *     <code>error.email</code> via one of the providers returned and then
     *     {@link firebase.User.linkWithCredential} the original credential to that
     *     newly signed in user.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if you have not enabled the provider in the Firebase Console. Go
     *     to the Firebase Console for your project, in the Auth section and the
     *     <strong>Sign in Method</strong> tab and configure the provider.</dd>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email used in a
     *     {@link firebase.auth.EmailAuthProvider.credential} is invalid.</dd>
     * <dt>auth/wrong-password</dt>
     * <dd>Thrown if the password used in a
     *     {@link firebase.auth.EmailAuthProvider.credential} is not correct or
     *     when the user associated with the email does not have a password.</dd>
     * <dt>auth/invalid-verification-code</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential} and the verification
     *     code of the credential is not valid.</dd>
     * <dt>auth/invalid-verification-id</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential}  and the verification
     *     ID of the credential is not valid.</dd>
     * </dl>
     *
     * @param {!firebase.auth.AuthCredential} credential The auth credential.
     * @return {!firebase.Promise<!firebase.auth.UserCredential>}
     */
    linkAndRetrieveDataWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<firebase.auth.UserCredential>;
    /**
     * Links the user account with the given credentials.
     *
     * This method is deprecated. Use
     * {@link firebase.User.linkAndRetrieveDataWithCredential} instead.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/provider-already-linked</dt>
     * <dd>Thrown if the provider has already been linked to the user. This error is
     *     thrown even if this is not the same provider's account that is currently
     *     linked to the user.</dd>
     * <dt>auth/invalid-credential</dt>
     * <dd>Thrown if the provider's credential is not valid. This can happen if it
     *     has already expired when calling link, or if it used invalid token(s).
     *     See the Firebase documentation for your provider, and make sure you pass
     *     in the correct parameters to the credential method.</dd>
     * <dt>auth/credential-already-in-use</dt>
     * <dd>Thrown if the account corresponding to the credential already exists
     *     among your users, or is already linked to a Firebase User.
     *     For example, this error could be thrown if you are upgrading an anonymous
     *     user to a Google user by linking a Google credential to it and the Google
     *     credential used is already associated with an existing Firebase Google
     *     user.
     *     The fields <code>error.email</code>, <code>error.phoneNumber</code>, and
     *     <code>error.credential</code> ({@link firebase.auth.AuthCredential})
     *     may be provided, depending on the type of credential. You can recover
     *     from this error by signing in with <code>error.credential</code> directly
     *     via {@link firebase.auth.Auth.signInWithCredential}.</dd>
     * <dt>auth/email-already-in-use</dt>
     * <dd>Thrown if the email corresponding to the credential already exists
     *     among your users. When thrown while linking a credential to an existing
     *     user, an <code>error.email</code> and <code>error.credential</code>
     *     ({@link firebase.auth.AuthCredential}) fields are also provided.
     *     You have to link the credential to the existing user with that email if
     *     you wish to continue signing in with that credential. To do so, call
     *     {@link firebase.auth.Auth.fetchProvidersForEmail}, sign in to
     *     <code>error.email</code> via one of the providers returned and then
     *     {@link firebase.User.linkWithCredential} the original credential to that
     *     newly signed in user.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if you have not enabled the provider in the Firebase Console. Go
     *     to the Firebase Console for your project, in the Auth section and the
     *     <strong>Sign in Method</strong> tab and configure the provider.</dd>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email used in a
     *     {@link firebase.auth.EmailAuthProvider.credential} is invalid.</dd>
     * <dt>auth/wrong-password</dt>
     * <dd>Thrown if the password used in a
     *     {@link firebase.auth.EmailAuthProvider.credential} is not correct or
     *     when the user associated with the email does not have a password.</dd>
     * <dt>auth/invalid-verification-code</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential} and the verification
     *     code of the credential is not valid.</dd>
     * <dt>auth/invalid-verification-id</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential}  and the verification
     *     ID of the credential is not valid.</dd>
     * </dl>
     *
     * @param {!firebase.auth.AuthCredential} credential The auth credential.
     * @return {!firebase.Promise<!firebase.User>}
     */
    linkWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<firebase.User>;
    /**
     * Links the user account with the given phone number.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/provider-already-linked</dt>
     * <dd>Thrown if the provider has already been linked to the user. This error is
     *     thrown even if this is not the same provider's account that is currently
     *     linked to the user.</dd>
     * <dt>auth/captcha-check-failed</dt>
     * <dd>Thrown if the reCAPTCHA response token was invalid, expired, or if
     *     this method was called from a non-whitelisted domain.</dd>
     * <dt>auth/invalid-phone-number</dt>
     * <dd>Thrown if the phone number has an invalid format.</dd>
     * <dt>auth/missing-phone-number</dt>
     * <dd>Thrown if the phone number is missing.</dd>
     * <dt>auth/quota-exceeded</dt>
     * <dd>Thrown if the SMS quota for the Firebase project has been exceeded.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given phone number has been
     *     disabled.</dd>
     * <dt>auth/credential-already-in-use</dt>
     * <dd>Thrown if the account corresponding to the phone number already exists
     *     among your users, or is already linked to a Firebase User.
     *     The fields <code>error.phoneNumber</code> and
     *     <code>error.credential</code> ({@link firebase.auth.AuthCredential})
     *     are provided in this case. You can recover from this error by signing in
     *     with that credential directly via
     *     {@link firebase.auth.Auth.signInWithCredential}.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if you have not enabled the phone authentication provider in the
     *     Firebase Console. Go to the Firebase Console for your project, in the
     *     Auth section and the <strong>Sign in Method</strong> tab and configure
     *     the provider.</dd>
     * </dl>
     *
     * @param {string} phoneNumber The user's phone number in E.164 format (e.g.
     *     +16505550101).
     * @param {!firebase.auth.ApplicationVerifier} applicationVerifier
     * @return {!firebase.Promise<!firebase.auth.ConfirmationResult>}
     */
    linkWithPhoneNumber(
      phoneNumber: string,
      applicationVerifier: firebase.auth.ApplicationVerifier
    ): Promise<firebase.auth.ConfirmationResult>;
    /**
     * Links the authenticated provider to the user account using a pop-up based
     * OAuth flow.
     *
     * If the linking is successful, the returned result will contain the user
     * and the provider's credential.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/auth-domain-config-required</dt>
     * <dd>Thrown if authDomain configuration is not provided when calling
     *     firebase.initializeApp(). Check Firebase Console for instructions on
     *     determining and passing that field.</dd>
     * <dt>auth/cancelled-popup-request</dt>
     * <dd>Thrown if successive popup operations are triggered. Only one popup
     *     request is allowed at one time on a user or an auth instance. All the
     *     popups would fail with this error except for the last one.</dd>
     * <dt>auth/credential-already-in-use</dt>
     * <dd>Thrown if the account corresponding to the credential already exists
     *     among your users, or is already linked to a Firebase User.
     *     For example, this error could be thrown if you are upgrading an anonymous
     *     user to a Google user by linking a Google credential to it and the Google
     *     credential used is already associated with an existing Firebase Google
     *     user.
     *     An <code>error.email</code> and <code>error.credential</code>
     *     ({@link firebase.auth.AuthCredential}) fields are also provided. You can
     *     recover from this error by signing in with that credential directly via
     *     {@link firebase.auth.Auth.signInWithCredential}.</dd>
     * <dt>auth/email-already-in-use</dt>
     * <dd>Thrown if the email corresponding to the credential already exists
     *     among your users. When thrown while linking a credential to an existing
     *     user, an <code>error.email</code> and <code>error.credential</code>
     *     ({@link firebase.auth.AuthCredential}) fields are also provided.
     *     You have to link the credential to the existing user with that email if
     *     you wish to continue signing in with that credential. To do so, call
     *     {@link firebase.auth.Auth.fetchProvidersForEmail}, sign in to
     *     <code>error.email</code> via one of the providers returned and then
     *     {@link firebase.User.linkWithCredential} the original credential to that
     *     newly signed in user.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if you have not enabled the provider in the Firebase Console. Go
     *     to the Firebase Console for your project, in the Auth section and the
     *     <strong>Sign in Method</strong> tab and configure the provider.</dd>
     * <dt>auth/popup-blocked</dt>
     * <dt>auth/operation-not-supported-in-this-environment</dt>
     * <dd>Thrown if this operation is not supported in the environment your
     *     application is running on. "location.protocol" must be http or https.
     *     </dd>
     * <dd>Thrown if the popup was blocked by the browser, typically when this
     *     operation is triggered outside of a click handler.</dd>
     * <dt>auth/popup-closed-by-user</dt>
     * <dd>Thrown if the popup window is closed by the user without completing the
     *     sign in to the provider.</dd>
     * <dt>auth/provider-already-linked</dt>
     * <dd>Thrown if the provider has already been linked to the user. This error is
     *     thrown even if this is not the same provider's account that is currently
     *     linked to the user.</dd>
     * <dt>auth/unauthorized-domain</dt>
     * <dd>Thrown if the app domain is not authorized for OAuth operations for your
     *     Firebase project. Edit the list of authorized domains from the Firebase
     *     console.</dd>
     * </dl>
     *
     * @example
     * ```
     * // Creates the provider object.
     * var provider = new firebase.auth.FacebookAuthProvider();
     * // You can add additional scopes to the provider:
     * provider.addScope('email');
     * provider.addScope('user_friends');
     * // Link with popup:
     * user.linkWithPopup(provider).then(function(result) {
     *   // The firebase.User instance:
     *   var user = result.user;
     *   // The Facebook firebase.auth.AuthCredential containing the Facebook
     *   // access token:
     *   var credential = result.credential;
     * }, function(error) {
     *   // An error happened.
     * });
     * ```
     *
     * @param {!firebase.auth.AuthProvider} provider The provider to authenticate.
     *     The provider has to be an OAuth provider. Non-OAuth providers like {@link
     *     firebase.auth.EmailAuthProvider} will throw an error.
     * @return {!firebase.Promise<!firebase.auth.UserCredential>}
     */
    linkWithPopup(
      provider: firebase.auth.AuthProvider
    ): Promise<firebase.auth.UserCredential>;
    /**
     * Links the authenticated provider to the user account using a full-page
     * redirect flow.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/auth-domain-config-required</dt>
     * <dd>Thrown if authDomain configuration is not provided when calling
     *     firebase.initializeApp(). Check Firebase Console for instructions on
     *     determining and passing that field.</dd>
     * <dt>auth/operation-not-supported-in-this-environment</dt>
     * <dd>Thrown if this operation is not supported in the environment your
     *     application is running on. "location.protocol" must be http or https.
     *     </dd>
     * <dt>auth/provider-already-linked</dt>
     * <dd>Thrown if the provider has already been linked to the user. This error is
     *     thrown even if this is not the same provider's account that is currently
     *     linked to the user.</dd>
     * <dt>auth/unauthorized-domain</dt>
     * <dd>Thrown if the app domain is not authorized for OAuth operations for your
     *     Firebase project. Edit the list of authorized domains from the Firebase
     *     console.</dd>
     * </dl>
     *
     * @param {!firebase.auth.AuthProvider} provider The provider to authenticate.
     *     The provider has to be an OAuth provider. Non-OAuth providers like {@link
     *     firebase.auth.EmailAuthProvider} will throw an error.
     * @return {!firebase.Promise<void>}
     */
    linkWithRedirect(provider: firebase.auth.AuthProvider): Promise<void>;
    metadata: firebase.auth.UserMetadata;
    /**
     * The phone number normalized based on the E.164 standard (e.g. +16505550101)
     * for the current user. This is null if the user has no phone credential linked
     * to the account.
     */
    phoneNumber: string | null;
    providerData: (firebase.UserInfo | null)[];
    /**
     * Re-authenticates a user using a fresh credential, and returns any available
     * additional user information, such as user name. Use before operations
     * such as {@link firebase.User.updatePassword} that require tokens from recent
     * sign-in attempts.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/user-mismatch</dt>
     * <dd>Thrown if the credential given does not correspond to the user.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if the credential given does not correspond to any existing user.
     *     </dd>
     * <dt>auth/invalid-credential</dt>
     * <dd>Thrown if the provider's credential is not valid. This can happen if it
     *     has already expired when calling link, or if it used invalid token(s).
     *     See the Firebase documentation for your provider, and make sure you pass
     *     in the correct parameters to the credential method.</dd>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email used in a
     *     {@link firebase.auth.EmailAuthProvider.credential} is invalid.</dd>
     * <dt>auth/wrong-password</dt>
     * <dd>Thrown if the password used in a
     *     {@link firebase.auth.EmailAuthProvider.credential} is not correct or when
     *     the user associated with the email does not have a password.</dd>
     * <dt>auth/invalid-verification-code</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential} and the verification
     *     code of the credential is not valid.</dd>
     * <dt>auth/invalid-verification-id</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential}  and the verification
     *     ID of the credential is not valid.</dd>
     * </dl>
     *
     * @param {!firebase.auth.AuthCredential} credential
     * @return {!firebase.Promise<!firebase.auth.UserCredential>}
     */
    reauthenticateAndRetrieveDataWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<firebase.auth.UserCredential>;
    /**
     * Re-authenticates a user using a fresh credential. Use before operations
     * such as {@link firebase.User.updatePassword} that require tokens from recent
     * sign-in attempts.
     *
     * This method is deprecated. Use
     * {@link firebase.User.reauthenticateAndRetrieveDataWithCredential} instead.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/user-mismatch</dt>
     * <dd>Thrown if the credential given does not correspond to the user.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if the credential given does not correspond to any existing user.
     *     </dd>
     * <dt>auth/invalid-credential</dt>
     * <dd>Thrown if the provider's credential is not valid. This can happen if it
     *     has already expired when calling link, or if it used invalid token(s).
     *     See the Firebase documentation for your provider, and make sure you pass
     *     in the correct parameters to the credential method.</dd>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email used in a
     *     {@link firebase.auth.EmailAuthProvider.credential} is invalid.</dd>
     * <dt>auth/wrong-password</dt>
     * <dd>Thrown if the password used in a
     *     {@link firebase.auth.EmailAuthProvider.credential} is not correct or when
     *     the user associated with the email does not have a password.</dd>
     * <dt>auth/invalid-verification-code</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential} and the verification
     *     code of the credential is not valid.</dd>
     * <dt>auth/invalid-verification-id</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential}  and the verification
     *     ID of the credential is not valid.</dd>
     * </dl>
     *
     * @param {!firebase.auth.AuthCredential} credential
     * @return {!firebase.Promise<void>}
     */
    reauthenticateWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<void>;
    /**
     * Re-authenticates a user using a fresh credential. Use before operations
     * such as {@link firebase.User.updatePassword} that require tokens from recent
     * sign-in attempts.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/user-mismatch</dt>
     * <dd>Thrown if the credential given does not correspond to the user.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if the credential given does not correspond to any existing user.
     *     </dd>
     * <dt>auth/captcha-check-failed</dt>
     * <dd>Thrown if the reCAPTCHA response token was invalid, expired, or if
     *     this method was called from a non-whitelisted domain.</dd>
     * <dt>auth/invalid-phone-number</dt>
     * <dd>Thrown if the phone number has an invalid format.</dd>
     * <dt>auth/missing-phone-number</dt>
     * <dd>Thrown if the phone number is missing.</dd>
     * <dt>auth/quota-exceeded</dt>
     * <dd>Thrown if the SMS quota for the Firebase project has been exceeded.</dd>
     * </dl>
     *
     * @param {string} phoneNumber The user's phone number in E.164 format (e.g.
     *     +16505550101).
     * @param {!firebase.auth.ApplicationVerifier} applicationVerifier
     * @return {!firebase.Promise<!firebase.auth.ConfirmationResult>}
     */
    reauthenticateWithPhoneNumber(
      phoneNumber: string,
      applicationVerifier: firebase.auth.ApplicationVerifier
    ): Promise<firebase.auth.ConfirmationResult>;
    /**
     * Reauthenticates the current user with the specified provider using a pop-up
     * based OAuth flow.
     *
     * If the reauthentication is successful, the returned result will contain the
     * user and the provider's credential.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/auth-domain-config-required</dt>
     * <dd>Thrown if authDomain configuration is not provided when calling
     *     firebase.initializeApp(). Check Firebase Console for instructions on
     *     determining and passing that field.</dd>
     * <dt>auth/cancelled-popup-request</dt>
     * <dd>Thrown if successive popup operations are triggered. Only one popup
     *     request is allowed at one time on a user or an auth instance. All the
     *     popups would fail with this error except for the last one.</dd>
     * <dt>auth/user-mismatch</dt>
     * <dd>Thrown if the credential given does not correspond to the user.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if you have not enabled the provider in the Firebase Console. Go
     *     to the Firebase Console for your project, in the Auth section and the
     *     <strong>Sign in Method</strong> tab and configure the provider.</dd>
     * <dt>auth/popup-blocked</dt>
     * <dd>Thrown if the popup was blocked by the browser, typically when this
     *     operation is triggered outside of a click handler.</dd>
     * <dt>auth/operation-not-supported-in-this-environment</dt>
     * <dd>Thrown if this operation is not supported in the environment your
     *     application is running on. "location.protocol" must be http or https.
     *     </dd>
     * <dt>auth/popup-closed-by-user</dt>
     * <dd>Thrown if the popup window is closed by the user without completing the
     *     sign in to the provider.</dd>
     * <dt>auth/unauthorized-domain</dt>
     * <dd>Thrown if the app domain is not authorized for OAuth operations for your
     *     Firebase project. Edit the list of authorized domains from the Firebase
     *     console.</dd>
     * </dl>
     *
     * @example
     * ```
     * // Creates the provider object.
     * var provider = new firebase.auth.FacebookAuthProvider();
     * // You can add additional scopes to the provider:
     * provider.addScope('email');
     * provider.addScope('user_friends');
     * // Reauthenticate with popup:
     * user.reauthenticateWithPopup(provider).then(function(result) {
     *   // The firebase.User instance:
     *   var user = result.user;
     *   // The Facebook firebase.auth.AuthCredential containing the Facebook
     *   // access token:
     *   var credential = result.credential;
     * }, function(error) {
     *   // An error happened.
     * });
     * ```
     *
     * @param {!firebase.auth.AuthProvider} provider The provider to authenticate.
     *     The provider has to be an OAuth provider. Non-OAuth providers like {@link
     *     firebase.auth.EmailAuthProvider} will throw an error.
     * @return {!firebase.Promise<!firebase.auth.UserCredential>}
     */
    reauthenticateWithPopup(
      provider: firebase.auth.AuthProvider
    ): Promise<firebase.auth.UserCredential>;
    /**
     * Reauthenticates the current user with the specified OAuth provider using a
     * full-page redirect flow.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/auth-domain-config-required</dt>
     * <dd>Thrown if authDomain configuration is not provided when calling
     *     firebase.initializeApp(). Check Firebase Console for instructions on
     *     determining and passing that field.</dd>
     * <dt>auth/operation-not-supported-in-this-environment</dt>
     * <dd>Thrown if this operation is not supported in the environment your
     *     application is running on. "location.protocol" must be http or https.
     *     </dd>
     * <dt>auth/user-mismatch</dt>
     * <dd>Thrown if the credential given does not correspond to the user.</dd>
     * <dt>auth/unauthorized-domain</dt>
     * <dd>Thrown if the app domain is not authorized for OAuth operations for your
     *     Firebase project. Edit the list of authorized domains from the Firebase
     *     console.</dd>
     * </dl>
     *
     * @param {!firebase.auth.AuthProvider} provider The provider to authenticate.
     *     The provider has to be an OAuth provider. Non-OAuth providers like {@link
     *     firebase.auth.EmailAuthProvider} will throw an error.
     * @return {!firebase.Promise<void>}
     */
    reauthenticateWithRedirect(
      provider: firebase.auth.AuthProvider
    ): Promise<void>;
    refreshToken: string;
    /**
     * Refreshes the current user, if signed in.
     *
     * @return {!firebase.Promise<void>}
     */
    reload(): Promise<void>;
    /**
     * Sends a verification email to a user.
     *
     * The verification process is completed by calling
     * {@link firebase.auth.Auth.applyActionCode}
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/missing-android-pkg-name</dt>
     * <dd>An Android package name must be provided if the Android app is required
     *     to be installed.</dd>
     * <dt>auth/missing-continue-uri</dt>
     * <dd>A continue URL must be provided in the request.</dd>
     * <dt>auth/missing-ios-bundle-id</dt>
     * <dd>An iOS bundle ID must be provided if an App Store ID is provided.</dd>
     * <dt>auth/invalid-continue-uri</dt>
     * <dd>The continue URL provided in the request is invalid.</dd>
     * <dt>auth/unauthorized-continue-uri</dt>
     * <dd>The domain of the continue URL is not whitelisted. Whitelist
     *     the domain in the Firebase console.</dd>
     * </dl>
     *
     * @example
     * ```
     * var actionCodeSettings = {
     *   url: 'https://www.example.com/cart?email=user@example.com&cartId=123',
     *   iOS: {
     *     bundleId: 'com.example.ios'
     *   },
     *   android: {
     *     packageName: 'com.example.android',
     *     installApp: true,
     *     minimumVersion: '12'
     *   },
     *   handleCodeInApp: true
     * };
     * firebase.auth().currentUser.sendEmailVerification(actionCodeSettings)
     *     .then(function() {
     *       // Verification email sent.
     *     })
     *     .catch(function(error) {
     *       // Error occurred. Inspect error.code.
     *     });
     * ```
     *
     * @param {?firebase.auth.ActionCodeSettings=} actionCodeSettings The action
     *     code settings. If specified, the state/continue URL will be set as the
     *     "continueUrl" parameter in the email verification link. The default email
     *     verification landing page will use this to display a link to go back to
     *     the app if it is installed.
     *     If the actionCodeSettings is not specified, no URL is appended to the
     *     action URL.
     *     The state URL provided must belong to a domain that is whitelisted by the
     *     developer in the console. Otherwise an error will be thrown.
     *     Mobile app redirects will only be applicable if the developer configures
     *     and accepts the Firebase Dynamic Links terms of condition.
     *     The Android package name and iOS bundle ID will be respected only if they
     *     are configured in the same Firebase Auth project used.
     * @return {!firebase.Promise<void>}
     */
    sendEmailVerification(
      actionCodeSettings?: firebase.auth.ActionCodeSettings | null
    ): Promise<void>;
    /**
     * Returns a JSON-serializable representation of this object.
     *
     * @return {!Object} A JSON-serializable representation of this object.
     */
    toJSON(): Object;
    /**
     * Unlinks a provider from a user account.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/no-such-provider</dt>
     * <dd>Thrown if the user does not have this provider linked or when the
     *     provider ID given does not exist.</dd>
     * </dt>
     *
     * @param {string} providerId
     * @return {!firebase.Promise<!firebase.User>}
     */
    unlink(providerId: string): Promise<firebase.User>;
    /**
     * Updates the user's email address.
     *
     * An email will be sent to the original email address (if it was set) that
     * allows to revoke the email address change, in order to protect them from
     * account hijacking.
     *
     * <b>Important:</b> this is a security sensitive operation that requires the
     * user to have recently signed in. If this requirement isn't met, ask the user
     * to authenticate again and then call
     * {@link firebase.User.reauthenticateWithCredential}.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email used is invalid.</dd>
     * <dt>auth/email-already-in-use</dt>
     * <dd>Thrown if the email is already used by another user.</dd>
     * <dt>auth/requires-recent-login</dt>
     * <dd>Thrown if the user's last sign-in time does not meet the security
     *     threshold. Use {@link firebase.User.reauthenticateWithCredential} to
     *     resolve. This does not apply if the user is anonymous.</dd>
     * </dl>
     *
     * @param {string} newEmail The new email address.
     * @return {!firebase.Promise<void>}
     */
    updateEmail(newEmail: string): Promise<void>;
    /**
     * Updates the user's password.
     *
     * <b>Important:</b> this is a security sensitive operation that requires the
     * user to have recently signed in. If this requirement isn't met, ask the user
     * to authenticate again and then call
     * {@link firebase.User.reauthenticateWithCredential}.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/weak-password</dt>
     * <dd>Thrown if the password is not strong enough.</dd>
     * <dt>auth/requires-recent-login</dt>
     * <dd>Thrown if the user's last sign-in time does not meet the security
     *     threshold. Use {@link firebase.User.reauthenticateWithCredential} to
     *     resolve. This does not apply if the user is anonymous.</dd>
     * </dl>
     *
     * @param {string} newPassword
     * @return {!firebase.Promise<void>}
     */
    updatePassword(newPassword: string): Promise<void>;
    /**
     * Updates the user's phone number.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/invalid-verification-code</dt>
     * <dd>Thrown if the verification code of the credential is not valid.</dd>
     * <dt>auth/invalid-verification-id</dt>
     * <dd>Thrown if the verification ID of the credential is not valid.</dd>
     * </dl>
     *
     * @param {!firebase.auth.AuthCredential} phoneCredential
     * @return {!firebase.Promise<void>}
     */
    updatePhoneNumber(
      phoneCredential: firebase.auth.AuthCredential
    ): Promise<void>;
    /**
     * Updates a user's profile data.
     *
     * @example
     * ```
     * // Updates the user attributes:
     * user.updateProfile({
     *   displayName: "Jane Q. User",
     *   photoURL: "https://example.com/jane-q-user/profile.jpg"
     * }).then(function() {
     *   // Profile updated successfully!
     *   // "Jane Q. User"
     *   var displayName = user.displayName;
     *   // "https://example.com/jane-q-user/profile.jpg"
     *   var photoURL = user.photoURL;
     * }, function(error) {
     *   // An error happened.
     * });
     *
     * // Passing a null value will delete the current attribute's value, but not
     * // passing a property won't change the current attribute's value:
     * // Let's say we're using the same user than before, after the update.
     * user.updateProfile({photoURL: null}).then(function() {
     *   // Profile updated successfully!
     *   // "Jane Q. User", hasn't changed.
     *   var displayName = user.displayName;
     *   // Now, this is null.
     *   var photoURL = user.photoURL;
     * }, function(error) {
     *   // An error happened.
     * });
     * ```
     *
     * @param {!{displayName: ?string, photoURL: ?string}} profile The profile's
     *     displayName and photoURL to update.
     * @return {!firebase.Promise<void>}
     */
    updateProfile(profile: {
      displayName?: string | null;
      photoURL?: string | null;
    }): Promise<void>;
  }

  /**
   * User profile information, visible only to the Firebase project's
   * apps.
   *
   */
  interface UserInfo {
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
    providerId: string;
    /**
     * The user's unique ID.
     */
    uid: string;
  }

  /**
   * Retrieves a Firebase {@link firebase.app.App app} instance.
   *
   * When called with no arguments, the default app is returned. When an app name
   * is provided, the app corresponding to that name is returned.
   *
   * An exception is thrown if the app being retrieved has not yet been
   * initialized.
   *
   * @example
   * ```
   * // Return the default app
   * var app = firebase.app();
   * ```
   *
   * @example
   * ```
   * // Return a named app
   * var otherApp = firebase.app("otherApp");
   * ```
   *
   * @param {string=} name Optional name of the app to return. If no name is
   *   provided, the default is `"[DEFAULT]"`.
   *
   * @return {!firebase.app.App} The app corresponding to the provided app name.
   *   If no app name is provided, the default app is returned.
   */
  function app(name?: string): firebase.app.App;

  /**
   * A (read-only) array of all initialized apps.
   */
  var apps: firebase.app.App[];

  /**
   * Gets the {@link firebase.auth.Auth `Auth`} service for the default app or a
   * given app.
   *
   * `firebase.auth()` can be called with no arguments to access the default app's
   * {@link firebase.auth.Auth `Auth`} service or as `firebase.auth(app)` to
   * access the {@link firebase.auth.Auth `Auth`} service associated with a
   * specific app.
   *
   * @example
   * ```
   *
   * // Get the Auth service for the default app
   * var defaultAuth = firebase.auth();
   * ```
   * @example
   * ```
   *
   * // Get the Auth service for a given app
   * var otherAuth = firebase.auth(otherApp);
   * ```
   * @param {!firebase.app.App=} app
   *
   * @return {!firebase.auth.Auth}
   */
  function auth(app?: firebase.app.App): firebase.auth.Auth;

  /**
   * Gets the {@link firebase.database.Database `Database`} service for the
   * default app or a given app.
   *
   * `firebase.database()` can be called with no arguments to access the default
   * app's {@link firebase.database.Database `Database`} service or as
   * `firebase.database(app)` to access the
   * {@link firebase.database.Database `Database`} service associated with a
   * specific app.
   *
   * `firebase.database` is also a namespace that can be used to access global
   * constants and methods associated with the `Database` service.
   *
   * @example
   * ```
   * // Get the Database service for the default app
   * var defaultDatabase = firebase.database();
   * ```
   *
   * @example
   * ```
   * // Get the Database service for a specific app
   * var otherDatabase = firebase.database(app);
   * ```
   *
   * @namespace
   * @param {!firebase.app.App=} app Optional app whose Database service to
   *   return. If not provided, the default Database service will be returned.
   * @return {!firebase.database.Database} The default Database service if no app
   *   is provided or the Database service associated with the provided app.
   */
  function database(app?: firebase.app.App): firebase.database.Database;

  /**
   * Creates and initializes a Firebase {@link firebase.app.App app} instance.
   *
   * See
   * {@link
   *   https://firebase.google.com/docs/web/setup#add_firebase_to_your_app
   *   Add Firebase to your app} and
   * {@link
   *   https://firebase.google.com/docs/web/setup#initialize_multiple_apps
   *   Initialize multiple apps} for detailed documentation.
   *
   * @example
   * ```
   *
   * // Initialize default app
   * // Retrieve your own options values by adding a web app on
   * // https://console.firebase.google.com
   * firebase.initializeApp({
   *   apiKey: "AIza....",                             // Auth / General Use
   *   authDomain: "YOUR_APP.firebaseapp.com",         // Auth with popup/redirect
   *   databaseURL: "https://YOUR_APP.firebaseio.com", // Realtime Database
   *   storageBucket: "YOUR_APP.appspot.com",          // Storage
   *   messagingSenderId: "123456789"                  // Cloud Messaging
   * });
   * ```
   *
   * @example
   * ```
   *
   * // Initialize another app
   * var otherApp = firebase.initializeApp({
   *   databaseURL: "https://<OTHER_DATABASE_NAME>.firebaseio.com",
   *   storageBucket: "<OTHER_STORAGE_BUCKET>.appspot.com"
   * }, "otherApp");
   * ```
   *
   * @param {!Object} options Options to configure the app's services.
   * @param {string=} name Optional name of the app to initialize. If no name
   *   is provided, the default is `"[DEFAULT]"`.
   *
   * @return {!firebase.app.App} The initialized app.
   */
  function initializeApp(options: Object, name?: string): firebase.app.App;

  /**
   * Gets the {@link firebase.messaging.Messaging `Messaging`} service for the
   * default app or a given app.
   *
   * `firebase.messaging()` can be called with no arguments to access the default
   * app's {@link firebase.messaging.Messaging `Messaging`} service or as
   * `firebase.messaging(app)` to access the
   * {@link firebase.messaging.Messaging `Messaging`} service associated with a
   * specific app.
   *
   * Calling `firebase.messaging()` in a service worker results in Firebase
   * generating notifications if the push message payload has a `notification`
   * parameter.
   *
   * @example
   * ```
   * // Get the Messaging service for the default app
   * var defaultMessaging = firebase.messaging();
   * ```
   *
   * @example
   * ```
   * // Get the Messaging service for a given app
   * var otherMessaging = firebase.messaging(otherApp);
   * ```
   *
   * @namespace
   * @param {!firebase.app.App=} app The app to create a Messaging service for.
   *     If not passed, uses the default app.
   *
   * @return {!firebase.messaging.Messaging}
   */
  function messaging(app?: firebase.app.App): firebase.messaging.Messaging;

  /**
   * Gets the {@link firebase.storage.Storage `Storage`} service for the default
   * app or a given app.
   *
   * `firebase.storage()` can be called with no arguments to access the default
   * app's {@link firebase.storage.Storage `Storage`} service or as
   * `firebase.storage(app)` to access the
   * {@link firebase.storage.Storage `Storage`} service associated with a
   * specific app.
   *
   * @example
   * ```
   * // Get the Storage service for the default app
   * var defaultStorage = firebase.storage();
   * ```
   *
   * @example
   * ```
   * // Get the Storage service for a given app
   * var otherStorage = firebase.storage(otherApp);
   * ```
   *
   * @param {!firebase.app.App=} app The app to create a storage service for.
   *     If not passed, uses the default app.
   *
   * @return {!firebase.storage.Storage}
   */
  function storage(app?: firebase.app.App): firebase.storage.Storage;

  function firestore(app?: firebase.app.App): firebase.firestore.Firestore;

  function functions(app?: firebase.app.App): firebase.functions.Functions;
}

declare namespace firebase.app {
  /**
   * A Firebase App holds the initialization information for a collection of
   * services.
   *
   * Do not call this constructor directly. Instead, use
   * {@link firebase.initializeApp|`firebase.initializeApp()`} to create an app.
   *
   */
  interface App {
    /**
     * Gets the {@link firebase.auth.Auth `Auth`} service for the current app.
     *
     * @example
     * ```
     * var auth = app.auth();
     * // The above is shorthand for:
     * // var auth = firebase.auth(app);
     * ```
     *
     * @return {!firebase.auth.Auth}
     */
    auth(): firebase.auth.Auth;
    /**
     * Gets the {@link firebase.database.Database `Database`} service for the
     * current app.
     *
     * @example
     * ```
     * var database = app.database();
     * // The above is shorthand for:
     * // var database = firebase.database(app);
     * ```
     *
     * @return {!firebase.database.Database}
     */
    database(url?: string): firebase.database.Database;
    /**
     * Renders this app unusable and frees the resources of all associated
     * services.
     *
     * @example
     * ```
     * app.delete()
     *   .then(function() {
     *     console.log("App deleted successfully");
     *   })
     *   .catch(function(error) {
     *     console.log("Error deleting app:", error);
     *   });
     * ```
     *
     * @return {!firebase.Promise<void>} An empty promise fulfilled when the app has
     *   been deleted.
     */
    delete(): Promise<any>;
    /**
     * Gets the {@link firebase.messaging.Messaging `Messaging`} service for the
     * current app.
     *
     * @example
     * ```
     * var messaging = app.messaging();
     * // The above is shorthand for:
     * // var messaging = firebase.messaging(app);
     * ```
     *
     * @return {!firebase.messaging.Messaging}
     */
    messaging(): firebase.messaging.Messaging;
    /**
     * The (read-only) name for this app.
     *
     * The default app's name is `"[DEFAULT]"`.
     *
     * @example
     * ```
     * // The default app's name is "[DEFAULT]"
     * firebase.initializeApp(defaultAppConfig);
     * console.log(firebase.app().name);  // "[DEFAULT]"
     * ```
     *
     * @example
     * ```
     * // A named app's name is what you provide to initializeApp()
     * var otherApp = firebase.initializeApp(otherAppConfig, "other");
     * console.log(otherApp.name);  // "other"
     * ```
     */
    name: string;
    /**
     * The (read-only) configuration options for this app. These are the original
     * parameters given in
     * {@link firebase.initializeApp `firebase.initializeApp()`}.
     *
     * @example
     * ```
     * var app = firebase.initializeApp(config);
     * console.log(app.options.databaseURL === config.databaseURL);  // true
     * ```
     */
    options: Object;
    /**
     * Gets the {@link firebase.storage.Storage `Storage`} service for the current
     * app, optionally initialized with a custom storage bucket.
     *
     * @example
     * ```
     * var storage = app.storage();
     * // The above is shorthand for:
     * // var storage = firebase.storage(app);
     * ```
     *
     * @example
     * ```
     * var storage = app.storage("gs://your-app.appspot.com");
     * ```
     *
     * @param {string=} url The gs:// url to your Firebase Storage Bucket.
     *     If not passed, uses the app's default Storage Bucket.
     * @return {!firebase.storage.Storage}
     */
    storage(url?: string): firebase.storage.Storage;
    firestore(): firebase.firestore.Firestore;
    functions(region?: string): firebase.functions.Functions;
  }
}

declare namespace firebase.functions {
  /**
   * An HttpsCallableResult wraps a single result from a function call.
   */
  export interface HttpsCallableResult {
    readonly data: any;
  }
  /**
   * An HttpsCallable is a reference to a "callable" http trigger in
   * Google Cloud Functions.
   */
  export interface HttpsCallable {
    (data?: any): Promise<HttpsCallableResult>;
  }
  export interface HttpsCallableOptions {
    timeout?: number;
  }
  /**
   * The Cloud Functions for Firebase service interface.
   *
   * Do not call this constructor directly. Instead, use
   * {@link firebase.functions `firebase.functions()`}.
   */
  export class Functions {
    private constructor();
    /**
     * Changes this instance to point to a Cloud Functions emulator running
     * locally. See https://firebase.google.com/docs/functions/local-emulator
     *
     * @param origin The origin of the local emulator, such as
     * "http://localhost:5005".
     */
    useFunctionsEmulator(url: string): void;
    /**
     * Gets an `HttpsCallable` instance that refers to the function with the given
     * name.
     *
     * @param name The name of the https callable function.
     * @param options The options for this HttpsCallable instance.
     * @return The `HttpsCallable` instance.
     */
    httpsCallable(name: string, options?: HttpsCallableOptions): HttpsCallable;
  }
  /**
   * The set of Firebase Functions status codes. The codes are the same at the
   * ones exposed by gRPC here:
   * https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
   *
   * Possible values:
   * - 'cancelled': The operation was cancelled (typically by the caller).
   * - 'unknown': Unknown error or an error from a different error domain.
   * - 'invalid-argument': Client specified an invalid argument. Note that this
   *   differs from 'failed-precondition'. 'invalid-argument' indicates
   *   arguments that are problematic regardless of the state of the system
   *   (e.g. an invalid field name).
   * - 'deadline-exceeded': Deadline expired before operation could complete.
   *   For operations that change the state of the system, this error may be
   *   returned even if the operation has completed successfully. For example,
   *   a successful response from a server could have been delayed long enough
   *   for the deadline to expire.
   * - 'not-found': Some requested document was not found.
   * - 'already-exists': Some document that we attempted to create already
   *   exists.
   * - 'permission-denied': The caller does not have permission to execute the
   *   specified operation.
   * - 'resource-exhausted': Some resource has been exhausted, perhaps a
   *   per-user quota, or perhaps the entire file system is out of space.
   * - 'failed-precondition': Operation was rejected because the system is not
   *   in a state required for the operation's execution.
   * - 'aborted': The operation was aborted, typically due to a concurrency
   *   issue like transaction aborts, etc.
   * - 'out-of-range': Operation was attempted past the valid range.
   * - 'unimplemented': Operation is not implemented or not supported/enabled.
   * - 'internal': Internal errors. Means some invariants expected by
   *   underlying system has been broken. If you see one of these errors,
   *   something is very broken.
   * - 'unavailable': The service is currently unavailable. This is most likely
   *   a transient condition and may be corrected by retrying with a backoff.
   * - 'data-loss': Unrecoverable data loss or corruption.
   * - 'unauthenticated': The request does not have valid authentication
   *   credentials for the operation.
   */
  export type FunctionsErrorCode =
    | 'ok'
    | 'cancelled'
    | 'unknown'
    | 'invalid-argument'
    | 'deadline-exceeded'
    | 'not-found'
    | 'already-exists'
    | 'permission-denied'
    | 'resource-exhausted'
    | 'failed-precondition'
    | 'aborted'
    | 'out-of-range'
    | 'unimplemented'
    | 'internal'
    | 'unavailable'
    | 'data-loss'
    | 'unauthenticated';
  export interface HttpsError extends Error {
    /**
     * A standard error code that will be returned to the client. This also
     * determines the HTTP status code of the response, as defined in code.proto.
     */
    readonly code: FunctionsErrorCode;
    /**
     * Extra data to be converted to JSON and included in the error response.
     */
    readonly details?: any;
  }
}

declare namespace firebase.auth {
  /**
   * A response from {@link firebase.auth.Auth.checkActionCode}.
   */
  interface ActionCodeInfo {
    /**
     * The data associated with the action code.
     *
     * For the PASSWORD_RESET, VERIFY_EMAIL, and RECOVER_EMAIL actions, this object
     * contains an `email` field with the address the email was sent to.
     *
     * For the RECOVER_EMAIL action, which allows a user to undo an email address
     * change, this object also contains a `fromEmail` field with the user account's
     * new email address. After the action completes, the user's email address will
     * revert to the value in the `email` field from the value in `fromEmail` field.
     */
    data: {
      email?: string | null;
      fromEmail?: string | null;
    };
    /**
     * The type of operation that generated the action code. This could be:
     * <ul>
     * <li>`PASSWORD_RESET`: password reset code generated via
     *     {@link firebase.auth.Auth.sendPasswordResetEmail}.</li>
     * <li>`VERIFY_EMAIL`: email verification code generated via
     *     {@link firebase.User.sendEmailVerification}.</li>
     * <li>`RECOVER_EMAIL`: email change revocation code generated via
     *     {@link firebase.User.updateEmail}.</li>
     * <li>`EMAIL_SIGNIN`: email sign in code generated via
     *     {@link firebase.auth.Auth.sendSignInLinkToEmail}.</li>
     * </ul>
     */
    operation: string;
  }

  /**
   * This is the interface that defines the required continue/state URL with
   * optional Android and iOS bundle identifiers.
   * The action code setting fields are:
   * <ul>
   * <li><p>url: Sets the link continue/state URL, which has different meanings
   *     in different contexts:</p>
   *     <ul>
   *     <li>When the link is handled in the web action widgets, this is the deep
   *         link in the continueUrl query parameter.</li>
   *     <li>When the link is handled in the app directly, this is the continueUrl
   *         query parameter in the deep link of the Dynamic Link.</li>
   *     </ul>
   *     </li>
   * <li>iOS: Sets the iOS bundle ID. This will try to open the link in an iOS app
   *     if it is installed.</li>
   * <li>android: Sets the Android package name. This will try to open the link in
   *     an android app if it is installed. If installApp is passed, it specifies
   *     whether to install the Android app if the device supports it and the app
   *     is not already installed. If this field is provided without a
   *     packageName, an error is thrown explaining that the packageName must be
   *     provided in conjunction with this field.
   *     If minimumVersion is specified, and an older version of the app is
   *     installed, the user is taken to the Play Store to upgrade the app.</li>
   * <li>handleCodeInApp: The default is false. When set to true, the action code
   *     link will be be sent as a Universal Link or Android App Link and will be
   *     opened by the app if installed. In the false case, the code will be sent
   *     to the web widget first and then on continue will redirect to the app if
   *     installed.</li>
   * </ul>
   */
  type ActionCodeSettings = {
    android?: {
      installApp?: boolean;
      minimumVersion?: string;
      packageName: string;
    };
    handleCodeInApp?: boolean;
    iOS?: { bundleId: string };
    url: string;
    dynamicLinkDomain?: string;
  };

  /**
   * A structure containing additional user information from a federated identity
   * provider.
   */
  type AdditionalUserInfo = {
    isNewUser: boolean;
    profile: Object | null;
    providerId: string;
    username?: string | null;
  };

  /**
   * A verifier for domain verification and abuse prevention. Currently, the
   * only implementation is {@link firebase.auth.RecaptchaVerifier}.
   */
  interface ApplicationVerifier {
    /**
     * Identifies the type of application verifier (e.g. "recaptcha").
     */
    type: string;
    /**
     * Executes the verification process.
     * @return {!firebase.Promise<string>} A Promise for a token that can be used to
     *     assert the validity of a request.
     */
    verify(): Promise<string>;
  }

  /**
   * Interface representing an Auth instance's settings, currently used for
   * enabling/disabling app verification for phone Auth testing.
   */
  interface AuthSettings {
    /**
     * When set, this property disables app verification for the purpose of testing
     * phone authentication. For this property to take effect, it needs to be set
     * before rendering a reCAPTCHA app verifier. When this is disabled, a
     * mock reCAPTCHA is rendered instead. This is useful for manual testing during
     * development or for automated integration tests.
     *
     * In order to use this feature, you will need to
     * {@link https://firebase.google.com/docs/auth/web/phone-auth#test-with-whitelisted-phone-numbers
     * whitelist your phone number} via the
     * Firebase Console.
     *
     * The default value is false (app verification is enabled).
     */
    appVerificationDisabledForTesting: boolean;
  }

  /**
   * The Firebase Auth service interface.
   *
   * Do not call this constructor directly. Instead, use
   * {@link firebase.auth `firebase.auth()`}.
   *
   * See
   * {@link https://firebase.google.com/docs/auth/ Firebase Authentication}
   * for a full guide on how to use the Firebase Auth service.
   *
   */
  interface Auth {
    /**
     * The {@link firebase.app.App app} associated with the `Auth` service
     * instance.
     *
     * @example
     * ```
     * var app = auth.app;
     * ```
     */
    app: firebase.app.App;
    /**
     * Applies a verification code sent to the user by email or other out-of-band
     * mechanism.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/expired-action-code</dt>
     * <dd>Thrown if the action code has expired.</dd>
     * <dt>auth/invalid-action-code</dt>
     * <dd>Thrown if the action code is invalid. This can happen if the code is
     *     malformed or has already been used.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given action code has been
     *     disabled.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if there is no user corresponding to the action code. This may
     *     have happened if the user was deleted between when the action code was
     *     issued and when this method was called.</dd>
     * </dl>
     *
     * @param {string} code A verification code sent to the user.
     */
    applyActionCode(code: string): Promise<void>;
    /**
     * Checks a verification code sent to the user by email or other out-of-band
     * mechanism.
     *
     * Returns metadata about the code.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/expired-action-code</dt>
     * <dd>Thrown if the action code has expired.</dd>
     * <dt>auth/invalid-action-code</dt>
     * <dd>Thrown if the action code is invalid. This can happen if the code is
     *     malformed or has already been used.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given action code has been
     *     disabled.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if there is no user corresponding to the action code. This may
     *     have happened if the user was deleted between when the action code was
     *     issued and when this method was called.</dd>
     * </dl>
     *
     * @param {string} code A verification code sent to the user.
     * @return {!firebase.Promise<!firebase.auth.ActionCodeInfo>}
     */
    checkActionCode(code: string): Promise<firebase.auth.ActionCodeInfo>;
    /**
     * Completes the password reset process, given a confirmation code and new
     * password.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/expired-action-code</dt>
     * <dd>Thrown if the password reset code has expired.</dd>
     * <dt>auth/invalid-action-code</dt>
     * <dd>Thrown if the password reset code is invalid. This can happen if the
     *     code is malformed or has already been used.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given password reset code has
     *     been disabled.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if there is no user corresponding to the password reset code. This
     *     may have happened if the user was deleted between when the code was
     *     issued and when this method was called.</dd>
     * <dt>auth/weak-password</dt>
     * <dd>Thrown if the new password is not strong enough.</dd>
     * </dl>
     *
     * @param {string} code The confirmation code send via email to the user.
     * @param {string} newPassword The new password.
     */
    confirmPasswordReset(code: string, newPassword: string): Promise<void>;
    /**
     * Creates a new user account associated with the specified email address and
     * password and returns any additional user info data or credentials.
     *
     * This method is deprecated. Use
     * {@link firebase.auth.Auth.createUserWithEmailAndPassword} instead.
     *
     * On successful creation of the user account, this user will also be
     * signed in to your application.
     *
     * User account creation can fail if the account already exists or the password
     * is invalid.
     *
     * Note: The email address acts as a unique identifier for the user and
     * enables an email-based password reset.  This function will create
     * a new user account and set the initial user password.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/email-already-in-use</dt>
     * <dd>Thrown if there already exists an account with the given email
     *     address.</dd>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email address is not valid.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if email/password accounts are not enabled. Enable email/password
     *     accounts in the Firebase Console, under the Auth tab.</dd>
     * <dt>auth/weak-password</dt>
     * <dd>Thrown if the password is not strong enough.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().createUserAndRetrieveDataWithEmailAndPassword(email, password)
     *     .catch(function(error) {
     *       // Handle Errors here.
     *       var errorCode = error.code;
     *       var errorMessage = error.message;
     *       if (errorCode == 'auth/weak-password') {
     *         alert('The password is too weak.');
     *       } else {
     *         alert(errorMessage);
     *       }
     *       console.log(error);
     *     });
     * ```
     * @param {string} email The user's email address.
     * @param {string} password The user's chosen password.
     */
    createUserAndRetrieveDataWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<firebase.auth.UserCredential>;

    /**
     * Creates a new user account associated with the specified email address and
     * password.
     *
     * On successful creation of the user account, this user will also be
     * signed in to your application.
     *
     * User account creation can fail if the account already exists or the password
     * is invalid.
     *
     * Note: The email address acts as a unique identifier for the user and
     * enables an email-based password reset.  This function will create
     * a new user account and set the initial user password.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/email-already-in-use</dt>
     * <dd>Thrown if there already exists an account with the given email
     *     address.</dd>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email address is not valid.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if email/password accounts are not enabled. Enable email/password
     *     accounts in the Firebase Console, under the Auth tab.</dd>
     * <dt>auth/weak-password</dt>
     * <dd>Thrown if the password is not strong enough.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().createUserWithEmailAndPassword(email, password)
     *     .catch(function(error) {
     *   // Handle Errors here.
     *   var errorCode = error.code;
     *   var errorMessage = error.message;
     *   if (errorCode == 'auth/weak-password') {
     *     alert('The password is too weak.');
     *   } else {
     *     alert(errorMessage);
     *   }
     *   console.log(error);
     * });
     * ```
     * @param {string} email The user's email address.
     * @param {string} password The user's chosen password.
     */
    createUserWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<firebase.auth.UserCredential>;
    /**
     * The currently signed-in user (or null).
     */
    currentUser: firebase.User | null;

    /**
     * Gets the list of provider IDs that can be used to sign in for the given email
     * address. Useful for an "identifier-first" sign-in flow.
     *
     * This method is deprecated. Use
     * {@link firebase.auth.Auth.fetchSignInMethodsForEmail} instead.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email address is not valid.</dd>
     * </dl>
     */
    fetchProvidersForEmail(email: string): Promise<Array<string>>;

    /**
     * Gets the list of possible sign in methods for the given email address. This
     * is useful to differentiate methods of sign-in for the same provider,
     * eg. `EmailAuthProvider` which has 2 methods of sign-in, email/password and
     * email/link.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email address is not valid.</dd>
     * </dl>
     */
    fetchSignInMethodsForEmail(email: string): Promise<Array<string>>;

    /**
     * Checks if an incoming link is a sign-in with email link.
     */
    isSignInWithEmailLink(emailLink: string): boolean;
    /**
     * Returns a UserCredential from the redirect-based sign-in flow.
     *
     * If sign-in succeeded, returns the signed in user. If sign-in was
     * unsuccessful, fails with an error. If no redirect operation was called,
     * returns a UserCredential with a null User.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/account-exists-with-different-credential</dt>
     * <dd>Thrown if there already exists an account with the email address
     *     asserted by the credential. Resolve this by calling
     *     {@link firebase.auth.Auth.fetchProvidersForEmail} with the error.email
     *     and then asking the user to sign in using one of the returned providers.
     *     Once the user is signed in, the original credential retrieved from the
     *     error.credential can be linked to the user with
     *     {@link firebase.User.linkWithCredential} to prevent the user from signing
     *     in again to the original provider via popup or redirect. If you are using
     *     redirects for sign in, save the credential in session storage and then
     *     retrieve on redirect and repopulate the credential using for example
     *     {@link firebase.auth.GoogleAuthProvider.credential} depending on the
     *     credential provider id and complete the link.</dd>
     * <dt>auth/auth-domain-config-required</dt>
     * <dd>Thrown if authDomain configuration is not provided when calling
     *     firebase.initializeApp(). Check Firebase Console for instructions on
     *     determining and passing that field.</dd>
     * <dt>auth/credential-already-in-use</dt>
     * <dd>Thrown if the account corresponding to the credential already exists
     *     among your users, or is already linked to a Firebase User.
     *     For example, this error could be thrown if you are upgrading an anonymous
     *     user to a Google user by linking a Google credential to it and the Google
     *     credential used is already associated with an existing Firebase Google
     *     user.
     *     An <code>error.email</code> and <code>error.credential</code>
     *     ({@link firebase.auth.AuthCredential}) fields are also provided. You can
     *     recover from this error by signing in with that credential directly via
     *     {@link firebase.auth.Auth.signInWithCredential}.</dd>
     * <dt>auth/email-already-in-use</dt>
     * <dd>Thrown if the email corresponding to the credential already exists
     *     among your users. When thrown while linking a credential to an existing
     *     user, an <code>error.email</code> and <code>error.credential</code>
     *     ({@link firebase.auth.AuthCredential}) fields are also provided.
     *     You have to link the credential to the existing user with that email if
     *     you wish to continue signing in with that credential. To do so, call
     *     {@link firebase.auth.Auth.fetchProvidersForEmail}, sign in to
     *     <code>error.email</code> via one of the providers returned and then
     *     {@link firebase.User.linkWithCredential} the original credential to that
     *     newly signed in user.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if the type of account corresponding to the credential
     *     is not enabled. Enable the account type in the Firebase Console, under
     *     the Auth tab.</dd>
     * <dt>auth/operation-not-supported-in-this-environment</dt>
     * <dd>Thrown if this operation is not supported in the environment your
     *     application is running on. "location.protocol" must be http or https.
     *     </dd>
     * <dt>auth/timeout</dt>
     * <dd>Thrown typically if the app domain is not authorized for OAuth operations
     *     for your Firebase project. Edit the list of authorized domains from the
     *     Firebase console.</dd>
     * </dl>
     *
     * @example
     * ```
     * // First, we perform the signInWithRedirect.
     * // Creates the provider object.
     * var provider = new firebase.auth.FacebookAuthProvider();
     * // You can add additional scopes to the provider:
     * provider.addScope('email');
     * provider.addScope('user_friends');
     * // Sign in with redirect:
     * auth.signInWithRedirect(provider)
     * ////////////////////////////////////////////////////////////
     * // The user is redirected to the provider's sign in flow...
     * ////////////////////////////////////////////////////////////
     * // Then redirected back to the app, where we check the redirect result:
     * auth.getRedirectResult().then(function(result) {
     *   // The firebase.User instance:
     *   var user = result.user;
     *   // The Facebook firebase.auth.AuthCredential containing the Facebook
     *   // access token:
     *   var credential = result.credential;
     *   // As this API can be used for sign-in, linking and reauthentication,
     *   // check the operationType to determine what triggered this redirect
     *   // operation.
     *   var operationType = result.operationType;
     * }, function(error) {
     *   // The provider's account email, can be used in case of
     *   // auth/account-exists-with-different-credential to fetch the providers
     *   // linked to the email:
     *   var email = error.email;
     *   // The provider's credential:
     *   var credential = error.credential;
     *   // In case of auth/account-exists-with-different-credential error,
     *   // you can fetch the providers using this:
     *   if (error.code === 'auth/account-exists-with-different-credential') {
     *     auth.fetchProvidersForEmail(email).then(function(providers) {
     *       // The returned 'providers' is a list of the available providers
     *       // linked to the email address. Please refer to the guide for a more
     *       // complete explanation on how to recover from this error.
     *     });
     *   }
     * });
     * ```
     *
     * @return {!firebase.Promise<!firebase.auth.UserCredential>}
     */
    getRedirectResult(): Promise<firebase.auth.UserCredential>;
    /**
     * The current Auth instance's language code. This is a readable/writable
     * property. When set to null, the default Firebase Console language setting
     * is applied. The language code will propagate to email action templates
     * (password reset, email verification and email change revocation), SMS
     * templates for phone authentication, reCAPTCHA verifier and OAuth
     * popup/redirect operations provided the specified providers support
     * localization with the language code specified.
     */
    languageCode: string | null;
    /**
     * The current Auth instance's settings. This is used to edit/read configuration
     * related options like app verification mode for phone authentication.
     */
    settings: firebase.auth.AuthSettings;
    /**
     * Adds an observer for changes to the user's sign-in state.
     *
     * Prior to 4.0.0, this triggered the observer when users were signed in,
     * signed out, or when the user's ID token changed in situations such as token
     * expiry or password change. After 4.0.0, the observer is only triggered
     * on sign-in or sign-out.
     *
     * To keep the old behavior, see {@link firebase.auth.Auth.onIdTokenChanged}.
     *
     * @example
     * ```
     * firebase.auth().onAuthStateChanged(function(user) {
     *   if (user) {
     *     // User is signed in.
     *   }
     * });
     * ```
     */
    onAuthStateChanged(
      nextOrObserver:
        | firebase.Observer<any>
        | ((a: firebase.User | null) => any),
      error?: (a: firebase.auth.Error) => any,
      completed?: firebase.Unsubscribe
    ): firebase.Unsubscribe;
    /**
     * Adds an observer for changes to the signed-in user's ID token, which includes
     * sign-in, sign-out, and token refresh events. This method has the same
     * behavior as {@link firebase.auth.Auth.onAuthStateChanged} had prior to 4.0.0.
     *
     * @example
     * ```
     * firebase.auth().onIdTokenChanged(function(user) {
     *   if (user) {
     *     // User is signed in or token was refreshed.
     *   }
     * });
     * ```
     * @param {!firebase.Observer<firebase.User, firebase.auth.Error>|function(?firebase.User)}
     *     nextOrObserver An observer object or a function triggered on change.
     * @param {function(!firebase.auth.Error)=} error Optional A function
     *     triggered on auth error.
     * @param {firebase.CompleteFn=} completed Optional A function triggered when the
     *     observer is removed.
     */
    onIdTokenChanged(
      nextOrObserver:
        | firebase.Observer<any>
        | ((a: firebase.User | null) => any),
      error?: (a: firebase.auth.Error) => any,
      completed?: firebase.Unsubscribe
    ): firebase.Unsubscribe;
    /**
     * Sends a sign-in email link to the user with the specified email.
     *
     * The sign-in operation has to always be completed in the app unlike other out
     * of band email actions (password reset and email verifications). This is
     * because, at the end of the flow, the user is expected to be signed in and
     * their Auth state persisted within the app.
     *
     * To complete sign in with the email link, call
     * {@link firebase.auth.Auth.signInWithEmailLink} with the email address and
     * the email link supplied in the email sent to the user.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/argument-error</dt>
     * <dd>Thrown if handleCodeInApp is false.</dd>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email address is not valid.</dd>
     * <dt>auth/missing-android-pkg-name</dt>
     * <dd>An Android package name must be provided if the Android app is required
     *     to be installed.</dd>
     * <dt>auth/missing-continue-uri</dt>
     * <dd>A continue URL must be provided in the request.</dd>
     * <dt>auth/missing-ios-bundle-id</dt>
     * <dd>An iOS Bundle ID must be provided if an App Store ID is provided.</dd>
     * <dt>auth/invalid-continue-uri</dt>
     * <dd>The continue URL provided in the request is invalid.</dd>
     * <dt>auth/unauthorized-continue-uri</dt>
     * <dd>The domain of the continue URL is not whitelisted. Whitelist
     *     the domain in the Firebase console.</dd>
     * </dl>
     *
     * @example
     * ```
     * var actionCodeSettings = {
     *   // The URL to redirect to for sign-in completion. This is also the deep
     *   // link for mobile redirects. The domain (www.example.com) for this URL
     *   // must be whitelisted in the Firebase Console.
     *   url: 'https://www.example.com/finishSignUp?cartId=1234',
     *   iOS: {
     *     bundleId: 'com.example.ios'
     *   },
     *   android: {
     *     packageName: 'com.example.android',
     *     installApp: true,
     *     minimumVersion: '12'
     *   },
     *   // This must be true.
     *   handleCodeInApp: true
     * };
     * firebase.auth().sendSignInLinkToEmail('user@example.com', actionCodeSettings)
     *     .then(function() {
     *       // The link was successfully sent. Inform the user. Save the email
     *       // locally so you don't need to ask the user for it again if they open
     *       // the link on the same device.
     *     })
     *     .catch(function(error) {
     *       // Some error occurred, you can inspect the code: error.code
     *     });
     * ```
     * @param {string} email The email account to sign in with.
     * @param {!firebase.auth.ActionCodeSettings} actionCodeSettings The action
     *     code settings. The action code settings which provides Firebase with
     *     instructions on how to construct the email link. This includes the
     *     sign in completion URL or the deep link for mobile redirects, the mobile
     *     apps to use when the sign-in link is opened on an Android or iOS device.
     *     Mobile app redirects will only be applicable if the developer configures
     *     and accepts the Firebase Dynamic Links terms of condition.
     *     The Android package name and iOS bundle ID will be respected only if they
     *     are configured in the same Firebase Auth project used.
     */
    sendSignInLinkToEmail(
      email: string,
      actionCodeSettings: firebase.auth.ActionCodeSettings
    ): Promise<void>;

    /**
     * Sends a password reset email to the given email address.
     *
     * To complete the password reset, call
     * {@link firebase.auth.Auth.confirmPasswordReset} with the code supplied in the
     * email sent to the user, along with the new password specified by the user.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email address is not valid.</dd>
     * <dt>auth/missing-android-pkg-name</dt>
     * <dd>An Android package name must be provided if the Android app is required
     *     to be installed.</dd>
     * <dt>auth/missing-continue-uri</dt>
     * <dd>A continue URL must be provided in the request.</dd>
     * <dt>auth/missing-ios-bundle-id</dt>
     * <dd>An iOS Bundle ID must be provided if an App Store ID is provided.</dd>
     * <dt>auth/invalid-continue-uri</dt>
     * <dd>The continue URL provided in the request is invalid.</dd>
     * <dt>auth/unauthorized-continue-uri</dt>
     * <dd>The domain of the continue URL is not whitelisted. Whitelist
     *     the domain in the Firebase console.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if there is no user corresponding to the email address.</dd>
     * </dl>
     *
     * @example
     * ```
     * var actionCodeSettings = {
     *   url: 'https://www.example.com/?email=user@example.com',
     *   iOS: {
     *     bundleId: 'com.example.ios'
     *   },
     *   android: {
     *     packageName: 'com.example.android',
     *     installApp: true,
     *     minimumVersion: '12'
     *   },
     *   handleCodeInApp: true
     * };
     * firebase.auth().sendPasswordResetEmail(
     *     'user@example.com', actionCodeSettings)
     *     .then(function() {
     *       // Password reset email sent.
     *     })
     *     .catch(function(error) {
     *       // Error occurred. Inspect error.code.
     *     });
     * ```
     *
     * @param {string} email The email address with the password to be reset.
     * @param {?firebase.auth.ActionCodeSettings=} actionCodeSettings The action
     *     code settings. If specified, the state/continue URL will be set as the
     *     "continueUrl" parameter in the password reset link. The default password
     *     reset landing page will use this to display a link to go back to the app
     *     if it is installed.
     *     If the actionCodeSettings is not specified, no URL is appended to the
     *     action URL.
     *     The state URL provided must belong to a domain that is whitelisted by the
     *     developer in the console. Otherwise an error will be thrown.
     *     Mobile app redirects will only be applicable if the developer configures
     *     and accepts the Firebase Dynamic Links terms of condition.
     *     The Android package name and iOS bundle ID will be respected only if they
     *     are configured in the same Firebase Auth project used.
     */
    sendPasswordResetEmail(
      email: string,
      actionCodeSettings?: firebase.auth.ActionCodeSettings | null
    ): Promise<void>;

    /**
     * Changes the current type of persistence on the current Auth instance for the
     * currently saved Auth session and applies this type of persistence for
     * future sign-in requests, including sign-in with redirect requests. This will
     * return a promise that will resolve once the state finishes copying from one
     * type of storage to the other.
     * Calling a sign-in method after changing persistence will wait for that
     * persistence change to complete before applying it on the new Auth state.
     *
     * This makes it easy for a user signing in to specify whether their session
     * should be remembered or not. It also makes it easier to never persist the
     * Auth state for applications that are shared by other users or have sensitive
     * data.
     *
     * The default for web browser apps and React Native apps is 'local' (provided
     * the browser supports this mechanism) whereas it is 'none' for Node.js backend
     * apps.
     *
     * <h4>Error Codes (thrown synchronously)</h4>
     * <dl>
     * <dt>auth/invalid-persistence-type</dt>
     * <dd>Thrown if the specified persistence type is invalid.</dd>
     * <dt>auth/unsupported-persistence-type</dt>
     * <dd>Thrown if the current environment does not support the specified
     *     persistence type.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
     *     .then(function() {
     *   // Existing and future Auth states are now persisted in the current
     *   // session only. Closing the window would clear any existing state even if
     *   // a user forgets to sign out.
     * });
     * ```
     */
    setPersistence(persistence: firebase.auth.Auth.Persistence): Promise<void>;

    /**
     * Asynchronously signs in with the given credentials, and returns any available
     * additional user information, such as user name.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/account-exists-with-different-credential</dt>
     * <dd>Thrown if there already exists an account with the email address
     *     asserted by the credential. Resolve this by calling
     *     {@link firebase.auth.Auth.fetchProvidersForEmail} and then asking the
     *     user to sign in using one of the returned providers. Once the user is
     *     signed in, the original credential can be linked to the user with
     *     {@link firebase.User.linkWithCredential}.</dd>
     * <dt>auth/invalid-credential</dt>
     * <dd>Thrown if the credential is malformed or has expired.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if the type of account corresponding to the credential
     *     is not enabled. Enable the account type in the Firebase Console, under
     *     the Auth tab.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given credential has been
     *     disabled.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if signing in with a credential from
     *     {@link firebase.auth.EmailAuthProvider.credential} and there is no user
     *     corresponding to the given email. </dd>
     * <dt>auth/wrong-password</dt>
     * <dd>Thrown if signing in with a credential from
     *     {@link firebase.auth.EmailAuthProvider.credential} and the password is
     *     invalid for the given email, or if the account corresponding to the email
     *     does not have a password set.</dd>
     * <dt>auth/invalid-verification-code</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential} and the verification
     *     code of the credential is not valid.</dd>
     * <dt>auth/invalid-verification-id</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential}  and the verification
     *     ID of the credential is not valid.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().signInAndRetrieveDataWithCredential(credential)
     *     .then(function(userCredential) {
     *       console.log(userCredential.additionalUserInfo.username);
     *     });
     * ```
     * @param {!firebase.auth.AuthCredential} credential The auth credential.
     */
    signInAndRetrieveDataWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<firebase.auth.UserCredential>;
    /**
     * Asynchronously signs in as an anonymous user.
     *
     *
     * If there is already an anonymous user signed in, that user will be returned;
     * otherwise, a new anonymous user identity will be created and returned.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if anonymous accounts are not enabled. Enable anonymous accounts
     *     in the Firebase Console, under the Auth tab.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().signInAnonymously().catch(function(error) {
     *   // Handle Errors here.
     *   var errorCode = error.code;
     *   var errorMessage = error.message;
     *
     *   if (errorCode === 'auth/operation-not-allowed') {
     *     alert('You must enable Anonymous auth in the Firebase Console.');
     *   } else {
     *     console.error(error);
     *   }
     * });
     * ```
     */
    signInAnonymously(): Promise<firebase.auth.UserCredential>;

    /**
     * Signs in a user anonymously and returns any additional user info data or
     * credentials.
     *
     * This method is deprecated. Use
     * {@link firebase.auth.Auth.signInAnonymously} instead.
     *
     * If there is already an anonymous user signed in, that user with
     * additional date will be returned; otherwise, a new anonymous user
     * identity will be created and returned.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if anonymous accounts are not enabled. Enable anonymous accounts
     *     in the Firebase Console, under the Auth tab.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().signInAnonymouslyAndRetrieveData().catch(function(error) {
     *   // Handle Errors here.
     *   var errorCode = error.code;
     *   var errorMessage = error.message;
     *
     *   if (errorCode === 'auth/operation-not-allowed') {
     *     alert('You must enable Anonymous auth in the Firebase Console.');
     *   } else {
     *     console.error(error);
     *   }
     * });
     * ```
     */
    signInAnonymouslyAndRetrieveData(): Promise<firebase.auth.UserCredential>;

    /**
     * Asynchronously signs in with the given credentials.
     *
     * This method is deprecated. Use
     * {@link firebase.auth.Auth.signInAndRetrieveDataWithCredential} instead.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/account-exists-with-different-credential</dt>
     * <dd>Thrown if there already exists an account with the email address
     *     asserted by the credential. Resolve this by calling
     *     {@link firebase.auth.Auth.fetchProvidersForEmail} and then asking the
     *     user to sign in using one of the returned providers. Once the user is
     *     signed in, the original credential can be linked to the user with
     *     {@link firebase.User.linkWithCredential}.</dd>
     * <dt>auth/invalid-credential</dt>
     * <dd>Thrown if the credential is malformed or has expired.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if the type of account corresponding to the credential
     *     is not enabled. Enable the account type in the Firebase Console, under
     *     the Auth tab.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given credential has been
     *     disabled.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if signing in with a credential from
     *     {@link firebase.auth.EmailAuthProvider.credential} and there is no user
     *     corresponding to the given email. </dd>
     * <dt>auth/wrong-password</dt>
     * <dd>Thrown if signing in with a credential from
     *     {@link firebase.auth.EmailAuthProvider.credential} and the password is
     *     invalid for the given email, or if the account corresponding to the email
     *     does not have a password set.</dd>
     * <dt>auth/invalid-verification-code</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential} and the verification
     *     code of the credential is not valid.</dd>
     * <dt>auth/invalid-verification-id</dt>
     * <dd>Thrown if the credential is a
     *     {@link firebase.auth.PhoneAuthProvider.credential}  and the verification
     *     ID of the credential is not valid.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().signInWithCredential(credential).catch(function(error) {
     *   // Handle Errors here.
     *   var errorCode = error.code;
     *   var errorMessage = error.message;
     *   // The email of the user's account used.
     *   var email = error.email;
     *   // The firebase.auth.AuthCredential type that was used.
     *   var credential = error.credential;
     *   if (errorCode === 'auth/account-exists-with-different-credential') {
     *     alert('Email already associated with another account.');
     *     // Handle account linking here, if using.
     *   } else {
     *     console.error(error);
     *   }
     *  });
     * ```
     *
     * @param {!firebase.auth.AuthCredential} credential The auth credential.
     */
    signInWithCredential(
      credential: firebase.auth.AuthCredential
    ): Promise<firebase.User>;
    /**
     * Asynchronously signs in using a custom token.
     *
     * Custom tokens are used to integrate Firebase Auth with existing auth systems,
     * and must be generated by the auth backend.
     *
     * Fails with an error if the token is invalid, expired, or not accepted by the
     * Firebase Auth service.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/custom-token-mismatch</dt>
     * <dd>Thrown if the custom token is for a different Firebase App.</dd>
     * <dt>auth/invalid-custom-token</dt>
     * <dd>Thrown if the custom token format is incorrect.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().signInWithCustomToken(token).catch(function(error) {
     *   // Handle Errors here.
     *   var errorCode = error.code;
     *   var errorMessage = error.message;
     *   if (errorCode === 'auth/invalid-custom-token') {
     *     alert('The token you provided is not valid.');
     *   } else {
     *     console.error(error);
     *   }
     * });
     * ```
     *
     * @param {string} token The custom token to sign in with.
     */
    signInWithCustomToken(token: string): Promise<firebase.auth.UserCredential>;
    /**
     * Signs in a user asynchronously using a custom token and returns any
     * additional user info data or credentials.
     *
     * This method is deprecated. Use
     * {@link firebase.auth.Auth.signInWithCustomToken} instead.
     *
     * Custom tokens are used to integrate Firebase Auth with existing auth systems,
     * and must be generated by the auth backend.
     *
     * Fails with an error if the token is invalid, expired, or not accepted by the
     * Firebase Auth service.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/custom-token-mismatch</dt>
     * <dd>Thrown if the custom token is for a different Firebase App.</dd>
     * <dt>auth/invalid-custom-token</dt>
     * <dd>Thrown if the custom token format is incorrect.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().signInAndRetrieveDataWithCustomToken(token)
     *     .catch(function(error) {
     *       // Handle Errors here.
     *       var errorCode = error.code;
     *       var errorMessage = error.message;
     *       if (errorCode === 'auth/invalid-custom-token') {
     *         alert('The token you provided is not valid.');
     *       } else {
     *         console.error(error);
     *       }
     *     });
     * ```
     *
     * @param {string} token The custom token to sign in with.
     */
    signInAndRetrieveDataWithCustomToken(
      token: string
    ): Promise<firebase.auth.UserCredential>;
    /**
     * Asynchronously signs in using an email and password.
     *
     * Fails with an error if the email address and password do not match.
     *
     * Note: The user's password is NOT the password used to access the user's email
     * account. The email address serves as a unique identifier for the user, and
     * the password is used to access the user's account in your Firebase project.
     *
     * See also: {@link firebase.auth.Auth.createUserWithEmailAndPassword}.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email address is not valid.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given email has been
     *     disabled.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if there is no user corresponding to the given email.</dd>
     * <dt>auth/wrong-password</dt>
     * <dd>Thrown if the password is invalid for the given email, or the account
     *     corresponding to the email does not have a password set.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().signInWithEmailAndPassword(email, password)
     *     .catch(function(error) {
     *   // Handle Errors here.
     *   var errorCode = error.code;
     *   var errorMessage = error.message;
     *   if (errorCode === 'auth/wrong-password') {
     *     alert('Wrong password.');
     *   } else {
     *     alert(errorMessage);
     *   }
     *   console.log(error);
     * });
     * ```
     *
     * @param {string} email The users email address.
     * @param {string} password The users password.
     */
    signInWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<firebase.auth.UserCredential>;

    /**
     * Asynchronously signs in using an email and password and returns any additional
     * user info data or credentials.
     *
     * This method is deprecated. Use
     * {@link firebase.auth.Auth.signInWithEmailAndPassword} instead.
     *
     * Fails with an error if the email address and password do not match.
     *
     * Note: The user's password is NOT the password used to access the user's email
     * account. The email address serves as a unique identifier for the user, and
     * the password is used to access the user's account in your Firebase project.
     *
     * See also:
     * {@link firebase.auth.Auth.createUserAndRetrieveDataWithEmailAndPassword}.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email address is not valid.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given email has been
     *     disabled.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if there is no user corresponding to the given email.</dd>
     * <dt>auth/wrong-password</dt>
     * <dd>Thrown if the password is invalid for the given email, or the account
     *     corresponding to the email does not have a password set.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().signInAndRetrieveDataWithEmailAndPassword(email, password)
     *     .catch(function(error) {
     *       // Handle Errors here.
     *       var errorCode = error.code;
     *       var errorMessage = error.message;
     *       if (errorCode === 'auth/wrong-password') {
     *         alert('Wrong password.');
     *       } else {
     *         alert(errorMessage);
     *       }
     *       console.log(error);
     *     });
     * ```
     *
     * @param {string} email The users email address.
     * @param {string} password The users password.
     */
    signInAndRetrieveDataWithEmailAndPassword(
      email: string,
      password: string
    ): Promise<firebase.auth.UserCredential>;
    /**
     * Asynchronously signs in using a phone number. This method sends a code via
     * SMS to the given phone number, and returns a
     * {@link firebase.auth.ConfirmationResult}. After the user provides the code
     * sent to their phone, call {@link firebase.auth.ConfirmationResult.confirm}
     * with the code to sign the user in.
     *
     * For abuse prevention, this method also requires a
     * {@link firebase.auth.ApplicationVerifier}. The Firebase Auth SDK includes
     * a reCAPTCHA-based implementation, {@link firebase.auth.RecaptchaVerifier}.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/captcha-check-failed</dt>
     * <dd>Thrown if the reCAPTCHA response token was invalid, expired, or if
     *     this method was called from a non-whitelisted domain.</dd>
     * <dt>auth/invalid-phone-number</dt>
     * <dd>Thrown if the phone number has an invalid format.</dd>
     * <dt>auth/missing-phone-number</dt>
     * <dd>Thrown if the phone number is missing.</dd>
     * <dt>auth/quota-exceeded</dt>
     * <dd>Thrown if the SMS quota for the Firebase project has been exceeded.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given phone number has been
     *     disabled.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if you have not enabled the provider in the Firebase Console. Go
     *     to the Firebase Console for your project, in the Auth section and the
     *     <strong>Sign in Method</strong> tab and configure the provider.</dd>
     * </dl>
     *
     * @example
     * ```
     * // 'recaptcha-container' is the ID of an element in the DOM.
     * var applicationVerifier = new firebase.auth.RecaptchaVerifier(
     *     'recaptcha-container');
     * firebase.auth().signInWithPhoneNumber(phoneNumber, applicationVerifier)
     *     .then(function(confirmationResult) {
     *       var verificationCode = window.prompt('Please enter the verification ' +
     *           'code that was sent to your mobile device.');
     *       return confirmationResult.confirm(verificationCode);
     *     })
     *     .catch(function(error) {
     *       // Handle Errors here.
     *     });
     * ```
     *
     * @param {string} phoneNumber The user's phone number in E.164 format (e.g.
     *     +16505550101).
     * @param {!firebase.auth.ApplicationVerifier} applicationVerifier
     */
    signInWithPhoneNumber(
      phoneNumber: string,
      applicationVerifier: firebase.auth.ApplicationVerifier
    ): Promise<firebase.auth.ConfirmationResult>;
    /**
     * Asynchronously signs in using an email and sign-in email link. If no link
     * is passed, the link is inferred from the current URL.
     *
     * Fails with an error if the email address is invalid or OTP in email link
     * expires.
     *
     * Note: Confirm the link is a sign-in email link before calling this method
     * {@link firebase.auth.Auth.isSignInWithEmailLink}.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/expired-action-code</dt>
     * <dd>Thrown if OTP in email link expires.</dd>
     * <dt>auth/invalid-email</dt>
     * <dd>Thrown if the email address is not valid.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given email has been
     *     disabled.</dd>
     * </dl>
     *
     * @example
     * ```
     * firebase.auth().signInWithEmailLink(email, emailLink)
     *     .catch(function(error) {
     *       // Some error occurred, you can inspect the code: error.code
     *       // Common errors could be invalid email and invalid or expired OTPs.
     *     });
     * ```
     *
     * @param {string} email The email account to sign in with.
     * @param {?string=} emailLink The optional link which contains the OTP needed
     *     to complete the sign in with email link. If not specified, the current
     *     URL is used instead.
     */
    signInWithEmailLink(
      email: string,
      emailLink?: string
    ): Promise<firebase.auth.UserCredential>;
    /**
     * Authenticates a Firebase client using a popup-based OAuth authentication
     * flow.
     *
     * If succeeds, returns the signed in user along with the provider's credential.
     * If sign in was unsuccessful, returns an error object containing additional
     * information about the error.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/account-exists-with-different-credential</dt>
     * <dd>Thrown if there already exists an account with the email address
     *     asserted by the credential. Resolve this by calling
     *     {@link firebase.auth.Auth.fetchProvidersForEmail} with the error.email
     *     and then asking the user to sign in using one of the returned providers.
     *     Once the user is signed in, the original credential retrieved from the
     *     error.credential can be linked to the user with
     *     {@link firebase.User.linkWithCredential} to prevent the user from signing
     *     in again to the original provider via popup or redirect. If you are using
     *     redirects for sign in, save the credential in session storage and then
     *     retrieve on redirect and repopulate the credential using for example
     *     {@link firebase.auth.GoogleAuthProvider.credential} depending on the
     *     credential provider id and complete the link.</dd>
     * <dt>auth/auth-domain-config-required</dt>
     * <dd>Thrown if authDomain configuration is not provided when calling
     *     firebase.initializeApp(). Check Firebase Console for instructions on
     *     determining and passing that field.</dd>
     * <dt>auth/cancelled-popup-request</dt>
     * <dd>Thrown if successive popup operations are triggered. Only one popup
     *     request is allowed at one time. All the popups would fail with this error
     *     except for the last one.</dd>
     * <dt>auth/operation-not-allowed</dt>
     * <dd>Thrown if the type of account corresponding to the credential
     *     is not enabled. Enable the account type in the Firebase Console, under
     *     the Auth tab.</dd>
     * <dt>auth/operation-not-supported-in-this-environment</dt>
     * <dd>Thrown if this operation is not supported in the environment your
     *     application is running on. "location.protocol" must be http or https.
     *     </dd>
     * <dt>auth/popup-blocked</dt>
     * <dd>Thrown if the popup was blocked by the browser, typically when this
     *     operation is triggered outside of a click handler.</dd>
     * <dt>auth/popup-closed-by-user</dt>
     * <dd>Thrown if the popup window is closed by the user without completing the
     *     sign in to the provider.</dd>
     * <dt>auth/unauthorized-domain</dt>
     * <dd>Thrown if the app domain is not authorized for OAuth operations for your
     *     Firebase project. Edit the list of authorized domains from the Firebase
     *     console.</dd>
     * </dl>
     *
     * @example
     * ```
     * // Creates the provider object.
     * var provider = new firebase.auth.FacebookAuthProvider();
     * // You can add additional scopes to the provider:
     * provider.addScope('email');
     * provider.addScope('user_friends');
     * // Sign in with popup:
     * auth.signInWithPopup(provider).then(function(result) {
     *   // The firebase.User instance:
     *   var user = result.user;
     *   // The Facebook firebase.auth.AuthCredential containing the Facebook
     *   // access token:
     *   var credential = result.credential;
     * }, function(error) {
     *   // The provider's account email, can be used in case of
     *   // auth/account-exists-with-different-credential to fetch the providers
     *   // linked to the email:
     *   var email = error.email;
     *   // The provider's credential:
     *   var credential = error.credential;
     *   // In case of auth/account-exists-with-different-credential error,
     *   // you can fetch the providers using this:
     *   if (error.code === 'auth/account-exists-with-different-credential') {
     *     auth.fetchProvidersForEmail(email).then(function(providers) {
     *       // The returned 'providers' is a list of the available providers
     *       // linked to the email address. Please refer to the guide for a more
     *       // complete explanation on how to recover from this error.
     *     });
     *   }
     * });
     * ```
     *
     * @param {!firebase.auth.AuthProvider} provider The provider to authenticate.
     *     The provider has to be an OAuth provider. Non-OAuth providers like {@link
     *     firebase.auth.EmailAuthProvider} will throw an error.
     * @return {!firebase.Promise<!firebase.auth.UserCredential>}
     */
    signInWithPopup(
      provider: firebase.auth.AuthProvider
    ): Promise<firebase.auth.UserCredential>;
    /**
     * Authenticates a Firebase client using a full-page redirect flow. To handle
     * the results and errors for this operation, refer to {@link
     * firebase.auth.Auth.getRedirectResult}.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/auth-domain-config-required</dt>
     * <dd>Thrown if authDomain configuration is not provided when calling
     *     firebase.initializeApp(). Check Firebase Console for instructions on
     *     determining and passing that field.</dd>
     * <dt>auth/operation-not-supported-in-this-environment</dt>
     * <dd>Thrown if this operation is not supported in the environment your
     *     application is running on. "location.protocol" must be http or https.
     *     </dd>
     * <dt>auth/unauthorized-domain</dt>
     * <dd>Thrown if the app domain is not authorized for OAuth operations for your
     *     Firebase project. Edit the list of authorized domains from the Firebase
     *     console.</dd>
     * </dl>
     *
     * @param {!firebase.auth.AuthProvider} provider The provider to authenticate.
     *     The provider has to be an OAuth provider. Non-OAuth providers like {@link
     *     firebase.auth.EmailAuthProvider} will throw an error.
     * @return {!firebase.Promise<void>}
     */
    signInWithRedirect(provider: firebase.auth.AuthProvider): Promise<void>;
    /**
     * Signs out the current user.
     */
    signOut(): Promise<void>;
    /**
     * Asynchronously sets the provided user as `currentUser` on the current Auth
     * instance. A new instance copy of the user provided will be made and set as
     * `currentUser`.
     *
     * This will trigger {@link firebase.auth.Auth.onAuthStateChanged} and
     * {@link firebase.auth.Auth.onIdTokenChanged} listeners like other sign in
     * methods.
     *
     * The operation fails with an error if the user to be updated belongs to a
     * different Firebase project.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/invalid-user-token</dt>
     * <dd>Thrown if the user to be updated belongs to a diffent Firebase
     *     project.</dd>
     * <dt>auth/user-token-expired</dt>
     * <dd>Thrown if the token of the user to be updated is expired.</dd>
     * <dt>auth/null-user</dt>
     * <dd>Thrown if the user to be updated is null.</dd>
     * </dl>
     */
    updateCurrentUser(user: firebase.User | null): Promise<void>;
    /**
     * Sets the current language to the default device/browser preference.
     */
    useDeviceLanguage(): void;
    /**
     * Checks a password reset code sent to the user by email or other out-of-band
     * mechanism.
     *
     * Returns the user's email address if valid.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/expired-action-code</dt>
     * <dd>Thrown if the password reset code has expired.</dd>
     * <dt>auth/invalid-action-code</dt>
     * <dd>Thrown if the password reset code is invalid. This can happen if the code
     *     is malformed or has already been used.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given password reset code has
     *     been disabled.</dd>
     * <dt>auth/user-not-found</dt>
     * <dd>Thrown if there is no user corresponding to the password reset code. This
     *     may have happened if the user was deleted between when the code was
     *     issued and when this method was called.</dd>
     * </dl>
     *
     * @param {string} code A verification code sent to the user.
     * @return {!firebase.Promise<string>}
     */
    verifyPasswordResetCode(code: string): Promise<string>;
  }

  /**
   * Interface that represents the credentials returned by an auth provider.
   * Implementations specify the details about each auth provider's credential
   * requirements.
   *
   */
  interface AuthCredential {
    /**
     * The authentication provider ID for the credential.
     * For example, 'facebook.com', or 'google.com'.
     */
    providerId: string;
    /**
     * The authentication sign in method for the credential.
     * For example, 'password', or 'emailLink. This corresponds to the sign-in
     * method identifier as returned in
     * {@link firebase.auth.Auth.fetchSignInMethodsForEmail}.
     */
    signInMethod: string;
  }

  /**
   * Interface that represents the OAuth credentials returned by an OAuth
   * provider. Implementations specify the details about each auth provider's
   * credential requirements.
   *
   */
  interface OAuthCredential extends AuthCredential {
    /**
     * The OAuth ID token associated with the credential if it belongs to an
     * OIDC provider, such as `google.com`.
     */
    idToken?: string;
    /**
     * The OAuth access token associated with the credential if it belongs to
     * an OAuth provider, such as `facebook.com`, `twitter.com`, etc.
     */
    accessToken?: string;
    /**
     * The OAuth access token secret associated with the credential if it
     * belongs to an OAuth 1.0 provider, such as `twitter.com`.
     */
    secret?: string;
  }

  /**
   * Interface that represents an auth provider.
   */
  interface AuthProvider {
    providerId: string;
  }

  /**
   * A result from a phone number sign-in, link, or reauthenticate call.
   */
  interface ConfirmationResult {
    /**
     * Finishes a phone number sign-in, link, or reauthentication, given the code
     * that was sent to the user's mobile device.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/invalid-verification-code</dt>
     * <dd>Thrown if the verification code is not valid.</dd>
     * <dt>auth/missing-verification-code</dt>
     * <dd>Thrown if the verification code is missing.</dd>
     * </dl>
     */
    confirm(verificationCode: string): Promise<firebase.auth.UserCredential>;
    /**
     * The phone number authentication operation's verification ID. This can be used
     * along with the verification code to initialize a phone auth credential.
     */
    verificationId: string;
  }

  /**
   * Email and password auth provider implementation.
   *
   * To authenticate: {@link firebase.auth.Auth.createUserWithEmailAndPassword}
   * and {@link firebase.auth.Auth.signInWithEmailAndPassword}.
   */
  class EmailAuthProvider extends EmailAuthProvider_Instance {
    static PROVIDER_ID: string;
    /**
     * This corresponds to the sign-in method identifier as returned in
     * {@link firebase.auth.Auth.fetchSignInMethodsForEmail}.
     */
    static EMAIL_PASSWORD_SIGN_IN_METHOD: string;
    /**
     * This corresponds to the sign-in method identifier as returned in
     * {@link firebase.auth.Auth.fetchSignInMethodsForEmail}.
     */
    static EMAIL_LINK_SIGN_IN_METHOD: string;
    /**
     * @example
     * ```
     * var cred = firebase.auth.EmailAuthProvider.credential(
     *     email,
     *     password
     * );
     * ```
     *
     * @param {string} email Email address.
     * @param {string} password User account password.
     * @return {!firebase.auth.AuthCredential} The auth provider credential.
     */
    static credential(
      email: string,
      password: string
    ): firebase.auth.AuthCredential;
    /**
     * Initialize an `EmailAuthProvider` credential using an email and an email link
     * after a sign in with email link operation.
     *
     * @example
     * ```
     * var cred = firebase.auth.EmailAuthProvider.credentialWithLink(
     *     email,
     *     emailLink
     * );
     * ```
     *
     * @param {string} email Email address.
     * @param {string} emailLink Sign-in email link.
     * @return {!firebase.auth.AuthCredential} The auth provider credential.
     */
    static credentialWithLink(
      email: string,
      emailLink: string
    ): firebase.auth.AuthCredential;
  }
  /**
   * @hidden
   */
  class EmailAuthProvider_Instance implements firebase.auth.AuthProvider {
    providerId: string;
  }

  /**
   * An authentication error.
   * For method-specific error codes, refer to the specific methods in the
   * documentation. For common error codes, check the reference below. Use {@link
   * firebase.auth.Error#code} to get the specific error code. For a detailed
   * message, use {@link firebase.auth.Error.message}.
   * Errors with the code <strong>auth/account-exists-with-different-credential
   * </strong> will have the additional fields <strong>email</strong> and <strong>
   * credential</strong> which are needed to provide a way to resolve these
   * specific errors. Refer to {@link firebase.auth.Auth.signInWithPopup} for more
   * information.
   *
   * <h4>Common Error Codes</h4>
   * <dl>
   * <dt>auth/app-deleted</dt>
   * <dd>Thrown if the instance of FirebaseApp has been deleted.</dd>
   * <dt>auth/app-not-authorized</dt>
   * <dd>Thrown if the app identified by the domain where it's hosted, is not
   *     authorized to use Firebase Authentication with the provided API key.
   *     Review your key configuration in the Google API console.</dd>
   * <dt>auth/argument-error</dt>
   * <dd>Thrown if a method is called with incorrect arguments.</dd>
   * <dt>auth/invalid-api-key</dt>
   * <dd>Thrown if the provided API key is invalid. Please check that you have
   *     copied it correctly from the Firebase Console.</dd>
   * <dt>auth/invalid-user-token</dt>
   * <dd>Thrown if the user's credential is no longer valid. The user must sign in
   *     again.</dd>
   * <dt>auth/network-request-failed</dt>
   * <dd>Thrown if a network error (such as timeout, interrupted connection or
   *     unreachable host) has occurred.</dd>
   * <dt>auth/operation-not-allowed</dt>
   * <dd>Thrown if you have not enabled the provider in the Firebase Console. Go
   *     to the Firebase Console for your project, in the Auth section and the
   *     <strong>Sign in Method</strong> tab and configure the provider.</dd>
   * <dt>auth/requires-recent-login</dt>
   * <dd>Thrown if the user's last sign-in time does not meet the security
   *     threshold. Use {@link firebase.User.reauthenticateWithCredential} to
   *     resolve. This does not apply if the user is anonymous.</dd>
   * <dt>auth/too-many-requests</dt>
   * <dd>Thrown if requests are blocked from a device due to unusual activity.
   *     Trying again after some delay would unblock.</dd>
   * <dt>auth/unauthorized-domain</dt>
   * <dd>Thrown if the app domain is not authorized for OAuth operations for your
   *     Firebase project. Edit the list of authorized domains from the Firebase
   *     console.</dd>
   * <dt>auth/user-disabled</dt>
   * <dd>Thrown if the user account has been disabled by an administrator.
   *     Accounts can be enabled or disabled in the Firebase Console, the Auth
   *     section and Users subsection.</dd>
   * <dt>auth/user-token-expired</dt>
   * <dd>Thrown if the user's credential has expired. This could also be thrown if
   *     a user has been deleted. Prompting the user to sign in again should
   *     resolve this for either case.</dd>
   * <dt>auth/web-storage-unsupported</dt>
   * <dd>Thrown if the browser does not support web storage or if the user
   *     disables them.</dd>
   * </dl>
   */
  interface Error {
    /**
     * Unique error code.
     */
    code: string;
    /**
     * Complete error message.
     */
    message: string;
  }

  /**
   * Facebook auth provider.
   *
   * @example
   * ```
   * // Sign in using a redirect.
   * firebase.auth().getRedirectResult().then(function(result) {
   *   if (result.credential) {
   *     // This gives you a Google Access Token.
   *     var token = result.credential.accessToken;
   *   }
   *   var user = result.user;
   * })
   * // Start a sign in process for an unauthenticated user.
   * var provider = new firebase.auth.FacebookAuthProvider();
   * provider.addScope('user_birthday');
   * firebase.auth().signInWithRedirect(provider);
   * ```
   *
   * @example
   * ```
   * // Sign in using a popup.
   * var provider = new firebase.auth.FacebookAuthProvider();
   * provider.addScope('user_birthday');
   * firebase.auth().signInWithPopup(provider).then(function(result) {
   *   // This gives you a Facebook Access Token.
   *   var token = result.credential.accessToken;
   *   // The signed-in user info.
   *   var user = result.user;
   * });
   * ```
   *
   * @see {@link firebase.auth.Auth.onAuthStateChanged} to receive sign in state
   * changes.
   */
  class FacebookAuthProvider extends FacebookAuthProvider_Instance {
    static PROVIDER_ID: string;
    /**
     * This corresponds to the sign-in method identifier as returned in
     * {@link firebase.auth.Auth.fetchSignInMethodsForEmail}.
     */
    static FACEBOOK_SIGN_IN_METHOD: string;
    /**
     * @example
     * ```
     * var cred = firebase.auth.FacebookAuthProvider.credential(
     *     // `event` from the Facebook auth.authResponseChange callback.
     *     event.authResponse.accessToken
     * );
     * ```
     *
     * @param {string} token Facebook access token.
     */
    static credential(token: string): firebase.auth.OAuthCredential;
  }
  /**
   * @hidden
   */
  class FacebookAuthProvider_Instance implements firebase.auth.AuthProvider {
    /**
     * @param {string} scope Facebook OAuth scope.
     * @return {!firebase.auth.AuthProvider} The provider instance itself.
     */
    addScope(scope: string): firebase.auth.AuthProvider;
    providerId: string;
    /**
     * Sets the OAuth custom parameters to pass in a Facebook OAuth request for
     * popup and redirect sign-in operations.
     * Valid parameters include 'auth_type', 'display' and 'locale'.
     * For a detailed list, check the
     * {@link https://goo.gl/pve4fo Facebook}
     * documentation.
     * Reserved required OAuth 2.0 parameters such as 'client_id', 'redirect_uri',
     * 'scope', 'response_type' and 'state' are not allowed and will be ignored.
     * @param {!Object} customOAuthParameters The custom OAuth parameters to pass
     *     in the OAuth request.
     * @return {!firebase.auth.AuthProvider} The provider instance itself.
     */
    setCustomParameters(
      customOAuthParameters: Object
    ): firebase.auth.AuthProvider;
  }

  /**
   * Github auth provider.
   *
   * GitHub requires an OAuth 2.0 redirect, so you can either handle the redirect
   * directly, or use the signInWithPopup handler:
   *
   * @example
   * ```
   * // Using a redirect.
   * firebase.auth().getRedirectResult().then(function(result) {
   *   if (result.credential) {
   *     // This gives you a GitHub Access Token.
   *     var token = result.credential.accessToken;
   *   }
   *   var user = result.user;
   * }).catch(function(error) {
   *   // Handle Errors here.
   *   var errorCode = error.code;
   *   var errorMessage = error.message;
   *   // The email of the user's account used.
   *   var email = error.email;
   *   // The firebase.auth.AuthCredential type that was used.
   *   var credential = error.credential;
   *   if (errorCode === 'auth/account-exists-with-different-credential') {
   *     alert('You have signed up with a different provider for that email.');
   *     // Handle linking here if your app allows it.
   *   } else {
   *     console.error(error);
   *   }
   * });
   *
   * // Start a sign in process for an unauthenticated user.
   * var provider = new firebase.auth.GithubAuthProvider();
   * provider.addScope('repo');
   * firebase.auth().signInWithRedirect(provider);
   * ```
   *
   * @example
   * ```
   * // With popup.
   * var provider = new firebase.auth.GithubAuthProvider();
   *  provider.addScope('repo');
   *  firebase.auth().signInWithPopup(provider).then(function(result) {
   *    // This gives you a GitHub Access Token.
   *    var token = result.credential.accessToken;
   *    // The signed-in user info.
   *    var user = result.user;
   *  }).catch(function(error) {
   *    // Handle Errors here.
   *    var errorCode = error.code;
   *    var errorMessage = error.message;
   *    // The email of the user's account used.
   *    var email = error.email;
   *    // The firebase.auth.AuthCredential type that was used.
   *    var credential = error.credential;
   *    if (errorCode === 'auth/account-exists-with-different-credential') {
   *      alert('You have signed up with a different provider for that email.');
   *      // Handle linking here if your app allows it.
   *    } else {
   *      console.error(error);
   *    }
   *  });
   * ```
   *
   * @see {@link firebase.auth.Auth.onAuthStateChanged} to receive sign in state
   * changes.
   */
  class GithubAuthProvider extends GithubAuthProvider_Instance {
    static PROVIDER_ID: string;
    /**
     * This corresponds to the sign-in method identifier as returned in
     * {@link firebase.auth.Auth.fetchSignInMethodsForEmail}.
     */
    static GITHUB_SIGN_IN_METHOD: string;
    /**
     * @example
     * ```
     * var cred = firebase.auth.FacebookAuthProvider.credential(
     *     // `event` from the Facebook auth.authResponseChange callback.
     *     event.authResponse.accessToken
     * );
     * ```
     *
     * @param {string} token Github access token.
     * @return {!firebase.auth.OAuthCredential} The auth provider credential.
     */
    static credential(token: string): firebase.auth.OAuthCredential;
  }
  /**
   * @hidden
   */
  class GithubAuthProvider_Instance implements firebase.auth.AuthProvider {
    /**
     * @param {string} scope Github OAuth scope.
     * @return {!firebase.auth.AuthProvider} The provider instance itself.
     */
    addScope(scope: string): firebase.auth.AuthProvider;
    providerId: string;
    /**
     * Sets the OAuth custom parameters to pass in a GitHub OAuth request for popup
     * and redirect sign-in operations.
     * Valid parameters include 'allow_signup'.
     * For a detailed list, check the
     * {@link https://developer.github.com/v3/oauth/ GitHub} documentation.
     * Reserved required OAuth 2.0 parameters such as 'client_id', 'redirect_uri',
     * 'scope', 'response_type' and 'state' are not allowed and will be ignored.
     * @param {!Object} customOAuthParameters The custom OAuth parameters to pass
     *     in the OAuth request.
     * @return {!firebase.auth.AuthProvider} The provider instance itself.
     */
    setCustomParameters(
      customOAuthParameters: Object
    ): firebase.auth.AuthProvider;
  }

  /**
   * Google auth provider.
   *
   * @example
   * ```
   * // Using a redirect.
   * firebase.auth().getRedirectResult().then(function(result) {
   *   if (result.credential) {
   *     // This gives you a Google Access Token.
   *     var token = result.credential.accessToken;
   *   }
   *   var user = result.user;
   * });
   *
   * // Start a sign in process for an unauthenticated user.
   * var provider = new firebase.auth.GoogleAuthProvider();
   * provider.addScope('profile');
   * provider.addScope('email');
   * firebase.auth().signInWithRedirect(provider);
   * ```
   *
   * @example
   * ```
   * // Using a popup.
   * var provider = new firebase.auth.GoogleAuthProvider();
   * provider.addScope('profile');
   * provider.addScope('email');
   * firebase.auth().signInWithPopup(provider).then(function(result) {
   *  // This gives you a Google Access Token.
   *  var token = result.credential.accessToken;
   *  // The signed-in user info.
   *  var user = result.user;
   * });
   * ```
   *
   * @see {@link firebase.auth.Auth.onAuthStateChanged} to receive sign in state
   * changes.
   */
  class GoogleAuthProvider extends GoogleAuthProvider_Instance {
    static PROVIDER_ID: string;
    /**
     * This corresponds to the sign-in method identifier as returned in
     * {@link firebase.auth.Auth.fetchSignInMethodsForEmail}.
     */
    static GOOGLE_SIGN_IN_METHOD: string;
    /**
     * Creates a credential for Google. At least one of ID token and access token
     * is required.
     *
     * @example
     * ```
     * // \`googleUser\` from the onsuccess Google Sign In callback.
     * var credential = firebase.auth.GoogleAuthProvider.credential(
                  googleUser.getAuthResponse().id_token);
     * firebase.auth().signInWithCredential(credential)
     * ```
     * @param {?string=} idToken Google ID token.
     * @param {?string=} accessToken Google access token.
     * @return {!firebase.auth.OAuthCredential} The auth provider credential.
     */
    static credential(
      idToken?: string | null,
      accessToken?: string | null
    ): firebase.auth.OAuthCredential;
  }
  /**
   * @hidden
   */
  class GoogleAuthProvider_Instance implements firebase.auth.AuthProvider {
    /**
     * @param {string} scope Google OAuth scope.
     * @return {!firebase.auth.AuthProvider} The provider instance itself.
     */
    addScope(scope: string): firebase.auth.AuthProvider;
    providerId: string;
    /**
     * Sets the OAuth custom parameters to pass in a Google OAuth request for popup
     * and redirect sign-in operations.
     * Valid parameters include 'hd', 'hl', 'include_granted_scopes', 'login_hint'
     * and 'prompt'.
     * For a detailed list, check the
     * {@link https://goo.gl/Xo01Jm Google}
     * documentation.
     * Reserved required OAuth 2.0 parameters such as 'client_id', 'redirect_uri',
     * 'scope', 'response_type' and 'state' are not allowed and will be ignored.
     * @param {!Object} customOAuthParameters The custom OAuth parameters to pass
     *     in the OAuth request.
     * @return {!firebase.auth.AuthProvider} The provider instance itself.
     */
    setCustomParameters(
      customOAuthParameters: Object
    ): firebase.auth.AuthProvider;
  }

  /**
   * Generic OAuth provider.
   *
   * @example
   * ```
   * // Using a redirect.
   * firebase.auth().getRedirectResult().then(function(result) {
   *   if (result.credential) {
   *     // This gives you the OAuth Access Token for that provider.
   *     var token = result.credential.accessToken;
   *   }
   *   var user = result.user;
   * });
   *
   * // Start a sign in process for an unauthenticated user.
   * var provider = new firebase.auth.OAuthProvider('google.com');
   * provider.addScope('profile');
   * provider.addScope('email');
   * firebase.auth().signInWithRedirect(provider);
   * ```
   * @example
   * ```
   * // Using a popup.
   * var provider = new firebase.auth.OAuthProvider('google.com');
   * provider.addScope('profile');
   * provider.addScope('email');
   * firebase.auth().signInWithPopup(provider).then(function(result) {
   *  // This gives you the OAuth Access Token for that provider.
   *  var token = result.credential.accessToken;
   *  // The signed-in user info.
   *  var user = result.user;
   * });
   * ```
   *
   * @see {@link firebase.auth.Auth.onAuthStateChanged} to receive sign in state
   * changes.
   * @param {string} providerId The associated provider ID, such as `github.com`.
   */
  class OAuthProvider implements firebase.auth.AuthProvider {
    providerId: string;
    /**
     * @param {string} scope Provider OAuth scope to add.
     */
    addScope(scope: string): firebase.auth.AuthProvider;
    /**
     * Creates a Firebase credential from a generic OAuth provider's access token or
     * ID token.
     *
     * @example
     * ```
     * // `googleUser` from the onsuccess Google Sign In callback.
     * // Initialize a generate OAuth provider with a `google.com` providerId.
     * var provider = new firebase.auth.OAuthProvider('google.com');
     * var credential = provider.credential(
     *     googleUser.getAuthResponse().id_token);
     * firebase.auth().signInWithCredential(credential)
     * ```
     *
     * @param {?string=} idToken The OAuth ID token if OIDC compliant.
     * @param {?string=} accessToken The OAuth access token.
     */
    credential(
      idToken?: string,
      accessToken?: string
    ): firebase.auth.OAuthCredential;
    /**
     * Sets the OAuth custom parameters to pass in an OAuth request for popup
     * and redirect sign-in operations.
     * For a detailed list, check the
     * reserved required OAuth 2.0 parameters such as `client_id`, `redirect_uri`,
     * `scope`, `response_type` and `state` are not allowed and will be ignored.
     * @param {!Object} customOAuthParameters The custom OAuth parameters to pass
     *     in the OAuth request.
     */
    setCustomParameters(
      customOAuthParameters: Object
    ): firebase.auth.AuthProvider;
  }

  class SAMLAuthProvider implements firebase.auth.AuthProvider {
    providerId: string;
  }

  /**
   * Interface representing ID token result obtained from
   * {@link firebase.User.getIdTokenResult}. It contains the ID token JWT string
   * and other helper properties for getting different data associated with the
   * token as well as all the decoded payload claims.
   *
   * Note that these claims are not to be trusted as they are parsed client side.
   * Only server side verification can guarantee the integrity of the token
   * claims.
   */
  interface IdTokenResult {
    /**
     * The Firebase Auth ID token JWT string.
     */
    token: string;
    /**
     * The ID token expiration time formatted as a UTC string.
     */
    expirationTime: string;
    /**
     * The authentication time formatted as a UTC string. This is the time the
     * user authenticated (signed in) and not the time the token was refreshed.
     */
    authTime: string;
    /**
     * The ID token issued at time formatted as a UTC string.
     */
    issuedAtTime: string;
    /**
     * The sign-in provider through which the ID token was obtained (anonymous,
     * custom, phone, password, etc). Note, this does not map to provider IDs.
     */
    signInProvider: string | null;
    /**
     * The entire payload claims of the ID token including the standard reserved
     * claims as well as the custom claims.
     */
    claims: {
      [key: string]: any;
    };
  }

  /**
   * Phone number auth provider.
   *
   * @example
   * ```
   * // 'recaptcha-container' is the ID of an element in the DOM.
   * var applicationVerifier = new firebase.auth.RecaptchaVerifier(
   *     'recaptcha-container');
   * var provider = new firebase.auth.PhoneAuthProvider();
   * provider.verifyPhoneNumber('+16505550101', applicationVerifier)
   *     .then(function(verificationId) {
   *       var verificationCode = window.prompt('Please enter the verification ' +
   *           'code that was sent to your mobile device.');
   *       return firebase.auth.PhoneAuthProvider.credential(verificationId,
   *           verificationCode);
   *     })
   *     .then(function(phoneCredential) {
   *       return firebase.auth().signInWithCredential(phoneCredential);
   *     });
   * ```
   * @param {?firebase.auth.Auth=} auth The Firebase Auth instance in which
   *     sign-ins should occur. Uses the default Auth instance if unspecified.
   */
  class PhoneAuthProvider extends PhoneAuthProvider_Instance {
    static PROVIDER_ID: string;
    /**
     * This corresponds to the sign-in method identifier as returned in
     * {@link firebase.auth.Auth.fetchSignInMethodsForEmail}.
     */
    static PHONE_SIGN_IN_METHOD: string;
    /**
     * Creates a phone auth credential, given the verification ID from
     * {@link firebase.auth.PhoneAuthProvider.verifyPhoneNumber} and the code
     * that was sent to the user's mobile device.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/missing-verification-code</dt>
     * <dd>Thrown if the verification code is missing.</dd>
     * <dt>auth/missing-verification-id</dt>
     * <dd>Thrown if the verification ID is missing.</dd>
     * </dl>
     *
     * @param {string} verificationId The verification ID returned from
     *     {@link firebase.auth.PhoneAuthProvider.verifyPhoneNumber}.
     * @param {string} verificationCode The verification code sent to the user's
     *     mobile device.
     * @return {!firebase.auth.AuthCredential} The auth provider credential.
     */
    static credential(
      verificationId: string,
      verificationCode: string
    ): firebase.auth.AuthCredential;
  }
  /**
   * @hidden
   */
  class PhoneAuthProvider_Instance implements firebase.auth.AuthProvider {
    constructor(auth?: firebase.auth.Auth | null);
    providerId: string;
    /**
     * Starts a phone number authentication flow by sending a verification code to
     * the given phone number. Returns an ID that can be passed to
     * {@link firebase.auth.PhoneAuthProvider.credential} to identify this flow.
     *
     * For abuse prevention, this method also requires a
     * {@link firebase.auth.ApplicationVerifier}. The Firebase Auth SDK includes
     * a reCAPTCHA-based implementation, {@link firebase.auth.RecaptchaVerifier}.
     *
     * <h4>Error Codes</h4>
     * <dl>
     * <dt>auth/captcha-check-failed</dt>
     * <dd>Thrown if the reCAPTCHA response token was invalid, expired, or if
     *     this method was called from a non-whitelisted domain.</dd>
     * <dt>auth/invalid-phone-number</dt>
     * <dd>Thrown if the phone number has an invalid format.</dd>
     * <dt>auth/missing-phone-number</dt>
     * <dd>Thrown if the phone number is missing.</dd>
     * <dt>auth/quota-exceeded</dt>
     * <dd>Thrown if the SMS quota for the Firebase project has been exceeded.</dd>
     * <dt>auth/user-disabled</dt>
     * <dd>Thrown if the user corresponding to the given phone number has been
     *     disabled.</dd>
     * </dl>
     *
     * @param {string} phoneNumber The user's phone number in E.164 format (e.g.
     *     +16505550101).
     * @param {!firebase.auth.ApplicationVerifier} applicationVerifier
     * @return {!firebase.Promise<string>} A Promise for the verification ID.
     */
    verifyPhoneNumber(
      phoneNumber: string,
      applicationVerifier: firebase.auth.ApplicationVerifier
    ): Promise<string>;
  }

  /**
   * An {@link https://www.google.com/recaptcha/ reCAPTCHA}-based application
   * verifier.
   * @param {!Element|string} container The reCAPTCHA container parameter. This
   *     has different meaning depending on whether the reCAPTCHA is hidden or
   *     visible. For a visible reCAPTCHA the container must be empty. If a string
   *     is used, it has to correspond to an element ID. The corresponding element
   *     must also must be in the DOM at the time of initialization.
   * @param {?Object=} parameters The optional reCAPTCHA parameters. Check the
   *     reCAPTCHA docs for a comprehensive list. All parameters are accepted
   *     except for the sitekey. Firebase Auth backend provisions a reCAPTCHA for
   *     each project and will configure this upon rendering. For an invisible
   *     reCAPTCHA, a size key must have the value 'invisible'.
   * @param {?firebase.app.App=} app The corresponding Firebase app. If none is
   *     provided, the default Firebase App instance is used. A Firebase App
   *     instance must be initialized with an API key, otherwise an error will be
   *     thrown.
   */
  class RecaptchaVerifier extends RecaptchaVerifier_Instance {}
  /**
   * @hidden
   */
  class RecaptchaVerifier_Instance
    implements firebase.auth.ApplicationVerifier {
    constructor(
      container: any | string,
      parameters?: Object | null,
      app?: firebase.app.App | null
    );
    /**
     * Clears the reCAPTCHA widget from the page and destroys the current instance.
     */
    clear(): void;
    /**
     * Renders the reCAPTCHA widget on the page.
     * @return {!firebase.Promise<number>} A Promise that resolves with the
     *     reCAPTCHA widget ID.
     */
    render(): Promise<number>;
    /**
     * The application verifier type. For a reCAPTCHA verifier, this is 'recaptcha'.
     */
    type: string;
    /**
     * Waits for the user to solve the reCAPTCHA and resolves with the reCAPTCHA
     * token.
     * @return {!firebase.Promise<string>} A Promise for the reCAPTCHA token.
     */
    verify(): Promise<string>;
  }

  /**
   * Twitter auth provider.
   *
   * @example
   * ```
   * // Using a redirect.
   * firebase.auth().getRedirectResult().then(function(result) {
   *   if (result.credential) {
   *     // For accessing the Twitter API.
   *     var token = result.credential.accessToken;
   *     var secret = result.credential.secret;
   *   }
   *   var user = result.user;
   * });
   *
   * // Start a sign in process for an unauthenticated user.
   * var provider = new firebase.auth.TwitterAuthProvider();
   * firebase.auth().signInWithRedirect(provider);
   * ```
   * @example
   * ```
   * // Using a popup.
   * var provider = new firebase.auth.TwitterAuthProvider();
   * firebase.auth().signInWithPopup(provider).then(function(result) {
   *   // For accessing the Twitter API.
   *   var token = result.credential.accessToken;
   *   var secret = result.credential.secret;
   *   // The signed-in user info.
   *   var user = result.user;
   * });
   * ```
   *
   * @see {@link firebase.auth.Auth.onAuthStateChanged} to receive sign in state
   * changes.
   */
  class TwitterAuthProvider extends TwitterAuthProvider_Instance {
    static PROVIDER_ID: string;
    /**
     * This corresponds to the sign-in method identifier as returned in
     * {@link firebase.auth.Auth.fetchSignInMethodsForEmail}.
     *
     */
    static TWITTER_SIGN_IN_METHOD: string;
    /**
     * @param {string} token Twitter access token.
     * @param {string} secret Twitter secret.
     * @return {!firebase.auth.OAuthCredential} The auth provider credential.
     */
    static credential(
      token: string,
      secret: string
    ): firebase.auth.OAuthCredential;
  }
  /**
   * @hidden
   */
  class TwitterAuthProvider_Instance implements firebase.auth.AuthProvider {
    providerId: string;
    /**
     * Sets the OAuth custom parameters to pass in a Twitter OAuth request for popup
     * and redirect sign-in operations.
     * Valid parameters include 'lang'.
     * Reserved required OAuth 1.0 parameters such as 'oauth_consumer_key',
     * 'oauth_token', 'oauth_signature', etc are not allowed and will be ignored.
     * @param {!Object} customOAuthParameters The custom OAuth parameters to pass
     *     in the OAuth request.
     * @return {!firebase.auth.AuthProvider} The provider instance itself.
     */
    setCustomParameters(
      customOAuthParameters: Object
    ): firebase.auth.AuthProvider;
  }

  /**
   * A structure containing a User, an AuthCredential, the operationType, and
   * any additional user information that was returned from the identity provider.
   * operationType could be 'signIn' for a sign-in operation, 'link' for a linking
   * operation and 'reauthenticate' for a reauthentication operation.
   */
  type UserCredential = {
    additionalUserInfo?: firebase.auth.AdditionalUserInfo | null;
    credential: firebase.auth.AuthCredential | null;
    operationType?: string | null;
    user: firebase.User | null;
  };

  /**
   * Interface representing a user's metadata.
   */
  interface UserMetadata {
    creationTime?: string;
    lastSignInTime?: string;
  }
}

declare namespace firebase.auth.Auth {
  type Persistence = string;
  /**
   * An enumeration of the possible persistence mechanism types.
   */
  var Persistence: {
    /**
     * Indicates that the state will be persisted even when the browser window is
     * closed or the activity is destroyed in react-native.
     */
    LOCAL: Persistence;
    /**
     * Indicates that the state will only be stored in memory and will be cleared
     * when the window or activity is refreshed.
     */
    NONE: Persistence;
    /**
     * Indicates that the state will only persist in current session/tab, relevant
     * to web only, and will be cleared when the tab is closed.
     */
    SESSION: Persistence;
  };
}

declare namespace firebase.database {
  /**
   * A `DataSnapshot` contains data from a Database location.
   *
   * Any time you read data from the Database, you receive the data as a
   * `DataSnapshot`. A `DataSnapshot` is passed to the event callbacks you attach
   * with `on()` or `once()`. You can extract the contents of the snapshot as a
   * JavaScript object by calling the `val()` method. Alternatively, you can
   * traverse into the snapshot by calling `child()` to return child snapshots
   * (which you could then call `val()` on).
   *
   * A `DataSnapshot` is an efficiently generated, immutable copy of the data at
   * a Database location. It cannot be modified and will never change (to modify
   * data, you always call the `set()` method on a `Reference` directly).
   *
   */
  interface DataSnapshot {
    /**
     * Gets another `DataSnapshot` for the location at the specified relative path.
     *
     * Passing a relative path to the `child()` method of a DataSnapshot returns
     * another `DataSnapshot` for the location at the specified relative path. The
     * relative path can either be a simple child name (for example, "ada") or a
     * deeper, slash-separated path (for example, "ada/name/first"). If the child
     * location has no data, an empty `DataSnapshot` (that is, a `DataSnapshot`
     * whose value is `null`) is returned.
     *
     * @example
     * ```
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * // Test for the existence of certain keys within a DataSnapshot
     * var ref = firebase.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var name = snapshot.child("name").val(); // {first:"Ada",last:"Lovelace"}
     *     var firstName = snapshot.child("name/first").val(); // "Ada"
     *     var lastName = snapshot.child("name").child("last").val(); // "Lovelace"
     *     var age = snapshot.child("age").val(); // null
     *   });
     * ```
     *
     * @param {string} path A relative path to the location of child data.
     */
    child(path: string): firebase.database.DataSnapshot;
    /**
     * Returns true if this `DataSnapshot` contains any data. It is slightly more
     * efficient than using `snapshot.val() !== null`.
     *
     * @example
     * ```
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * // Test for the existence of certain keys within a DataSnapshot
     * var ref = firebase.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var a = snapshot.exists();  // true
     *     var b = snapshot.child("name").exists(); // true
     *     var c = snapshot.child("name/first").exists(); // true
     *     var d = snapshot.child("name/middle").exists(); // false
     *   });
     * ```
     *
     * @return {boolean}
     */
    exists(): boolean;
    /**
     * Exports the entire contents of the DataSnapshot as a JavaScript object.
     *
     * The `exportVal()` method is similar to `val()`, except priority information
     * is included (if available), making it suitable for backing up your data.
     *
     * @return {*} The DataSnapshot's contents as a JavaScript value (Object,
     *   Array, string, number, boolean, or `null`).
     */
    exportVal(): any;
    /**
     * Enumerates the top-level children in the `DataSnapshot`.
     *
     * Because of the way JavaScript objects work, the ordering of data in the
     * JavaScript object returned by `val()` is not guaranteed to match the ordering
     * on the server nor the ordering of `child_added` events. That is where
     * `forEach()` comes in handy. It guarantees the children of a `DataSnapshot`
     * will be iterated in their query order.
     *
     * If no explicit `orderBy*()` method is used, results are returned
     * ordered by key (unless priorities are used, in which case, results are
     * returned by priority).
     *
     * @example
     * ```
     * // Assume we have the following data in the Database:
     * {
     *   "users": {
     *     "ada": {
     *       "first": "Ada",
     *       "last": "Lovelace"
     *     },
     *     "alan": {
     *       "first": "Alan",
     *       "last": "Turing"
     *     }
     *   }
     * }
     *
     * // Loop through users in order with the forEach() method. The callback
     * // provided to forEach() will be called synchronously with a DataSnapshot
     * // for each child:
     * var query = firebase.database().ref("users").orderByKey();
     * query.once("value")
     *   .then(function(snapshot) {
     *     snapshot.forEach(function(childSnapshot) {
     *       // key will be "ada" the first time and "alan" the second time
     *       var key = childSnapshot.key;
     *       // childData will be the actual contents of the child
     *       var childData = childSnapshot.val();
     *   });
     * });
     * ```
     *
     * @example
     * ```
     * // You can cancel the enumeration at any point by having your callback
     * // function return true. For example, the following code sample will only
     * // fire the callback function one time:
     * var query = firebase.database().ref("users").orderByKey();
     * query.once("value")
     *   .then(function(snapshot) {
     *     snapshot.forEach(function(childSnapshot) {
     *       var key = childSnapshot.key; // "ada"
     *
     *       // Cancel enumeration
     *       return true;
     *   });
     * });
     * ```
     *
     * @param {function(!firebase.database.DataSnapshot): boolean} action A function
     *   that will be called for each child DataSnapshot. The callback can return
     *   true to cancel further enumeration.
     * @return {boolean} true if enumeration was canceled due to your callback
     *   returning true.
     */
    forEach(
      action: (a: firebase.database.DataSnapshot) => boolean | void
    ): boolean;
    /**
     * Gets the priority value of the data in this `DataSnapshot`.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
     *  Sorting and filtering data}).
     */
    getPriority(): string | number | null;
    /**
     * Returns true if the specified child path has (non-null) data.
     *
     * @example
     * ```
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * // Determine which child keys in DataSnapshot have data.
     * var ref = firebase.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var hasName = snapshot.hasChild("name"); // true
     *     var hasAge = snapshot.hasChild("age"); // false
     *   });
     * ```
     *
     * @param {string} path A relative path to the location of a potential child.
     * @return {boolean} `true` if data exists at the specified child path; else
     *  `false`.
     */
    hasChild(path: string): boolean;
    /**
     * Returns whether or not the `DataSnapshot` has any non-`null` child
     * properties.
     *
     * You can use `hasChildren()` to determine if a `DataSnapshot` has any
     * children. If it does, you can enumerate them using `forEach()`. If it
     * doesn't, then either this snapshot contains a primitive value (which can be
     * retrieved with `val()`) or it is empty (in which case, `val()` will return
     * `null`).
     *
     * @example
     * ```
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * var ref = firebase.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var a = snapshot.hasChildren(); // true
     *     var b = snapshot.child("name").hasChildren(); // true
     *     var c = snapshot.child("name/first").hasChildren(); // false
     *   });
     * ```
     *
     * @return {boolean} true if this snapshot has any children; else false.
     */
    hasChildren(): boolean;
    /**
     * The key (last part of the path) of the location of this `DataSnapshot`.
     *
     * The last token in a Database location is considered its key. For example,
     * "ada" is the key for the /users/ada/ node. Accessing the key on any
     * `DataSnapshot` will return the key for the location that generated it.
     * However, accessing the key on the root URL of a Database will return `null`.
     *
     * @example
     * ```
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * var ref = firebase.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var key = snapshot.key; // "ada"
     *     var childKey = snapshot.child("name/last").key; // "last"
     *   });
     * ```
     *
     * @example
     * ```
     * var rootRef = firebase.database().ref();
     * rootRef.once("value")
     *   .then(function(snapshot) {
     *     var key = snapshot.key; // null
     *     var childKey = snapshot.child("users/ada").key; // "ada"
     *   });
     * ```
     */
    key: string | null;
    /**
     * Returns the number of child properties of this `DataSnapshot`.
     *
     * @example
     * ```
     * // Assume we have the following data in the Database:
     * {
     *   "name": {
     *     "first": "Ada",
     *     "last": "Lovelace"
     *   }
     * }
     *
     * var ref = firebase.database().ref("users/ada");
     * ref.once("value")
     *   .then(function(snapshot) {
     *     var a = snapshot.numChildren(); // 1 ("name")
     *     var b = snapshot.child("name").numChildren(); // 2 ("first", "last")
     *     var c = snapshot.child("name/first").numChildren(); // 0
     *   });
     * ```
     */
    numChildren(): number;
    /**
     * Extracts a JavaScript value from a `DataSnapshot`.
     *
     * Depending on the data in a `DataSnapshot`, the `val()` method may return a
     * scalar type (string, number, or boolean), an array, or an object. It may also
     * return null, indicating that the `DataSnapshot` is empty (contains no data).
     *
     * @example
     * ```
     * // Write and then read back a string from the Database.
     * ref.set("hello")
     *   .then(function() {
     *     return ref.once("value");
     *   })
     *   .then(function(snapshot) {
     *     var data = snapshot.val(); // data === "hello"
     *   });
     * ```
     *
     * @example
     * ```
     * // Write and then read back a JavaScript object from the Database.
     * ref.set({ name: "Ada", age: 36 })
     *   .then(function() {
     *    return ref.once("value");
     *   })
     *   .then(function(snapshot) {
     *     var data = snapshot.val();
     *     // data is { "name": "Ada", "age": 36 }
     *     // data.name === "Ada"
     *     // data.age === 36
     *   });
     * ```
     *
     * @return {*} The DataSnapshot's contents as a JavaScript value (Object,
     *   Array, string, number, boolean, or `null`).
     */
    val(): any;
    /**
     * The `Reference` for the location that generated this `DataSnapshot`.
     */
    ref: firebase.database.Reference;
    /**
     * Returns a JSON-serializable representation of this object.
     */
    toJSON(): Object | null;
  }

  /**
   * The Firebase Database service interface.
   *
   * Do not call this constructor directly. Instead, use
   * {@link firebase.database `firebase.database()`}.
   *
   * See
   * {@link
   *   https://firebase.google.com/docs/database/web/start/
   *   Installation &amp; Setup in JavaScript}
   * for a full guide on how to use the Firebase Database service.
   */
  interface Database {
    /**
     * The {@link firebase.app.App app} associated with the `Database` service
     * instance.
     *
     * @example
     * ```
     * var app = database.app;
     * ```
     */
    app: firebase.app.App;
    /**
     * Disconnects from the server (all Database operations will be completed
     * offline).
     *
     * The client automatically maintains a persistent connection to the Database
     * server, which will remain active indefinitely and reconnect when
     * disconnected. However, the `goOffline()` and `goOnline()` methods may be used
     * to control the client connection in cases where a persistent connection is
     * undesirable.
     *
     * While offline, the client will no longer receive data updates from the
     * Database. However, all Database operations performed locally will continue to
     * immediately fire events, allowing your application to continue behaving
     * normally. Additionally, each operation performed locally will automatically
     * be queued and retried upon reconnection to the Database server.
     *
     * To reconnect to the Database and begin receiving remote events, see
     * `goOnline()`.
     *
     * @example
     * ```
     * firebase.database().goOffline();
     * ```
     */
    goOffline(): any;
    /**
     * Reconnects to the server and synchronizes the offline Database state
     * with the server state.
     *
     * This method should be used after disabling the active connection with
     * `goOffline()`. Once reconnected, the client will transmit the proper data
     * and fire the appropriate events so that your client "catches up"
     * automatically.
     *
     * @example
     * ```
     * firebase.database().goOnline();
     * ```
     */
    goOnline(): any;
    /**
     * Returns a `Reference` representing the location in the Database
     * corresponding to the provided path. If no path is provided, the `Reference`
     * will point to the root of the Database.
     *
     * @example
     * ```
     * // Get a reference to the root of the Database
     * var rootRef = firebase.database().ref();
     * ```
     *
     * @example
     * ```
     * // Get a reference to the /users/ada node
     * var adaRef = firebase.database().ref("users/ada");
     * // The above is shorthand for the following operations:
     * //var rootRef = firebase.database().ref();
     * //var adaRef = rootRef.child("users/ada");
     * ```
     *
     * @param {string=} path Optional path representing the location the returned
     *   `Reference` will point. If not provided, the returned `Reference` will
     *   point to the root of the Database.
     * @return {!firebase.database.Reference} If a path is provided, a `Reference`
     *   pointing to the provided path. Otherwise, a `Reference` pointing to the
     *   root of the Database.
     */
    ref(path?: string): firebase.database.Reference;
    /**
     * Returns a `Reference` representing the location in the Database
     * corresponding to the provided Firebase URL.
     *
     * An exception is thrown if the URL is not a valid Firebase Database URL or it
     * has a different domain than the current `Database` instance.
     *
     * Note that all query parameters (`orderBy`, `limitToLast`, etc.) are ignored
     * and are not applied to the returned `Reference`.
     *
     * @example
     * ```
     * // Get a reference to the root of the Database
     * var rootRef = firebase.database().ref("https://<DATABASE_NAME>.firebaseio.com");
     * ```
     *
     * @example
     * ```
     * // Get a reference to the /users/ada node
     * var adaRef = firebase.database().ref("https://<DATABASE_NAME>.firebaseio.com/users/ada");
     * ```
     *
     * @param {string} url The Firebase URL at which the returned `Reference` will
     *   point.
     * @return {!firebase.database.Reference} A `Reference` pointing to the provided
     *   Firebase URL.
     */
    refFromURL(url: string): firebase.database.Reference;
  }

  /**
   * The `onDisconnect` class allows you to write or clear data when your client
   * disconnects from the Database server. These updates occur whether your
   * client disconnects cleanly or not, so you can rely on them to clean up data
   * even if a connection is dropped or a client crashes.
   *
   * The `onDisconnect` class is most commonly used to manage presence in
   * applications where it is useful to detect how many clients are connected and
   * when other clients disconnect. See
   * {@link
   *   https://firebase.google.com/docs/database/web/offline-capabilities
   *   Enabling Offline Capabilities in JavaScript} for more information.
   *
   * To avoid problems when a connection is dropped before the requests can be
   * transferred to the Database server, these functions should be called before
   * writing any data.
   *
   * Note that `onDisconnect` operations are only triggered once. If you want an
   * operation to occur each time a disconnect occurs, you'll need to re-establish
   * the `onDisconnect` operations each time you reconnect.
   */
  interface OnDisconnect {
    /**
     * Cancels all previously queued `onDisconnect()` set or update events for this
     * location and all children.
     *
     * If a write has been queued for this location via a `set()` or `update()` at a
     * parent location, the write at this location will be canceled, though writes
     * to sibling locations will still occur.
     *
     * @example
     * ```
     * var ref = firebase.database().ref("onlineState");
     * ref.onDisconnect().set(false);
     * // ... sometime later
     * ref.onDisconnect().cancel();
     * ```
     *
     * @param {function(?Error)=} onComplete An optional callback function that will
     *   be called when synchronization to the server has completed. The callback
     *   will be passed a single parameter: null for success, or an Error object
     *   indicating a failure.
     * @return {!firebase.Promise<void>} Resolves when synchronization to the server
     *   is complete.
     */
    cancel(onComplete?: (a: Error | null) => any): Promise<any>;
    /**
     * Ensures the data at this location is deleted when the client is disconnected
     * (due to closing the browser, navigating to a new page, or network issues).
     *
     * @param {function(?Error)=} onComplete An optional callback function that will
     *   be called when synchronization to the server has completed. The callback
     *   will be passed a single parameter: null for success, or an Error object
     *   indicating a failure.
     * @return {!firebase.Promise<void>} Resolves when synchronization to the server
     *   is complete.
     */
    remove(onComplete?: (a: Error | null) => any): Promise<any>;
    /**
     * Ensures the data at this location is set to the specified value when the
     * client is disconnected (due to closing the browser, navigating to a new page,
     * or network issues).
     *
     * `set()` is especially useful for implementing "presence" systems, where a
     * value should be changed or cleared when a user disconnects so that they
     * appear "offline" to other users. See
     * {@link
     *   https://firebase.google.com/docs/database/web/offline-capabilities
     *   Enabling Offline Capabilities in JavaScript} for more information.
     *
     * Note that `onDisconnect` operations are only triggered once. If you want an
     * operation to occur each time a disconnect occurs, you'll need to re-establish
     * the `onDisconnect` operations each time.
     *
     * @example
     * ```
     * var ref = firebase.database().ref("users/ada/status");
     * ref.onDisconnect().set("I disconnected!");
     * ```
     *
     * @param {*} value The value to be written to this location on
     *   disconnect (can be an object, array, string, number, boolean, or null).
     * @param {function(?Error)=} onComplete An optional callback function that
     *   will be called when synchronization to the Database server has completed.
     *   The callback will be passed a single parameter: null for success, or an
     *   `Error` object indicating a failure.
     * @return {!firebase.Promise<void>} Resolves when synchronization to the
     *   Database is complete.
     */
    set(value: any, onComplete?: (a: Error | null) => any): Promise<any>;
    /**
     * Ensures the data at this location is set to the specified value and priority
     * when the client is disconnected (due to closing the browser, navigating to a
     * new page, or network issues).
     */
    setWithPriority(
      value: any,
      priority: number | string | null,
      onComplete?: (a: Error | null) => any
    ): Promise<any>;
    /**
     * Writes multiple values at this location when the client is disconnected (due
     * to closing the browser, navigating to a new page, or network issues).
     *
     * The `values` argument contains multiple property-value pairs that will be
     * written to the Database together. Each child property can either be a simple
     * property (for example, "name") or a relative path (for example, "name/first")
     * from the current location to the data to update.
     *
     * As opposed to the `set()` method, `update()` can be use to selectively update
     * only the referenced properties at the current location (instead of replacing
     * all the child properties at the current location).
     *
     * See more examples using the connected version of
     * {@link firebase.database.Reference.update `update()`}.
     *
     * @example
     * ```
     * var ref = firebase.database().ref("users/ada");
     * ref.update({
     *    onlineState: true,
     *    status: "I'm online."
     * });
     * ref.onDisconnect().update({
     *   onlineState: false,
     *   status: "I'm offline."
     * });
     * ```
     *
     * @param {!Object} values Object containing multiple values.
     * @param {function(?Error)=} onComplete An optional callback function that will
     *   be called when synchronization to the server has completed. The
     *   callback will be passed a single parameter: null for success, or an Error
     *   object indicating a failure.
     * @return {!firebase.Promise<void>} Resolves when synchronization to the
     *   Database is complete.
     */
    update(values: Object, onComplete?: (a: Error | null) => any): Promise<any>;
  }

  type EventType =
    | 'value'
    | 'child_added'
    | 'child_changed'
    | 'child_moved'
    | 'child_removed';

  /**
   * A `Query` sorts and filters the data at a Database location so only a subset
   * of the child data is included. This can be used to order a collection of
   * data by some attribute (for example, height of dinosaurs) as well as to
   * restrict a large list of items (for example, chat messages) down to a number
   * suitable for synchronizing to the client. Queries are created by chaining
   * together one or more of the filter methods defined here.
   *
   * Just as with a `Reference`, you can receive data from a `Query` by using the
   * `on()` method. You will only receive events and `DataSnapshot`s for the
   * subset of the data that matches your query.
   *
   * Read our documentation on
   * {@link
   *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
   *  Sorting and filtering data} for more information.
   */
  interface Query {
    /**
     * Creates a `Query` with the specified ending point.
     *
     * Using `startAt()`, `endAt()`, and `equalTo()` allows you to choose arbitrary
     * starting and ending points for your queries.
     *
     * The ending point is inclusive, so children with exactly the specified value
     * will be included in the query. The optional key argument can be used to
     * further limit the range of the query. If it is specified, then children that
     * have exactly the specified value must also have a key name less than or equal
     * to the specified key.
     *
     * You can read more about `endAt()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * ```
     * // Find all dinosaurs whose names come before Pterodactyl lexicographically.
     * var ref = firebase.database().ref("dinosaurs");
     * ref.orderByKey().endAt("pterodactyl").on("child_added", function(snapshot) {
     *   console.log(snapshot.key);
     * });
     * ```
     *
     * @param {number|string|boolean|null} value The value to end at. The argument
     *   type depends on which `orderBy*()` function was used in this query.
     *   Specify a value that matches the `orderBy*()` type. When used in
     *   combination with `orderByKey()`, the value must be a string.
     * @param {string=} key The child key to end at, among the children with the
     *   previously specified priority. This argument is only allowed if ordering by
     *   child, value, or priority.
     * @return {!firebase.database.Query}
     */
    endAt(
      value: number | string | boolean | null,
      key?: string
    ): firebase.database.Query;
    /**
     * Creates a `Query` that includes children that match the specified value.
     *
     * Using `startAt()`, `endAt()`, and `equalTo()` allows us to choose arbitrary
     * starting and ending points for our queries.
     *
     * The optional key argument can be used to further limit the range of the
     * query. If it is specified, then children that have exactly the specified
     * value must also have exactly the specified key as their key name. This can be
     * used to filter result sets with many matches for the same value.
     *
     * You can read more about `equalTo()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * ```
     * // Find all dinosaurs whose height is exactly 25 meters.
     * var ref = firebase.database().ref("dinosaurs");
     * ref.orderByChild("height").equalTo(25).on("child_added", function(snapshot) {
     *   console.log(snapshot.key);
     * });
     * ```
     *
     * @param {number|string|boolean|null} value The value to match for. The
     *   argument type depends on which `orderBy*()` function was used in this
     *   query. Specify a value that matches the `orderBy*()` type. When used in
     *   combination with `orderByKey()`, the value must be a string.
     * @param {string=} key The child key to start at, among the children with the
     *   previously specified priority. This argument is only allowed if ordering by
     *   child, value, or priority.
     * @return {!firebase.database.Query}
     */
    equalTo(
      value: number | string | boolean | null,
      key?: string
    ): firebase.database.Query;
    /**
     * Returns whether or not the current and provided queries represent the same
     * location, have the same query parameters, and are from the same instance of
     * `firebase.app.App`.
     *
     * Two `Reference` objects are equivalent if they represent the same location
     * and are from the same instance of `firebase.app.App`.
     *
     * Two `Query` objects are equivalent if they represent the same location, have
     * the same query parameters, and are from the same instance of
     * `firebase.app.App`. Equivalent queries share the same sort order, limits, and
     * starting and ending points.
     *
     * @example
     * ```
     * var rootRef = firebase.database.ref();
     * var usersRef = rootRef.child("users");
     *
     * usersRef.isEqual(rootRef);  // false
     * usersRef.isEqual(rootRef.child("users"));  // true
     * usersRef.parent.isEqual(rootRef);  // true
     * ```
     *
     * @example
     * ```
     * var rootRef = firebase.database.ref();
     * var usersRef = rootRef.child("users");
     * var usersQuery = usersRef.limitToLast(10);
     *
     * usersQuery.isEqual(usersRef);  // false
     * usersQuery.isEqual(usersRef.limitToLast(10));  // true
     * usersQuery.isEqual(rootRef.limitToLast(10));  // false
     * usersQuery.isEqual(usersRef.orderByKey().limitToLast(10));  // false
     * ```
     *
     * @param {firebase.database.Query} other The query to compare against.
     * @return {boolean} Whether or not the current and provided queries are
     *   equivalent.
     */
    isEqual(other: firebase.database.Query | null): boolean;
    /**
     * Generates a new `Query` limited to the first specific number of children.
     *
     * The `limitToFirst()` method is used to set a maximum number of children to be
     * synced for a given callback. If we set a limit of 100, we will initially only
     * receive up to 100 `child_added` events. If we have fewer than 100 messages
     * stored in our Database, a `child_added` event will fire for each message.
     * However, if we have over 100 messages, we will only receive a `child_added`
     * event for the first 100 ordered messages. As items change, we will receive
     * `child_removed` events for each item that drops out of the active list so
     * that the total number stays at 100.
     *
     * You can read more about `limitToFirst()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * ```
     * // Find the two shortest dinosaurs.
     * var ref = firebase.database().ref("dinosaurs");
     * ref.orderByChild("height").limitToFirst(2).on("child_added", function(snapshot) {
     *   // This will be called exactly two times (unless there are less than two
     *   // dinosaurs in the Database).
     *
     *   // It will also get fired again if one of the first two dinosaurs is
     *   // removed from the data set, as a new dinosaur will now be the second
     *   // shortest.
     *   console.log(snapshot.key);
     * });
     * ```
     *
     * @param {number} limit The maximum number of nodes to include in this query.
     * @return {!firebase.database.Query}
     */
    limitToFirst(limit: number): firebase.database.Query;
    /**
     * Generates a new `Query` object limited to the last specific number of
     * children.
     *
     * The `limitToLast()` method is used to set a maximum number of children to be
     * synced for a given callback. If we set a limit of 100, we will initially only
     * receive up to 100 `child_added` events. If we have fewer than 100 messages
     * stored in our Database, a `child_added` event will fire for each message.
     * However, if we have over 100 messages, we will only receive a `child_added`
     * event for the last 100 ordered messages. As items change, we will receive
     * `child_removed` events for each item that drops out of the active list so
     * that the total number stays at 100.
     *
     * You can read more about `limitToLast()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * ```
     * // Find the two heaviest dinosaurs.
     * var ref = firebase.database().ref("dinosaurs");
     * ref.orderByChild("weight").limitToLast(2).on("child_added", function(snapshot) {
     *   // This callback will be triggered exactly two times, unless there are
     *   // fewer than two dinosaurs stored in the Database. It will also get fired
     *   // for every new, heavier dinosaur that gets added to the data set.
     *   console.log(snapshot.key);
     * });
     * ```
     *
     * @param {number} limit The maximum number of nodes to include in this query.
     * @return {!firebase.database.Query}
     */
    limitToLast(limit: number): firebase.database.Query;
    /**
     * Detaches a callback previously attached with `on()`.
     *
     * Detach a callback previously attached with `on()`. Note that if `on()` was
     * called multiple times with the same eventType and callback, the callback
     * will be called multiple times for each event, and `off()` must be called
     * multiple times to remove the callback. Calling `off()` on a parent listener
     * will not automatically remove listeners registered on child nodes, `off()`
     * must also be called on any child listeners to remove the callback.
     *
     * If a callback is not specified, all callbacks for the specified eventType
     * will be removed. Similarly, if no eventType or callback is specified, all
     * callbacks for the `Reference` will be removed.
     *
     * @example
     * ```
     * var onValueChange = function(dataSnapshot) {  ... };
     * ref.on('value', onValueChange);
     * ref.child('meta-data').on('child_added', onChildAdded);
     * // Sometime later...
     * ref.off('value', onValueChange);
     *
     * // You must also call off() for any child listeners on ref
     * // to cancel those callbacks
     * ref.child('meta-data').off('child_added', onValueAdded);
     * ```
     *
     * @example
     * ```
     * // Or you can save a line of code by using an inline function
     * // and on()'s return value.
     * var onValueChange = ref.on('value', function(dataSnapshot) { ... });
     * // Sometime later...
     * ref.off('value', onValueChange);
     * ```
     *
     * @param {string=} eventType One of the following strings: "value",
     *   "child_added", "child_changed", "child_removed", or "child_moved."
     * @param {function(!firebase.database.DataSnapshot, ?string=)=} callback The
     *   callback function that was passed to `on()`.
     * @param {Object=} context The context that was passed to `on()`.
     */
    off(
      eventType?: EventType,
      callback?: (a: firebase.database.DataSnapshot, b?: string | null) => any,
      context?: Object | null
    ): any;

    /**
     * Listens for data changes at a particular location.
     *
     * This is the primary way to read data from a Database. Your callback
     * will be triggered for the initial data and again whenever the data changes.
     * Use `off( )` to stop receiving updates. See
     * {@link https://firebase.google.com/docs/database/web/retrieve-data
     *   Retrieve Data on the Web}
     * for more details.
     *
     * <h4>value event</h4>
     *
     * This event will trigger once with the initial data stored at this location,
     * and then trigger again each time the data changes. The `DataSnapshot` passed
     * to the callback will be for the location at which `on()` was called. It
     * won't trigger until the entire contents has been synchronized. If the
     * location has no data, it will be triggered with an empty `DataSnapshot`
     * (`val()` will return `null`).
     *
     * <h4>child_added event</h4>
     *
     * This event will be triggered once for each initial child at this location,
     * and it will be triggered again every time a new child is added. The
     * `DataSnapshot` passed into the callback will reflect the data for the
     * relevant child. For ordering purposes, it is passed a second argument which
     * is a string containing the key of the previous sibling child by sort order,
     * or `null` if it is the first child.
     *
     * <h4>child_removed event</h4>
     *
     * This event will be triggered once every time a child is removed. The
     * `DataSnapshot` passed into the callback will be the old data for the child
     * that was removed. A child will get removed when either:
     *
     * - a client explicitly calls `remove()` on that child or one of its ancestors
     * - a client calls `set(null)` on that child or one of its ancestors
     * - that child has all of its children removed
     * - there is a query in effect which now filters out the child (because it's
     *   sort order changed or the max limit was hit)
     *
     * <h4>child_changed event</h4>
     *
     * This event will be triggered when the data stored in a child (or any of its
     * descendants) changes. Note that a single `child_changed` event may represent
     * multiple changes to the child. The `DataSnapshot` passed to the callback will
     * contain the new child contents. For ordering purposes, the callback is also
     * passed a second argument which is a string containing the key of the previous
     * sibling child by sort order, or `null` if it is the first child.
     *
     * <h4>child_moved event</h4>
     *
     * This event will be triggered when a child's sort order changes such that its
     * position relative to its siblings changes. The `DataSnapshot` passed to the
     * callback will be for the data of the child that has moved. It is also passed
     * a second argument which is a string containing the key of the previous
     * sibling child by sort order, or `null` if it is the first child.
     *
     * @example **Handle a new value:**
     * ```
     * ref.on('value', function(dataSnapshot) {
     *   ...
     * });
     * ```
     *
     * @example **Handle a new child:**
     * ```
     * ref.on('child_added', function(childSnapshot, prevChildKey) {
     *   ...
     * });
     * ```
     *
     * @example **Handle child removal:**
     * ```
     * ref.on('child_removed', function(oldChildSnapshot) {
     *   ...
     * });
     * ```
     *
     * @example **Handle child data changes:**
     * ```
     * ref.on('child_changed', function(childSnapshot, prevChildKey) {
     *   ...
     * });
     * ```
     *
     * @example **Handle child ordering changes:**
     * ```
     * ref.on('child_moved', function(childSnapshot, prevChildKey) {
     *   ...
     * });
     * ```
     *
     * @param {string} eventType One of the following strings: "value",
     *   "child_added", "child_changed", "child_removed", or "child_moved."
     * @param {!function(firebase.database.DataSnapshot, string=)} callback A
     *   callback that fires when the specified event occurs. The callback will be
     *   passed a DataSnapshot. For ordering purposes, "child_added",
     *   "child_changed", and "child_moved" will also be passed a string containing
     *   the key of the previous child, by sort order, or `null` if it is the
     *   first child.
     * @param {(function(Error)|Object)=} cancelCallbackOrContext An optional
     *   callback that will be notified if your event subscription is ever canceled
     *   because your client does not have permission to read this data (or it had
     *   permission but has now lost it). This callback will be passed an `Error`
     *   object indicating why the failure occurred.
     * @param {Object=} context If provided, this object will be used as `this`
     *   when calling your callback(s).
     * @return {!function(firebase.database.DataSnapshot, string=)} The provided
     *   callback function is returned unmodified. This is just for convenience if
     *   you want to pass an inline function to `on()` but store the callback
     *   function for later passing to `off()`.
     */
    on(
      eventType: EventType,
      callback: (a: firebase.database.DataSnapshot | null, b?: string) => any,
      cancelCallbackOrContext?: Object | null,
      context?: Object | null
    ): (a: firebase.database.DataSnapshot | null, b?: string) => any;

    /**
     * Listens for exactly one event of the specified event type, and then stops
     * listening.
     *
     * This is equivalent to calling {@link firebase.database.Query.on `on()`}, and
     * then calling {@link firebase.database.Query.off `off()`} inside the callback
     * function. See {@link firebase.database.Query.on `on()`} for details on the
     * event types.
     *
     * @example
     * ```
     * // Basic usage of .once() to read the data located at ref.
     * ref.once('value')
     *   .then(function(dataSnapshot) {
     *     // handle read data.
     *   });
     * ```
     *
     * @param {string} eventType One of the following strings: "value",
     *   "child_added", "child_changed", "child_removed", or "child_moved."
     * @param {function(!firebase.database.DataSnapshot, string=)=} successCallback A
     *   callback that fires when the specified event occurs. The callback will be
     *   passed a DataSnapshot. For ordering purposes, "child_added",
     *   "child_changed", and "child_moved" will also be passed a string containing
     *   the key of the previous child by sort order, or `null` if it is the
     *   first child.
     * @param {(function(Error)|Object)=} failureCallbackOrContext An optional
     *   callback that will be notified if your client does not have permission to
     *   read the data. This callback will be passed an `Error` object indicating
     *   why the failure occurred.
     * @param {Object=} context If provided, this object will be used as `this`
     *   when calling your callback(s).
     * @return {!firebase.Promise<*>}
     */
    once(
      eventType: EventType,
      successCallback?: (a: firebase.database.DataSnapshot, b?: string) => any,
      failureCallbackOrContext?: Object | null,
      context?: Object | null
    ): Promise<DataSnapshot>;
    /**
     * Generates a new `Query` object ordered by the specified child key.
     *
     * Queries can only order by one key at a time. Calling `orderByChild()`
     * multiple times on the same query is an error.
     *
     * Firebase queries allow you to order your data by any child key on the fly.
     * However, if you know in advance what your indexes will be, you can define
     * them via the .indexOn rule in your Security Rules for better performance. See
     * the {@link https://firebase.google.com/docs/database/security/indexing-data
     * .indexOn} rule for more information.
     *
     * You can read more about `orderByChild()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
     *  Sort data}.
     *
     * @example
     * ```
     * var ref = firebase.database().ref("dinosaurs");
     * ref.orderByChild("height").on("child_added", function(snapshot) {
     *   console.log(snapshot.key + " was " + snapshot.val().height + " m tall");
     * });
     * ```
     */
    orderByChild(path: string): firebase.database.Query;
    /**
     * Generates a new `Query` object ordered by key.
     *
     * Sorts the results of a query by their (ascending) key values.
     *
     * You can read more about `orderByKey()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
     *  Sort data}.
     *
     * @example
     * ```
     * var ref = firebase.database().ref("dinosaurs");
     * ref.orderByKey().on("child_added", function(snapshot) {
     *   console.log(snapshot.key);
     * });
     * ```
     */
    orderByKey(): firebase.database.Query;
    /**
     * Generates a new `Query` object ordered by priority.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
     *  Sort data} for alternatives to priority.
     */
    orderByPriority(): firebase.database.Query;
    /**
     * Generates a new `Query` object ordered by value.
     *
     * If the children of a query are all scalar values (string, number, or
     * boolean), you can order the results by their (ascending) values.
     *
     * You can read more about `orderByValue()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sort_data
     *  Sort data}.
     *
     * @example
     * ```
     * var scoresRef = firebase.database().ref("scores");
     * scoresRef.orderByValue().limitToLast(3).on("value", function(snapshot) {
     *   snapshot.forEach(function(data) {
     *     console.log("The " + data.key + " score is " + data.val());
     *   });
     * });
     * ```
     */
    orderByValue(): firebase.database.Query;
    /**
     * Returns a `Reference` to the `Query`'s location.
     */
    ref: firebase.database.Reference;
    /**
     * Creates a `Query` with the specified starting point.
     *
     * Using `startAt()`, `endAt()`, and `equalTo()` allows you to choose arbitrary
     * starting and ending points for your queries.
     *
     * The starting point is inclusive, so children with exactly the specified value
     * will be included in the query. The optional key argument can be used to
     * further limit the range of the query. If it is specified, then children that
     * have exactly the specified value must also have a key name greater than or
     * equal to the specified key.
     *
     * You can read more about `startAt()` in
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#filtering_data
     *  Filtering data}.
     *
     * @example
     * ```
     * // Find all dinosaurs that are at least three meters tall.
     * var ref = firebase.database().ref("dinosaurs");
     * ref.orderByChild("height").startAt(3).on("child_added", function(snapshot) {
     *   console.log(snapshot.key)
     * });
     * ```
     *
     * @param {number|string|boolean|null} value The value to start at. The argument
     *   type depends on which `orderBy*()` function was used in this query.
     *   Specify a value that matches the `orderBy*()` type. When used in
     *   combination with `orderByKey()`, the value must be a string.
     * @param {string=} key The child key to start at. This argument is only allowed
     *   if ordering by child, value, or priority.
     * @return {!firebase.database.Query}
     */
    startAt(
      value: number | string | boolean | null,
      key?: string
    ): firebase.database.Query;
    /**
     * Returns a JSON-serializable representation of this object.
     *
     * @return {!Object} A JSON-serializable representation of this object.
     */
    toJSON(): Object;
    /**
     * Gets the absolute URL for this location.
     *
     * The `toString()` method returns a URL that is ready to be put into a browser,
     * curl command, or a `firebase.database().refFromURL()` call. Since all of
     * those expect the URL to be url-encoded, `toString()` returns an encoded URL.
     *
     * Append '.json' to the returned URL when typed into a browser to download
     * JSON-formatted data. If the location is secured (that is, not publicly
     * readable), you will get a permission-denied error.
     *
     * @example
     * ```
     * // Calling toString() on a root Firebase reference returns the URL where its
     * // data is stored within the Database:
     * var rootRef = firebase.database().ref();
     * var rootUrl = rootRef.toString();
     * // rootUrl === "https://sample-app.firebaseio.com/".
     *
     * // Calling toString() at a deeper Firebase reference returns the URL of that
     * // deep path within the Database:
     * var adaRef = rootRef.child('users/ada');
     * var adaURL = adaRef.toString();
     * // adaURL === "https://sample-app.firebaseio.com/users/ada".
     * ```
     *
     * @return {string} The absolute URL for this location.
     */
    toString(): string;
  }

  /**
   * A `Reference` represents a specific location in your Database and can be used
   * for reading or writing data to that Database location.
   *
   * You can reference the root or child location in your Database by calling
   * `firebase.database().ref()` or `firebase.database().ref("child/path")`.
   *
   * Writing is done with the `set()` method and reading can be done with the
   * `on()` method. See
   * {@link
   *   https://firebase.google.com/docs/database/web/read-and-write
   *   Read and Write Data on the Web}
   */
  interface Reference extends firebase.database.Query {
    /**
     * Gets a `Reference` for the location at the specified relative path.
     *
     * The relative path can either be a simple child name (for example, "ada") or
     * a deeper slash-separated path (for example, "ada/name/first").
     *
     * @example
     * ```
     * var usersRef = firebase.database().ref('users');
     * var adaRef = usersRef.child('ada');
     * var adaFirstNameRef = adaRef.child('name/first');
     * var path = adaFirstNameRef.toString();
     * // path is now 'https://sample-app.firebaseio.com/users/ada/name/first'
     * ```
     *
     * @param {string} path A relative path from this location to the desired child
     *   location.
     * @return {!firebase.database.Reference} The specified child location.
     */
    child(path: string): firebase.database.Reference;
    /**
     * The last part of the `Reference`'s path.
     *
     * For example, `"ada"` is the key for
     * `https://<DATABASE_NAME>.firebaseio.com/users/ada`.
     *
     * The key of a root `Reference` is `null`.
     *
     * @example
     * ```
     * // The key of a root reference is null
     * var rootRef = firebase.database().ref();
     * var key = rootRef.key;  // key === null
     * ```
     *
     * @example
     * ```
     * // The key of any non-root reference is the last token in the path
     * var adaRef = firebase.database().ref("users/ada");
     * var key = adaRef.key;  // key === "ada"
     * key = adaRef.child("name/last").key;  // key === "last"
     * ```
     */
    key: string | null;
    /**
     * Returns an `OnDisconnect` object - see
     * {@link
     *   https://firebase.google.com/docs/database/web/offline-capabilities
     *   Enabling Offline Capabilities in JavaScript} for more information on how
     * to use it.
     */
    onDisconnect(): firebase.database.OnDisconnect;
    /**
     * The parent location of a `Reference`.
     *
     * The parent of a root `Reference` is `null`.
     *
     * @example
     * ```
     * // The parent of a root reference is null
     * var rootRef = firebase.database().ref();
     * parent = rootRef.parent;  // parent === null
     * ```
     *
     * @example
     * ```
     * // The parent of any non-root reference is the parent location
     * var usersRef = firebase.database().ref("users");
     * var adaRef = firebase.database().ref("users/ada");
     * // usersRef and adaRef.parent represent the same location
     * ```
     */
    parent: firebase.database.Reference | null;
    /**
     * Generates a new child location using a unique key and returns its
     * `Reference`.
     *
     * This is the most common pattern for adding data to a collection of items.
     *
     * If you provide a value to `push()`, the value will be written to the
     * generated location. If you don't pass a value, nothing will be written to the
     * Database and the child will remain empty (but you can use the `Reference`
     * elsewhere).
     *
     * The unique key generated by `push()` are ordered by the current time, so the
     * resulting list of items will be chronologically sorted. The keys are also
     * designed to be unguessable (they contain 72 random bits of entropy).
     *
     *
     * See
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#append_to_a_list_of_data
     *  Append to a list of data}
     * </br>See
     * {@link
     *  https://firebase.googleblog.com/2015/02/the-2120-ways-to-ensure-unique_68.html
     *  The 2^120 Ways to Ensure Unique Identifiers}
     *
     * @example
     * ```
     * var messageListRef = firebase.database().ref('message_list');
     * var newMessageRef = messageListRef.push();
     * newMessageRef.set({
     *   'user_id': 'ada',
     *   'text': 'The Analytical Engine weaves algebraical patterns just as the Jacquard loom weaves flowers and leaves.'
     * });
     * // We've appended a new message to the message_list location.
     * var path = newMessageRef.toString();
     * // path will be something like
     * // 'https://sample-app.firebaseio.com/message_list/-IKo28nwJLH0Nc5XeFmj'
     * ```
     *
     * @param {*=} value Optional value to be written at the generated location.
     * @param {function(?Error)=} onComplete Callback called when write to server is
     *   complete.
     * @return {!firebase.database.ThenableReference} Combined `Promise` and
     *   `Reference`; resolves when write is complete, but can be used immediately
     *   as the `Reference` to the child location.
     */
    push(
      value?: any,
      onComplete?: (a: Error | null) => any
    ): firebase.database.ThenableReference;
    /**
     * Removes the data at this Database location.
     *
     * Any data at child locations will also be deleted.
     *
     * The effect of the remove will be visible immediately and the corresponding
     * event 'value' will be triggered. Synchronization of the remove to the
     * Firebase servers will also be started, and the returned Promise will resolve
     * when complete. If provided, the onComplete callback will be called
     * asynchronously after synchronization has finished.
     *
     * @example
     * ```
     * var adaRef = firebase.database().ref('users/ada');
     * adaRef.remove()
     *   .then(function() {
     *     console.log("Remove succeeded.")
     *   })
     *   .catch(function(error) {
     *     console.log("Remove failed: " + error.message)
     *   });
     * ```
     *
     * @param {function(?Error)=} onComplete Callback called when write to server is
     *   complete.
     * @return {!firebase.Promise<void>} Resolves when remove on server is complete.
     */
    remove(onComplete?: (a: Error | null) => any): Promise<any>;
    /**
     * The root `Reference` of the Database.
     *
     * @example
     * ```
     * // The root of a root reference is itself
     * var rootRef = firebase.database().ref();
     * // rootRef and rootRef.root represent the same location
     * ```
     *
     * @example
     * ```
     * // The root of any non-root reference is the root location
     * var adaRef = firebase.database().ref("users/ada");
     * // rootRef and adaRef.root represent the same location
     * ```
     */
    root: firebase.database.Reference;
    /**
     * Writes data to this Database location.
     *
     * This will overwrite any data at this location and all child locations.
     *
     * The effect of the write will be visible immediately, and the corresponding
     * events ("value", "child_added", etc.) will be triggered. Synchronization of
     * the data to the Firebase servers will also be started, and the returned
     * Promise will resolve when complete. If provided, the `onComplete` callback
     * will be called asynchronously after synchronization has finished.
     *
     * Passing `null` for the new value is equivalent to calling `remove()`; namely,
     * all data at this location and all child locations will be deleted.
     *
     * `set()` will remove any priority stored at this location, so if priority is
     * meant to be preserved, you need to use `setWithPriority()` instead.
     *
     * Note that modifying data with `set()` will cancel any pending transactions
     * at that location, so extreme care should be taken if mixing `set()` and
     * `transaction()` to modify the same data.
     *
     * A single `set()` will generate a single "value" event at the location where
     * the `set()` was performed.
     *
     * @example
     * ```
     * var adaNameRef = firebase.database().ref('users/ada/name');
     * adaNameRef.child('first').set('Ada');
     * adaNameRef.child('last').set('Lovelace');
     * // We've written 'Ada' to the Database location storing Ada's first name,
     * // and 'Lovelace' to the location storing her last name.
     * ```
     *
     * @example
     * ```
     * adaNameRef.set({ first: 'Ada', last: 'Lovelace' });
     * // Exact same effect as the previous example, except we've written
     * // Ada's first and last name simultaneously.
     * ```
     *
     * @example
     * ```
     * adaNameRef.set({ first: 'Ada', last: 'Lovelace' })
     *   .then(function() {
     *     console.log('Synchronization succeeded');
     *   })
     *   .catch(function(error) {
     *     console.log('Synchronization failed');
     *   });
     * // Same as the previous example, except we will also log a message
     * // when the data has finished synchronizing.
     * ```
     *
     * @param {*} value The value to be written (string, number, boolean, object,
     *   array, or null).
     * @param {function(?Error)=} onComplete Callback called when write to server is
     *   complete.
     * @return {!firebase.Promise<void>} Resolves when write to server is complete.
     */
    set(value: any, onComplete?: (a: Error | null) => any): Promise<any>;
    /**
     * Sets a priority for the data at this Database location.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
     *  Sorting and filtering data}).
     */
    setPriority(
      priority: string | number | null,
      onComplete: (a: Error | null) => any
    ): Promise<any>;
    /**
     * Writes data the Database location. Like `set()` but also specifies the
     * priority for that data.
     *
     * Applications need not use priority but can order collections by
     * ordinary properties (see
     * {@link
     *  https://firebase.google.com/docs/database/web/lists-of-data#sorting_and_filtering_data
     *  Sorting and filtering data}).
     */
    setWithPriority(
      newVal: any,
      newPriority: string | number | null,
      onComplete?: (a: Error | null) => any
    ): Promise<any>;
    /**
     * Atomically modifies the data at this location.
     *
     * Atomically modify the data at this location. Unlike a normal `set()`, which
     * just overwrites the data regardless of its previous value, `transaction()` is
     * used to modify the existing value to a new value, ensuring there are no
     * conflicts with other clients writing to the same location at the same time.
     *
     * To accomplish this, you pass `transaction()` an update function which is used
     * to transform the current value into a new value. If another client writes to
     * the location before your new value is successfully written, your update
     * function will be called again with the new current value, and the write will
     * be retried. This will happen repeatedly until your write succeeds without
     * conflict or you abort the transaction by not returning a value from your
     * update function.
     *
     * Note: Modifying data with `set()` will cancel any pending transactions at
     * that location, so extreme care should be taken if mixing `set()` and
     * `transaction()` to update the same data.
     *
     * Note: When using transactions with Security and Firebase Rules in place, be
     * aware that a client needs `.read` access in addition to `.write` access in
     * order to perform a transaction. This is because the client-side nature of
     * transactions requires the client to read the data in order to transactionally
     * update it.
     *
     * @example
     * ```
     * // Increment Ada's rank by 1.
     * var adaRankRef = firebase.database().ref('users/ada/rank');
     * adaRankRef.transaction(function(currentRank) {
     *   // If users/ada/rank has never been set, currentRank will be `null`.
     *   return currentRank + 1;
     * });
     * ```
     *
     * @example
     * ```
     * // Try to create a user for ada, but only if the user id 'ada' isn't
     * // already taken
     * var adaRef = firebase.database().ref('users/ada');
     * adaRef.transaction(function(currentData) {
     *   if (currentData === null) {
     *     return { name: { first: 'Ada', last: 'Lovelace' } };
     *   } else {
     *     console.log('User ada already exists.');
     *     return; // Abort the transaction.
     *   }
     * }, function(error, committed, snapshot) {
     *   if (error) {
     *     console.log('Transaction failed abnormally!', error);
     *   } else if (!committed) {
     *     console.log('We aborted the transaction (because ada already exists).');
     *   } else {
     *     console.log('User ada added!');
     *   }
     *   console.log("Ada's data: ", snapshot.val());
     * });
     * ```
     *
     * @param {function(*): *} transactionUpdate A developer-supplied function which
     *   will be passed the current data stored at this location (as a JavaScript
     *   object). The function should return the new value it would like written (as
     *   a JavaScript object). If `undefined` is returned (i.e. you return with no
     *   arguments) the transaction will be aborted and the data at this location
     *   will not be modified.
     * @param {(function(?Error, boolean,
     *                   ?firebase.database.DataSnapshot))=} onComplete A callback
     *   function that will be called when the transaction completes. The callback
     *   is passed three arguments: a possibly-null `Error`, a `boolean` indicating
     *   whether the transaction was committed, and a `DataSnapshot` indicating the
     *   final result. If the transaction failed abnormally, the first argument will
     *   be an `Error` object indicating the failure cause. If the transaction
     *   finished normally, but no data was committed because no data was returned
     *   from `transactionUpdate`, then second argument will be false. If the
     *   transaction completed and committed data to Firebase, the second argument
     *   will be true. Regardless, the third argument will be a `DataSnapshot`
     *   containing the resulting data in this location.
     * @param {boolean=} applyLocally By default, events are raised each time the
     *   transaction update function runs. So if it is run multiple times, you may
     *   see intermediate states. You can set this to false to suppress these
     *   intermediate states and instead wait until the transaction has completed
     *   before events are raised.
     * @return {!firebase.Promise<{
     *   committed: boolean,
     *   snapshot: ?firebase.database.DataSnapshot
     * }>} Returns a Promise that can optionally be used instead of the onComplete
     *   callback to handle success and failure.
     */
    transaction(
      transactionUpdate: (a: any) => any,
      onComplete?: (
        a: Error | null,
        b: boolean,
        c: firebase.database.DataSnapshot | null
      ) => any,
      applyLocally?: boolean
    ): Promise<any>;
    /**
     * Writes multiple values to the Database at once.
     *
     * The `values` argument contains multiple property-value pairs that will be
     * written to the Database together. Each child property can either be a simple
     * property (for example, "name") or a relative path (for example,
     * "name/first") from the current location to the data to update.
     *
     * As opposed to the `set()` method, `update()` can be use to selectively update
     * only the referenced properties at the current location (instead of replacing
     * all the child properties at the current location).
     *
     * The effect of the write will be visible immediately, and the corresponding
     * events ('value', 'child_added', etc.) will be triggered. Synchronization of
     * the data to the Firebase servers will also be started, and the returned
     * Promise will resolve when complete. If provided, the `onComplete` callback
     * will be called asynchronously after synchronization has finished.
     *
     * A single `update()` will generate a single "value" event at the location
     * where the `update()` was performed, regardless of how many children were
     * modified.
     *
     * Note that modifying data with `update()` will cancel any pending
     * transactions at that location, so extreme care should be taken if mixing
     * `update()` and `transaction()` to modify the same data.
     *
     * Passing `null` to `update()` will remove the data at this location.
     *
     * See
     * {@link
     *  https://firebase.googleblog.com/2015/09/introducing-multi-location-updates-and_86.html
     *  Introducing multi-location updates and more}.
     *
     * @example
     * ```
     * var adaNameRef = firebase.database().ref('users/ada/name');
     * // Modify the 'first' and 'last' properties, but leave other data at
     * // adaNameRef unchanged.
     * adaNameRef.update({ first: 'Ada', last: 'Lovelace' });
     * ```
     *
     * @param {!Object} values Object containing multiple values.
     * @param {function(?Error)=} onComplete Callback called when write to server is
     *   complete.
     * @return {!firebase.Promise<void>} Resolves when update on server is complete.
     */
    update(values: Object, onComplete?: (a: Error | null) => any): Promise<any>;
  }

  interface ThenableReference
    extends firebase.database.Reference,
      Promise<Reference> {}

  /**
   * Logs debugging information to the console.
   *
   * @example
   * ```
   * // Enable logging
   * firebase.database.enableLogging(true);
   * ```
   *
   * @example
   * ```
   * // Disable logging
   * firebase.database.enableLogging(false);
   * ```
   *
   * @example
   * ```
   * // Enable logging across page refreshes
   * firebase.database.enableLogging(true, true);
   * ```
   *
   * @example
   * ```
   * // Provide custom logger which prefixes log statements with "[FIREBASE]"
   * firebase.database.enableLogging(function(message) {
   *   console.log("[FIREBASE]", message);
   * });
   * ```
   *
   * @param {(boolean|function(string))=} logger Enables logging if `true`;
   *   disables logging if `false`. You can also provide a custom logger function
   *   to control how things get logged.
   * @param {boolean=} persistent Remembers the logging state between page
   *   refreshes if `true`.
   */
  function enableLogging(
    logger?: boolean | ((a: string) => any),
    persistent?: boolean
  ): any;
}

declare namespace firebase.database.ServerValue {
  /**
   * A placeholder value for auto-populating the current timestamp (time
   * since the Unix epoch, in milliseconds) as determined by the Firebase
   * servers.
   *
   * @example
   * ```
   * var sessionsRef = firebase.database().ref("sessions");
   * sessionsRef.push({
   *   startedAt: firebase.database.ServerValue.TIMESTAMP
   * });
   * ```
   */
  var TIMESTAMP: Object;
}

declare namespace firebase.messaging {
  /**
   * The Firebase Messaging service interface.
   *
   * Do not call this constructor directly. Instead, use
   * {@link firebase.messaging `firebase.messaging()`}.
   *
   * See
   * {@link
   *   https://firebase.google.com/docs/cloud-messaging/js/client
   *   Set Up a JavaScript Firebase Cloud Messaging Client App}
   * for a full guide on how to use the Firebase Messaging service.
   *
   */
  interface Messaging {
    /**
     * To forceably stop a registration token from being used, delete it
     * by calling this method.
     *
     * @param {!string} token The token to delete.
     * @return {firebase.Promise} The promise resolves when the token has been
     *   successfully deleted.
     */
    deleteToken(token: string): Promise<boolean>;
    /**
     * After calling `requestPermission()` you can call this method to get an FCM
     * registration token that can be used to send push messages to this user.
     *
     * @return {firebase.Promise<string>} The promise resolves if an FCM token can
     *   be retrieved. This method returns null if the current origin does not have
     *   permission to show notifications.
     */
    getToken(): Promise<string | null>;
    /**
     * When a push message is received and the user is currently on a page
     * for your origin, the message is passed to the page and an `onMessage()`
     * event is dispatched with the payload of the push message.
     *
     * NOTE: These events are dispatched when you have called
     * `setBackgroundMessageHandler()` in your service worker.
     *
     * @param {!firebase.Observer<Object, void>|!function(!Object)}
     *     nextOrObserver This function, or observer object with `next` defined,
     *     is called when a message is received and the user is currently viewing your page.
     * @return {firebase.Unsubscribe} To stop listening for messages
     *    execute this returned function.
     */
    onMessage(
      nextOrObserver: firebase.NextFn<any> | firebase.Observer<any>,
      error?: firebase.ErrorFn,
      completed?: firebase.CompleteFn
    ): firebase.Unsubscribe;
    /**
     * You should listen for token refreshes so your web app knows when FCM
     * has invalidated your existing token and you need to call `getToken()`
     * to get a new token.
     *
     * @param {!firebase.Observer<Object, void>|!function(!Object)}
     *     nextOrObserver This function, or observer object with `next` defined,
     *     is called when a token refresh has occurred.
     * @return {firebase.Unsubscribe} To stop listening for token
     *   refresh events execute this returned function.
     */
    onTokenRefresh(
      nextOrObserver: firebase.NextFn<any> | firebase.Observer<any>,
      error?: firebase.ErrorFn,
      completed?: firebase.CompleteFn
    ): firebase.Unsubscribe;
    /**
     * Notification permissions are required to send a user push messages.
     * Calling this method displays the permission dialog to the user and
     * resolves if the permission is granted.
     *
     * @return {firebase.Promise} The promise resolves if permission is
     *   granted. Otherwise, the promise is rejected with an error.
     */
    requestPermission(): Promise<void>;
    /**
     * FCM directs push messages to your web page's `onMessage()` callback
     * if the user currently has it open. Otherwise, it calls
     * your callback passed into `setBackgroundMessageHandler()`.
     *
     * Your callback should return a promise that, once resolved, has
     * shown a notification.
     *
     * @param {!function(!Object)} callback The function to handle the push message.
     */
    setBackgroundMessageHandler(
      callback: (payload: any) => Promise<any> | void
    ): void;
    /**
     * To use your own service worker for receiving push messages, you
     * can pass in your service worker registration in this method.
     *
     * @param {!ServiceWorkerRegistration} registration The service worker
     *   registration you wish to use for push messaging.
     */
    useServiceWorker(registration: ServiceWorkerRegistration): void;
    usePublicVapidKey(b64PublicKey: string): void;
  }

  function isSupported(): boolean;
}

declare namespace firebase.storage {
  /**
   * The full set of object metadata, including read-only properties.
   */
  interface FullMetadata extends firebase.storage.UploadMetadata {
    /**
     * The bucket this object is contained in.
     */
    bucket: string;
    /**
     * @deprecated
     * Use Reference.getDownloadURL instead. This property will be removed in a
     * future release.
     */
    downloadURLs: string[];
    /**
     * The full path of this object.
     */
    fullPath: string;
    /**
     * The object's generation.
     * @see {@link https://cloud.google.com/storage/docs/generations-preconditions}
     */
    generation: string;
    /**
     * The object's metageneration.
     * @see {@link https://cloud.google.com/storage/docs/generations-preconditions}
     */
    metageneration: string;
    /**
     * The short name of this object, which is the last component of the full path.
     * For example, if fullPath is 'full/path/image.png', name is 'image.png'.
     */
    name: string;
    /**
     * The size of this object, in bytes.
     */
    size: number;
    /**
     * A date string representing when this object was created.
     */
    timeCreated: string;
    /**
     * A date string representing when this object was last updated.
     */
    updated: string;
  }

  /**
   * Represents a reference to a Google Cloud Storage object. Developers can
   * upload, download, and delete objects, as well as get/set object metadata.
   */
  interface Reference {
    /**
     * The name of the bucket containing this reference's object.
     */
    bucket: string;
    /**
     * Returns a reference to a relative path from this reference.
     * @param {string} path The relative path from this reference.
     *     Leading, trailing, and consecutive slashes are removed.
     * @return {!firebase.storage.Reference} The reference to the given path.
     */
    child(path: string): firebase.storage.Reference;
    /**
     * Deletes the object at this reference's location.
     * @return {!firebase.Promise<void>} A Promise that resolves if the deletion
     *     succeeded and rejects if it failed, including if the object didn't exist.
     */
    delete(): Promise<any>;
    /**
     * The full path of this object.
     */
    fullPath: string;
    /**
     * Fetches a long lived download URL for this object.
     * @return {!firebase.Promise<string>} A Promise that resolves with the download
     *     URL or rejects if the fetch failed, including if the object did not
     *     exist.
     */
    getDownloadURL(): Promise<any>;
    /**
     * Fetches metadata for the object at this location, if one exists.
     * @return {!firebase.Promise<firebase.storage.FullMetadata>} A Promise that
     *     resolves with the metadata, or rejects if the fetch failed, including if
     *     the object did not exist.
     */
    getMetadata(): Promise<any>;
    /**
     * The short name of this object, which is the last component of the full path.
     * For example, if fullPath is 'full/path/image.png', name is 'image.png'.
     */
    name: string;
    /**
     * A reference pointing to the parent location of this reference, or null if
     * this reference is the root.
     */
    parent: firebase.storage.Reference | null;
    /**
     * Uploads data to this reference's location.
     * @param {!Blob|!Uint8Array|!ArrayBuffer} data The data to upload.
     * @param {!firebase.storage.UploadMetadata=} metadata Metadata for the newly
     *     uploaded object.
     * @return {!firebase.storage.UploadTask} An object that can be used to monitor
     *     and manage the upload.
     */
    put(
      data: any | any | any,
      metadata?: firebase.storage.UploadMetadata
    ): firebase.storage.UploadTask;
    /**
     * Uploads string data to this reference's location.
     * @param {string} data The string to upload.
     * @param {!firebase.storage.StringFormat=} format The format of the string to
     *     upload.
     * @param {!firebase.storage.UploadMetadata=} metadata Metadata for the newly
     *     uploaded object.
     * @return {!firebase.storage.UploadTask}
     * @throws If the format is not an allowed format, or if the given string
     *     doesn't conform to the specified format.
     */
    putString(
      data: string,
      format?: firebase.storage.StringFormat,
      metadata?: firebase.storage.UploadMetadata
    ): firebase.storage.UploadTask;
    /**
     * A reference to the root of this reference's bucket.
     */
    root: firebase.storage.Reference;
    /**
     * The storage service associated with this reference.
     */
    storage: firebase.storage.Storage;
    /**
     * Returns a gs:// URL for this object in the form
     *   `gs://<bucket>/<path>/<to>/<object>`
     * @return {string} The gs:// URL.
     */
    toString(): string;
    /**
     * Updates the metadata for the object at this location, if one exists.
     * @param {!firebase.storage.SettableMetadata} metadata The new metadata.
     *     Setting a property to 'null' removes it on the server, while leaving
     *     a property as 'undefined' has no effect.
     * @return {!firebase.Promise<firebase.storage.FullMetadata>} A Promise that
     *     resolves with the full updated metadata or rejects if the updated failed,
     *     including if the object did not exist.
     */
    updateMetadata(metadata: firebase.storage.SettableMetadata): Promise<any>;
  }

  /**
   * Object metadata that can be set at any time.
   */
  interface SettableMetadata {
    /**
     * Served as the 'Cache-Control' header on object download.
     */
    cacheControl?: string | null;
    contentDisposition?: string | null;
    /**
     * Served as the 'Content-Encoding' header on object download.
     */
    contentEncoding?: string | null;
    /**
     * Served as the 'Content-Language' header on object download.
     */
    contentLanguage?: string | null;
    /**
     * Served as the 'Content-Type' header on object download.
     */
    contentType?: string | null;
    /**
     * Additional user-defined custom metadata.
     */
    customMetadata?: {
      [/* warning: coerced from ? */ key: string]: string;
    } | null;
  }

  /**
   * The Firebase Storage service interface.
   *
   * Do not call this constructor directly. Instead, use
   * {@link firebase.storage `firebase.storage()`}.
   *
   * See
   * {@link
   *   https://firebase.google.com/docs/storage/web/start/
   *   Get Started on Web}
   * for a full guide on how to use the Firebase Storage service.
   */
  interface Storage {
    /**
     * The {@link firebase.app.App app} associated with the `Storage` service
     * instance.
     *
     * @example
     * ```
     * var app = storage.app;
     * ```
     */
    app: firebase.app.App;
    /**
     * The maximum time to retry operations other than uploads or downloads in
     * milliseconds.
     */
    maxOperationRetryTime: number;
    /**
     * The maximum time to retry uploads in milliseconds.
     */
    maxUploadRetryTime: number;
    /**
     * Returns a reference for the given path in the default bucket.
     * @param {string=} path A relative path to initialize the reference with,
     *     for example `path/to/image.jpg`. If not passed, the returned reference
     *     points to the bucket root.
     * @return {!firebase.storage.Reference} A reference for the given path.
     */
    ref(path?: string): firebase.storage.Reference;
    /**
     * Returns a reference for the given absolute URL.
     * @param {string} url A URL in the form: <br />
     *     1) a gs:// URL, for example `gs://bucket/files/image.png` <br />
     *     2) a download URL taken from object metadata. <br />
     *     @see {@link firebase.storage.FullMetadata.prototype.downloadURLs}
     * @return {!firebase.storage.Reference} A reference for the given URL.
     */
    refFromURL(url: string): firebase.storage.Reference;
    /**
     * @param {number} time The new maximum operation retry time in milliseconds.
     * @see {@link firebase.storage.Storage.prototype.maxOperationRetryTime}
     */
    setMaxOperationRetryTime(time: number): any;
    /**
     * @param {number} time The new maximum upload retry time in milliseconds.
     * @see {@link firebase.storage.Storage.prototype.maxUploadRetryTime}
     */
    setMaxUploadRetryTime(time: number): any;
  }

  /**
   * @enum {string}
   * An enumeration of the possible string formats for upload.
   */
  type StringFormat = string;
  var StringFormat: {
    /**
     * Indicates the string should be interpreted as base64-encoded data.
     * Padding characters (trailing '='s) are optional.
     * Example: The string 'rWmO++E6t7/rlw==' becomes the byte sequence
     * ad 69 8e fb e1 3a b7 bf eb 97
     */
    BASE64: StringFormat;
    /**
     * Indicates the string should be interpreted as base64url-encoded data.
     * Padding characters (trailing '='s) are optional.
     * Example: The string 'rWmO--E6t7_rlw==' becomes the byte sequence
     * ad 69 8e fb e1 3a b7 bf eb 97
     */
    BASE64URL: StringFormat;
    /**
     * Indicates the string is a data URL, such as one obtained from
     * canvas.toDataURL().
     * Example: the string 'data:application/octet-stream;base64,aaaa'
     * becomes the byte sequence
     * 69 a6 9a
     * (the content-type "application/octet-stream" is also applied, but can
     * be overridden in the metadata object).
     */
    DATA_URL: StringFormat;
    /**
     * Indicates the string should be interpreted "raw", that is, as normal text.
     * The string will be interpreted as UTF-16, then uploaded as a UTF-8 byte
     * sequence.
     * Example: The string 'Hello! \ud83d\ude0a' becomes the byte sequence
     * 48 65 6c 6c 6f 21 20 f0 9f 98 8a
     */
    RAW: StringFormat;
  };

  /**
   * An event that is triggered on a task.
   * @enum {string}
   * @see {@link firebase.storage.UploadTask.prototype.on}
   */
  type TaskEvent = string;
  var TaskEvent: {
    /**
     * For this event,
     * <ul>
     *   <li>The `next` function is triggered on progress updates and when the
     *       task is paused/resumed with a
     *       {@link firebase.storage.UploadTaskSnapshot} as the first
     *       argument.</li>
     *   <li>The `error` function is triggered if the upload is canceled or fails
     *       for another reason.</li>
     *   <li>The `complete` function is triggered if the upload completes
     *       successfully.</li>
     * </ul>
     */
    STATE_CHANGED: TaskEvent;
  };

  /**
   * Represents the current state of a running upload.
   * @enum {string}
   */
  type TaskState = string;
  var TaskState: {
    CANCELED: TaskState;
    ERROR: TaskState;
    PAUSED: TaskState;
    RUNNING: TaskState;
    SUCCESS: TaskState;
  };

  /**
   * Object metadata that can be set at upload.
   */
  interface UploadMetadata extends firebase.storage.SettableMetadata {
    /**
     * A Base64-encoded MD5 hash of the object being uploaded.
     */
    md5Hash?: string | null;
  }

  /**
   * Represents the process of uploading an object. Allows you to monitor and
   * manage the upload.
   */
  interface UploadTask {
    /**
     * Cancels a running task. Has no effect on a complete or failed task.
     * @return {boolean} True if the cancel had an effect.
     */
    cancel(): boolean;
    /**
     * Equivalent to calling `then(null, onRejected)`.
     */
    catch(onRejected: (a: Error) => any): Promise<any>;
    /**
     * Listens for events on this task.
     *
     * Events have three callback functions (referred to as `next`, `error`, and
     * `complete`).
     *
     * If only the event is passed, a function that can be used to register the
     * callbacks is returned. Otherwise, the callbacks are passed after the event.
     *
     * Callbacks can be passed either as three separate arguments <em>or</em> as the
     * `next`, `error`, and `complete` properties of an object. Any of the three
     * callbacks is optional, as long as at least one is specified. In addition,
     * when you add your callbacks, you get a function back. You can call this
     * function to unregister the associated callbacks.
     *
     * @example **Pass callbacks separately or in an object.**
     * ```
     * var next = function(snapshot) {};
     * var error = function(error) {};
     * var complete = function() {};
     *
     * // The first example.
     * uploadTask.on(
     *     firebase.storage.TaskEvent.STATE_CHANGED,
     *     next,
     *     error,
     *     complete);
     *
     * // This is equivalent to the first example.
     * uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, {
     *   'next': next,
     *   'error': error,
     *   'complete': complete
     * });
     *
     * // This is equivalent to the first example.
     * var subscribe = uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED);
     * subscribe(next, error, complete);
     *
     * // This is equivalent to the first example.
     * var subscribe = uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED);
     * subscribe({
     *   'next': next,
     *   'error': error,
     *   'complete': complete
     * });
     * ```
     *
     * @example **Any callback is optional.**
     * ```
     * // Just listening for completion, this is legal.
     * uploadTask.on(
     *     firebase.storage.TaskEvent.STATE_CHANGED,
     *     null,
     *     null,
     *     function() {
     *       console.log('upload complete!');
     *     });
     *
     * // Just listening for progress/state changes, this is legal.
     * uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, function(snapshot) {
     *   var percent = snapshot.bytesTransferred / snapshot.totalBytes * 100;
     *   console.log(percent + "% done");
     * });
     *
     * // This is also legal.
     * uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, {
     *   'complete': function() {
     *     console.log('upload complete!');
     *   }
     * });
     * ```
     *
     * @example **Use the returned function to remove callbacks.**
     * ```
     * var unsubscribe = uploadTask.on(
     *     firebase.storage.TaskEvent.STATE_CHANGED,
     *     function(snapshot) {
     *       var percent = snapshot.bytesTransferred / snapshot.totalBytes * 100;
     *       console.log(percent + "% done");
     *       // Stop after receiving one update.
     *       unsubscribe();
     *     });
     *
     * // This code is equivalent to the above.
     * var handle = uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED);
     * unsubscribe = handle(function(snapshot) {
     *   var percent = snapshot.bytesTransferred / snapshot.totalBytes * 100;
     *   console.log(percent + "% done");
     *   // Stop after receiving one update.
     *   unsubscribe();
     * });
     * ```
     *
     * @param {!firebase.storage.TaskEvent} event The event to listen for.
     * @param {(?firebase.Observer<firebase.storage.UploadTaskSnapshot,Error>|
     *       ?function(!Object))=} nextOrObserver
     *     The `next` function, which gets called for each item in
     *     the event stream, or an observer object with some or all of these three
     *     properties (`next`, `error`, `complete`).
     * @param {?function(!Error)=} error A function that gets called with an Error
     *     if the event stream ends due to an error.
     * @param {?firebase.CompleteFn=} complete A function that gets called if the
     *     event stream ends normally.
     * @return {
     *     !firebase.Unsubscribe|
     *     !function(?function(!Object),?function(!Error)=,?firebase.CompleteFn=)
     *       :!firebase.Unsubscribe}
     *     If only the event argument is passed, returns a function you can use to
     *     add callbacks (see the examples above). If more than just the event
     *     argument is passed, returns a function you can call to unregister the
     *     callbacks.
     */
    on(
      event: firebase.storage.TaskEvent,
      nextOrObserver?:
        | firebase.Observer<UploadTaskSnapshot>
        | null
        | ((a: UploadTaskSnapshot) => any),
      error?: ((a: Error) => any) | null,
      complete?: (firebase.Unsubscribe) | null
    ): Function;
    /**
     * Pauses a running task. Has no effect on a paused or failed task.
     * @return {boolean} True if the pause had an effect.
     */
    pause(): boolean;
    /**
     * Resumes a paused task. Has no effect on a running or failed task.
     * @return {boolean} True if the resume had an effect.
     */
    resume(): boolean;
    /**
     * A snapshot of the current task state.
     */
    snapshot: firebase.storage.UploadTaskSnapshot;
    /**
     * This object behaves like a Promise, and resolves with its snapshot data when
     * the upload completes.
     * @param {(?function(!firebase.storage.UploadTaskSnapshot):*)=} onFulfilled
     *     The fulfillment callback. Promise chaining works as normal.
     * @param {(?function(!Error):*)=} onRejected The rejection callback.
     */
    then(
      onFulfilled?: ((a: firebase.storage.UploadTaskSnapshot) => any) | null,
      onRejected?: ((a: Error) => any) | null
    ): Promise<any>;
  }

  /**
   * Holds data about the current state of the upload task.
   */
  interface UploadTaskSnapshot {
    /**
     * The number of bytes that have been successfully uploaded so far.
     */
    bytesTransferred: number;
    /**
     * @deprecated
     * Use Reference.getDownloadURL instead. This property will be removed in a
     * future release.
     */
    downloadURL: string | null;
    /**
     * Before the upload completes, contains the metadata sent to the server.
     * After the upload completes, contains the metadata sent back from the server.
     */
    metadata: firebase.storage.FullMetadata;
    /**
     * The reference that spawned this snapshot's upload task.
     */
    ref: firebase.storage.Reference;
    /**
     * The current state of the task.
     */
    state: firebase.storage.TaskState;
    /**
     * The task of which this is a snapshot.
     */
    task: firebase.storage.UploadTask;
    /**
     * The total number of bytes to be uploaded.
     */
    totalBytes: number;
  }
}

declare namespace firebase.firestore {
  /**
   * Document data (for use with `DocumentReference.set()`) consists of fields
   * mapped to values.
   */
  export type DocumentData = { [field: string]: any };

  /**
   * Update data (for use with `DocumentReference.update()`) consists of field
   * paths (e.g. 'foo' or 'foo.baz') mapped to values. Fields that contain dots
   * reference nested fields within the document.
   */
  export type UpdateData = { [fieldPath: string]: any };

  /**
   * Constant used to indicate the LRU garbage collection should be disabled.
   * Set this value as the `cacheSizeBytes` on the settings passed to the
   * `Firestore` instance.
   */
  export const CACHE_SIZE_UNLIMITED: number;

  /**
   * Specifies custom configurations for your Cloud Firestore instance.
   * You must set these before invoking any other methods.
   */
  export interface Settings {
    /** The hostname to connect to. */
    host?: string;
    /** Whether to use SSL when connecting. */
    ssl?: boolean;

    /**
     * Specifies whether to use `Timestamp` objects for timestamp fields in
     * `DocumentSnapshot`s. This is enabled by default and should not be
     * disabled.
     *
     * Previously, Firestore returned timestamp fields as `Date` but `Date`
     * only supports millisecond precision, which leads to truncation and
     * causes unexpected behavior when using a timestamp from a snapshot as a
     * part of a subsequent query.
     *
     * So now Firestore returns `Timestamp` values instead of `Date`, avoiding
     * this kind of problem.
     *
     * To opt into the old behavior of returning `Date` objects, you can
     * temporarily set `timestampsInSnapshots` to false.
     *
     * @deprecated This setting will be removed in a future release. You should
     * update your code to expect `Timestamp` objects and stop using the
     * `timestampsInSnapshots` setting.
     */
    timestampsInSnapshots?: boolean;

    /**
     * An approximate cache size threshold for the on-disk data. If the cache grows beyond this
     * size, Firestore will start removing data that hasn't been recently used. The size is not a
     * guarantee that the cache will stay below that size, only that if the cache exceeds the given
     * size, cleanup will be attempted.
     *
     * The default value is 40 MB. The threshold must be set to at least 1 MB, and can be set to
     * CACHE_SIZE_UNLIMITED to disable garbage collection.
     */
    cacheSizeBytes?: number;
  }

  /**
   * Settings that can be passed to Firestore.enablePersistence() to configure
   * Firestore persistence.
   */
  export interface PersistenceSettings {
    /**
     * Whether to synchronize the in-memory state of multiple tabs. Setting this
     * to 'true' in all open tabs enables shared access to local persistence,
     * shared execution of queries and latency-compensated local document updates
     * across all connected instances.
     *
     * To enable this mode, `experimentalTabSynchronization:true` needs to be set
     * globally in all active tabs. If omitted or set to 'false',
     * `enablePersistence()` will fail in all but the first tab.
     *
     * NOTE: This mode is not yet recommended for production use.
     */
    experimentalTabSynchronization?: boolean;
  }

  export type LogLevel = 'debug' | 'error' | 'silent';

  /**
   * Sets the verbosity of Cloud Firestore logs (debug, error, or silent).
   *
   * @param {string} logLevel
   *   The verbosity you set for activity and error logging. Can be any of
   *   the following values:
   *
   *   <ul>
   *     <li><code>debug</code> for the most verbose logging level, primarily for
   *     dubugging.</li>
   *     <li><code>error</code> to log errors only.</li>
   *     <li><code>silent</code> to turn off logging.</li>
   *   </ul>
   */
  export function setLogLevel(logLevel: LogLevel): void;

  /**
   * The Cloud Firestore service interface.
   *
   * Do not call this constructor directly. Instead, use
   * {@link firebase.firestore `firebase.firestore()`}.
   */
  export class Firestore {
    private constructor();
    /**
     * Specifies custom settings to be used to configure the `Firestore`
     * instance. Must be set before invoking any other methods.
     *
     * @param settings The settings to use.
     */
    settings(settings: Settings): void;

    /**
     * Attempts to enable persistent storage, if possible.
     *
     * Must be called before any other methods (other than settings()).
     *
     * If this fails, enablePersistence() will reject the promise it returns.
     * Note that even after this failure, the firestore instance will remain
     * usable, however offline persistence will be disabled.
     *
     * There are several reasons why this can fail, which can be identified by
     * the `code` on the error.
     *
     *   * failed-precondition: The app is already open in another browser tab.
     *   * unimplemented: The browser is incompatible with the offline
     *     persistence implementation.
     *
     * @param settings Optional settings object to configure persistence.
     * @return A promise that represents successfully enabling persistent
     * storage.
     */
    enablePersistence(settings?: PersistenceSettings): Promise<void>;

    /**
     * Gets a `CollectionReference` instance that refers to the collection at
     * the specified path.
     *
     * @param collectionPath A slash-separated path to a collection.
     * @return The `CollectionReference` instance.
     */
    collection(collectionPath: string): CollectionReference;

    /**
     * Gets a `DocumentReference` instance that refers to the document at the
     * specified path.
     *
     * @param documentPath A slash-separated path to a document.
     * @return The `DocumentReference` instance.
     */
    doc(documentPath: string): DocumentReference;

    // TODO(b/116617988): Uncomment method and change jsdoc comment to "/**"
    // once backend support is ready.
    /*
     * Creates and returns a new Query that includes all documents in the
     * database that are contained in a collection or subcollection with the
     * given collectionId.
     *
     * @param collectionId Identifies the collections to query over. Every
     * collection or subcollection with this ID as the last segment of its path
     * will be included. Cannot contain a slash.
     * @return The created Query.
     */
    //collectionGroup(collectionId: string): Query;

    /**
     * Executes the given `updateFunction` and then attempts to commit the changes
     * applied within the transaction. If any document read within the transaction
     * has changed, Cloud Firestore retries the `updateFunction`. If it fails to
     * commit after 5 attempts, the transaction fails.
     *
     * @param {function(!firebase.firestore.Transaction)} updateFunction
     *   The function to execute within the transaction context.
     *
     * @return {!Promise}
     *   If the transaction completed successfully or was explicitly aborted
     *   (the `updateFunction` returned a failed promise),
     *   the promise returned by the updateFunction is returned here. Else, if the
     *   transaction failed, a rejected promise with the corresponding failure
     *   error will be returned.
     */
    runTransaction<T>(
      updateFunction: (transaction: Transaction) => Promise<T>
    ): Promise<T>;

    /**
     * Creates a write batch, used for performing multiple writes as a single
     * atomic operation.
     *
     * @return {!firebase.firestore.WriteBatch}
     *   A `WriteBatch` that can be used to atomically execute multiple writes.
     */
    batch(): WriteBatch;

    /**
     * The {@link firebase.app.App app} associated with this `Firestore` service
     * instance.
     */
    app: firebase.app.App;

    /**
     * Re-enables use of the network for this Firestore instance after a prior
     * call to {@link firebase.firestore.Firestore.disableNetwork
     * `disableNetwork()`}.
     *
     * @return {!Promise<void>} A promise that is resolved once the network has been
     *   enabled.
     */
    enableNetwork(): Promise<void>;

    /**
     * Disables network usage for this instance. It can be re-enabled via
     * {@link firebase.firestore.Firestore.enableNetwork `enableNetwork()`}. While
     * the network is disabled, any snapshot listeners or get() calls will return
     * results from cache, and any write operations will be queued until the network
     * is restored.
     *
     * @return {!Promise<void>} A promise that is resolved once the network has been
     *   disabled.
     */
    disableNetwork(): Promise<void>;

    /**
     * @hidden
     */
    INTERNAL: { delete: () => Promise<void> };
  }

  /**
   * An immutable object representing a geo point in Firestore. The geo point
   * is represented as latitude/longitude pair.
   *
   * Latitude values are in the range of [-90, 90].
   * Longitude values are in the range of [-180, 180].
   */
  export class GeoPoint {
    /**
     * Creates a new immutable GeoPoint object with the provided latitude and
     * longitude values.
     * @param latitude The latitude as number between -90 and 90.
     * @param longitude The longitude as number between -180 and 180.
     */
    constructor(latitude: number, longitude: number);

    /**
     * The latitude of this GeoPoint instance.
     */
    readonly latitude: number;
    /**
     * The longitude of this GeoPoint instance.
     */
    readonly longitude: number;

    /**
     * Returns true if this `GeoPoint` is equal to the provided one.
     *
     * @param other The `GeoPoint` to compare against.
     * @return true if this `GeoPoint` is equal to the provided one.
     */
    isEqual(other: GeoPoint): boolean;
  }

  /**
   * A Timestamp represents a point in time independent of any time zone or
   * calendar, represented as seconds and fractions of seconds at nanosecond
   * resolution in UTC Epoch time.
   *
   * It is encoded using the Proleptic Gregorian
   * Calendar which extends the Gregorian calendar backwards to year one. It is
   * encoded assuming all minutes are 60 seconds long, i.e. leap seconds are
   * "smeared" so that no leap second table is needed for interpretation. Range is
   * from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59.999999999Z.
   *
   * @see https://github.com/google/protobuf/blob/master/src/google/protobuf/timestamp.proto
   */
  export class Timestamp {
    /**
     * Creates a new timestamp with the current date, with millisecond precision.
     *
     * @return a new timestamp representing the current date.
     */
    static now(): Timestamp;

    /**
     * Creates a new timestamp from the given date.
     *
     * @param date The date to initialize the `Timestamp` from.
     * @return A new `Timestamp` representing the same point in time as the given
     *     date.
     */
    static fromDate(date: Date): Timestamp;

    /**
     * Creates a new timestamp from the given number of milliseconds.
     *
     * @param milliseconds Number of milliseconds since Unix epoch
     *     1970-01-01T00:00:00Z.
     * @return A new `Timestamp` representing the same point in time as the given
     *     number of milliseconds.
     */
    static fromMillis(milliseconds: number): Timestamp;

    /**
     * Creates a new timestamp.
     *
     * @param seconds The number of seconds of UTC time since Unix epoch
     *     1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
     *     9999-12-31T23:59:59Z inclusive.
     * @param nanoseconds The non-negative fractions of a second at nanosecond
     *     resolution. Negative second values with fractions must still have
     *     non-negative nanoseconds values that count forward in time. Must be
     *     from 0 to 999,999,999 inclusive.
     */
    constructor(seconds: number, nanoseconds: number);

    readonly seconds: number;
    readonly nanoseconds: number;

    /**
     * Convert a Timestamp to a JavaScript `Date` object. This conversion causes
     * a loss of precision since `Date` objects only support millisecond precision.
     *
     * @return JavaScript `Date` object representing the same point in time as
     *     this `Timestamp`, with millisecond precision.
     */
    toDate(): Date;

    /**
     * Convert a timestamp to a numeric timestamp (in milliseconds since epoch).
     * This operation causes a loss of precision.
     *
     * @return The point in time corresponding to this timestamp, represented as
     *     the number of milliseconds since Unix epoch 1970-01-01T00:00:00Z.
     */
    toMillis(): number;

    /**
     * Returns true if this `Timestamp` is equal to the provided one.
     *
     * @param other The `Timestamp` to compare against.
     * @return true if this `Timestamp` is equal to the provided one.
     */
    isEqual(other: Timestamp): boolean;
  }

  /**
   * An immutable object representing an array of bytes.
   */
  export class Blob {
    private constructor();

    /**
     * Creates a new Blob from the given Base64 string, converting it to
     * bytes.
     *
     * @param {string} base64
     *   The Base64 string used to create the Blob object.
     */
    static fromBase64String(base64: string): Blob;

    /**
     * Creates a new Blob from the given Uint8Array.
     *
     * @param {!Uint8Array} array
     *   The Uint8Array used to create the Blob object.
     */
    static fromUint8Array(array: Uint8Array): Blob;

    /**
     * Returns the bytes of a Blob as a Base64-encoded string.
     *
     * @return {string}
     *   The Base64-encoded string created from the Blob object.
     */
    public toBase64(): string;

    /**
     * Returns the bytes of a Blob in a new Uint8Array.
     *
     * @return {!Uint8Array}
     *   The Uint8Array created from the Blob object.
     */
    public toUint8Array(): Uint8Array;

    /**
     * Returns true if this `Blob` is equal to the provided one.
     *
     * @param other The `Blob` to compare against.
     * @return true if this `Blob` is equal to the provided one.
     */
    isEqual(other: Blob): boolean;
  }

  /**
   * A reference to a transaction.
   * The `Transaction` object passed to a transaction's updateFunction provides
   * the methods to read and write data within the transaction context. See
   * `Firestore.runTransaction()`.
   */
  export class Transaction {
    private constructor();

    /**
     * Reads the document referenced by the provided `DocumentReference.`
     *
     * @param documentRef A reference to the document to be read.
     * @return A DocumentSnapshot for the read data.
     */
    get(documentRef: DocumentReference): Promise<DocumentSnapshot>;

    /**
     * Writes to the document referred to by the provided `DocumentReference`.
     * If the document does not exist yet, it will be created. If you pass
     * `SetOptions`, the provided data can be merged into the existing document.
     *
     * @param documentRef A reference to the document to be set.
     * @param data An object of the fields and values for the document.
     * @param options An object to configure the set behavior.
     * @return This `Transaction` instance. Used for chaining method calls.
     */
    set(
      documentRef: DocumentReference,
      data: DocumentData,
      options?: SetOptions
    ): Transaction;

    /**
     * Updates fields in the document referred to by the provided
     * `DocumentReference`. The update will fail if applied to a document that
     * does not exist.
     *
     * @param documentRef A reference to the document to be updated.
     * @param data An object containing the fields and values with which to
     * update the document. Fields can contain dots to reference nested fields
     * within the document.
     * @return This `Transaction` instance. Used for chaining method calls.
     */
    update(documentRef: DocumentReference, data: UpdateData): Transaction;

    /**
     * Updates fields in the document referred to by the provided
     * `DocumentReference`. The update will fail if applied to a document that
     * does not exist.
     *
     * Nested fields can be updated by providing dot-separated field path
     * strings or by providing FieldPath objects.
     *
     * @param documentRef A reference to the document to be updated.
     * @param field The first field to update.
     * @param value The first value.
     * @param moreFieldsAndValues Additional key/value pairs.
     * @return A Promise resolved once the data has been successfully written
     * to the backend (Note that it won't resolve while you're offline).
     */
    update(
      documentRef: DocumentReference,
      field: string | FieldPath,
      value: any,
      ...moreFieldsAndValues: any[]
    ): Transaction;

    /**
     * Deletes the document referred to by the provided `DocumentReference`.
     *
     * @param documentRef A reference to the document to be deleted.
     * @return This `Transaction` instance. Used for chaining method calls.
     */
    delete(documentRef: DocumentReference): Transaction;
  }

  /**
   * A write batch, used to perform multiple writes as a single atomic unit.
   *
   * A `WriteBatch` object can be acquired by calling `Firestore.batch()`. It
   * provides methods for adding writes to the write batch. None of the
   * writes will be committed (or visible locally) until `WriteBatch.commit()`
   * is called.
   *
   * Unlike transactions, write batches are persisted offline and therefore are
   * preferable when you don't need to condition your writes on read data.
   */
  export class WriteBatch {
    private constructor();

    /**
     * Writes to the document referred to by the provided `DocumentReference`.
     * If the document does not exist yet, it will be created. If you pass
     * `SetOptions`, the provided data can be merged into the existing document.
     *
     * @param documentRef A reference to the document to be set.
     * @param data An object of the fields and values for the document.
     * @param options An object to configure the set behavior.
     * @return This `WriteBatch` instance. Used for chaining method calls.
     */
    set(
      documentRef: DocumentReference,
      data: DocumentData,
      options?: SetOptions
    ): WriteBatch;

    /**
     * Updates fields in the document referred to by the provided
     * `DocumentReference`. The update will fail if applied to a document that
     * does not exist.
     *
     * @param documentRef A reference to the document to be updated.
     * @param data An object containing the fields and values with which to
     * update the document. Fields can contain dots to reference nested fields
     * within the document.
     * @return This `WriteBatch` instance. Used for chaining method calls.
     */
    update(documentRef: DocumentReference, data: UpdateData): WriteBatch;

    /**
     * Updates fields in the document referred to by this `DocumentReference`.
     * The update will fail if applied to a document that does not exist.
     *
     * Nested fields can be update by providing dot-separated field path strings
     * or by providing FieldPath objects.
     *
     * @param documentRef A reference to the document to be updated.
     * @param field The first field to update.
     * @param value The first value.
     * @param moreFieldsAndValues Additional key value pairs.
     * @return A Promise resolved once the data has been successfully written
     * to the backend (Note that it won't resolve while you're offline).
     */
    update(
      documentRef: DocumentReference,
      field: string | FieldPath,
      value: any,
      ...moreFieldsAndValues: any[]
    ): WriteBatch;

    /**
     * Deletes the document referred to by the provided `DocumentReference`.
     *
     * @param documentRef A reference to the document to be deleted.
     * @return This `WriteBatch` instance. Used for chaining method calls.
     */
    delete(documentRef: DocumentReference): WriteBatch;

    /**
     * Commits all of the writes in this write batch as a single atomic unit.
     *
     * @return A Promise resolved once all of the writes in the batch have been
     * successfully written to the backend as an atomic unit. Note that it won't
     * resolve while you're offline.
     */
    commit(): Promise<void>;
  }

  /**
   * An options object that can be passed to `DocumentReference.onSnapshot()`,
   * `Query.onSnapshot()` and `QuerySnapshot.docChanges()` to control which
   * types of changes to include in the result set.
   */
  export interface SnapshotListenOptions {
    /**
     * Include a change even if only the metadata of the query or of a document
     * changed. Default is false.
     */
    readonly includeMetadataChanges?: boolean;
  }

  /**
   * An options object that configures the behavior of `set()` calls in
   * {@link firebase.firestore.DocumentReference.set DocumentReference}, {@link
   * firebase.firestore.WriteBatch.set WriteBatch} and {@link
   * firebase.firestore.Transaction.set Transaction}. These calls can be
   * configured to perform granular merges instead of overwriting the target
   * documents in their entirety by providing a `SetOptions` with `merge: true`.
   */
  export interface SetOptions {
    /**
     * Changes the behavior of a set() call to only replace the values specified
     * in its data argument. Fields omitted from the set() call remain
     * untouched.
     */
    readonly merge?: boolean;

    /**
     * Changes the behavior of set() calls to only replace the specified field
     * paths. Any field path that is not specified is ignored and remains
     * untouched.
     */
    readonly mergeFields?: (string | FieldPath)[];
  }

  /**
   * An options object that configures the behavior of `get()` calls on
   * `DocumentReference` and `Query`. By providing a `GetOptions` object, these
   * methods can be configured to fetch results only from the server, only from
   * the local cache or attempt to fetch results from the server and fall back to
   * the cache (which is the default).
   */
  export interface GetOptions {
    /**
     * Describes whether we should get from server or cache.
     *
     * Setting to `default` (or not setting at all), causes Firestore to try to
     * retrieve an up-to-date (server-retrieved) snapshot, but fall back to
     * returning cached data if the server can't be reached.
     *
     * Setting to `server` causes Firestore to avoid the cache, generating an
     * error if the server cannot be reached. Note that the cache will still be
     * updated if the server request succeeds. Also note that latency-compensation
     * still takes effect, so any pending write operations will be visible in the
     * returned data (merged into the server-provided data).
     *
     * Setting to `cache` causes Firestore to immediately return a value from the
     * cache, ignoring the server completely (implying that the returned value
     * may be stale with respect to the value on the server.) If there is no data
     * in the cache to satisfy the `get()` call, `DocumentReference.get()` will
     * return an error and `QuerySnapshot.get()` will return an empty
     * `QuerySnapshot` with no documents.
     */
    readonly source?: 'default' | 'server' | 'cache';
  }

  /**
   * A `DocumentReference` refers to a document location in a Firestore database
   * and can be used to write, read, or listen to the location. The document at
   * the referenced location may or may not exist. A `DocumentReference` can
   * also be used to create a `CollectionReference` to a subcollection.
   */
  export class DocumentReference {
    private constructor();

    /**
     * The document's identifier within its collection.
     */
    readonly id: string;

    /**
     * The {@link firebase.firestore.Firestore} the document is in.
     * This is useful for performing transactions, for example.
     */
    readonly firestore: Firestore;

    /**
     * The Collection this `DocumentReference` belongs to.
     */
    readonly parent: CollectionReference;

    /**
     * A string representing the path of the referenced document (relative
     * to the root of the database).
     */
    readonly path: string;

    /**
     * Gets a `CollectionReference` instance that refers to the collection at
     * the specified path.
     *
     * @param collectionPath A slash-separated path to a collection.
     * @return The `CollectionReference` instance.
     */
    collection(collectionPath: string): CollectionReference;

    /**
     * Returns true if this `DocumentReference` is equal to the provided one.
     *
     * @param other The `DocumentReference` to compare against.
     * @return true if this `DocumentReference` is equal to the provided one.
     */
    isEqual(other: DocumentReference): boolean;

    /**
     * Writes to the document referred to by this `DocumentReference`. If the
     * document does not yet exist, it will be created. If you pass
     * `SetOptions`, the provided data can be merged into an existing document.
     *
     * @param data A map of the fields and values for the document.
     * @param options An object to configure the set behavior.
     * @return A Promise resolved once the data has been successfully written
     * to the backend (Note that it won't resolve while you're offline).
     */
    set(data: DocumentData, options?: SetOptions): Promise<void>;

    /**
     * Updates fields in the document referred to by this `DocumentReference`.
     * The update will fail if applied to a document that does not exist.
     *
     * @param data An object containing the fields and values with which to
     * update the document. Fields can contain dots to reference nested fields
     * within the document.
     * @return A Promise resolved once the data has been successfully written
     * to the backend (Note that it won't resolve while you're offline).
     */
    update(data: UpdateData): Promise<void>;

    /**
     * Updates fields in the document referred to by this `DocumentReference`.
     * The update will fail if applied to a document that does not exist.
     *
     * Nested fields can be updated by providing dot-separated field path
     * strings or by providing FieldPath objects.
     *
     * @param field The first field to update.
     * @param value The first value.
     * @param moreFieldsAndValues Additional key value pairs.
     * @return A Promise resolved once the data has been successfully written
     * to the backend (Note that it won't resolve while you're offline).
     */
    update(
      field: string | FieldPath,
      value: any,
      ...moreFieldsAndValues: any[]
    ): Promise<void>;

    /**
     * Deletes the document referred to by this `DocumentReference`.
     *
     * @return A Promise resolved once the document has been successfully
     * deleted from the backend (Note that it won't resolve while you're
     * offline).
     */
    delete(): Promise<void>;

    /**
     * Reads the document referred to by this `DocumentReference`.
     *
     * Note: By default, get() attempts to provide up-to-date data when possible
     * by waiting for data from the server, but it may return cached data or fail
     * if you are offline and the server cannot be reached. This behavior can be
     * altered via the `GetOptions` parameter.
     *
     * @param options An object to configure the get behavior.
     * @return A Promise resolved with a DocumentSnapshot containing the
     * current document contents.
     */
    get(options?: GetOptions): Promise<DocumentSnapshot>;

    /**
     * Attaches a listener for DocumentSnapshot events. You may either pass
     * individual `onNext` and `onError` callbacks or pass a single observer
     * object with `next` and `error` callbacks.
     *
     * NOTE: Although an `onCompletion` callback can be provided, it will
     * never be called because the snapshot stream is never-ending.
     *
     * @param observer A single object containing `next` and `error` callbacks.
     * @return An unsubscribe function that can be called to cancel
     * the snapshot listener.
     */
    onSnapshot(observer: {
      next?: (snapshot: DocumentSnapshot) => void;
      error?: (error: FirestoreError) => void;
      complete?: () => void;
    }): () => void;
    /**
     * Attaches a listener for DocumentSnapshot events. You may either pass
     * individual `onNext` and `onError` callbacks or pass a single observer
     * object with `next` and `error` callbacks.
     *
     * NOTE: Although an `onCompletion` callback can be provided, it will
     * never be called because the snapshot stream is never-ending.
     *
     * @param options Options controlling the listen behavior.
     * @param observer A single object containing `next` and `error` callbacks.
     * @return An unsubscribe function that can be called to cancel
     * the snapshot listener.
     */
    onSnapshot(
      options: SnapshotListenOptions,
      observer: {
        next?: (snapshot: DocumentSnapshot) => void;
        error?: (error: Error) => void;
        complete?: () => void;
      }
    ): () => void;
    /**
     * Attaches a listener for DocumentSnapshot events. You may either pass
     * individual `onNext` and `onError` callbacks or pass a single observer
     * object with `next` and `error` callbacks.
     *
     * NOTE: Although an `onCompletion` callback can be provided, it will
     * never be called because the snapshot stream is never-ending.
     *
     * @param onNext A callback to be called every time a new `DocumentSnapshot`
     * is available.
     * @param onError A callback to be called if the listen fails or is
     * cancelled. No further callbacks will occur.
     * @return An unsubscribe function that can be called to cancel
     * the snapshot listener.
     */
    onSnapshot(
      onNext: (snapshot: DocumentSnapshot) => void,
      onError?: (error: Error) => void,
      onCompletion?: () => void
    ): () => void;
    /**
     * Attaches a listener for DocumentSnapshot events. You may either pass
     * individual `onNext` and `onError` callbacks or pass a single observer
     * object with `next` and `error` callbacks.
     *
     * NOTE: Although an `onCompletion` callback can be provided, it will
     * never be called because the snapshot stream is never-ending.
     *
     * @param options Options controlling the listen behavior.
     * @param onNext A callback to be called every time a new `DocumentSnapshot`
     * is available.
     * @param onError A callback to be called if the listen fails or is
     * cancelled. No further callbacks will occur.
     * @return An unsubscribe function that can be called to cancel
     * the snapshot listener.
     */
    onSnapshot(
      options: SnapshotListenOptions,
      onNext: (snapshot: DocumentSnapshot) => void,
      onError?: (error: Error) => void,
      onCompletion?: () => void
    ): () => void;
  }

  /**
   * Options that configure how data is retrieved from a `DocumentSnapshot`
   * (e.g. the desired behavior for server timestamps that have not yet been set
   * to their final value).
   */
  export interface SnapshotOptions {
    /**
     * If set, controls the return value for server timestamps that have not yet
     * been set to their final value.
     *
     * By specifying 'estimate', pending server timestamps return an estimate
     * based on the local clock. This estimate will differ from the final value
     * and cause these values to change once the server result becomes available.
     *
     * By specifying 'previous', pending timestamps will be ignored and return
     * their previous value instead.
     *
     * If omitted or set to 'none', `null` will be returned by default until the
     * server value becomes available.
     */
    readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
  }

  /**
   * Metadata about a snapshot, describing the state of the snapshot.
   */
  export interface SnapshotMetadata {
    /**
     * True if the snapshot contains the result of local writes (e.g. set() or
     * update() calls) that have not yet been committed to the backend.
     * If your listener has opted into metadata updates (via
     * `SnapshotListenOptions`) you will receive another
     * snapshot with `hasPendingWrites` equal to false once the writes have been
     * committed to the backend.
     */
    readonly hasPendingWrites: boolean;

    /**
     * True if the snapshot includes local writes (`set()` or
     * `update()` calls) that haven't been committed to the backend yet.
     * If your listener has opted into
     * metadata updates (via `SnapshotListenOptions`)
     * you will receive another snapshot with `fromCache` equal to false once
     * the client has received up-to-date data from the backend.
     */
    readonly fromCache: boolean;

    /**
     * Returns true if this `SnapshotMetadata` is equal to the provided one.
     *
     * @param other The `SnapshotMetadata` to compare against.
     * @return true if this `SnapshotMetadata` is equal to the provided one.
     */
    isEqual(other: SnapshotMetadata): boolean;
  }

  /**
   * A `DocumentSnapshot` contains data read from a document in your Firestore
   * database. The data can be extracted with `.data()` or `.get(<field>)` to
   * get a specific field.
   *
   * For a `DocumentSnapshot` that points to a non-existing document, any data
   * access will return 'undefined'. You can use the `exists` property to
   * explicitly verify a document's existence.
   */
  export class DocumentSnapshot {
    protected constructor();

    /**
     * Property of the `DocumentSnapshot` that signals whether or not the data
     * exists. True if the document exists.
     */
    readonly exists: boolean;
    /**
     * The `DocumentReference` for the document included in the `DocumentSnapshot`.
     */
    readonly ref: DocumentReference;
    /**
     * Property of the `DocumentSnapshot` that provides the document's ID.
     */
    readonly id: string;
    /**
     *  Metadata about the `DocumentSnapshot`, including information about its
     *  source and local modifications.
     */
    readonly metadata: SnapshotMetadata;

    /**
     * Retrieves all fields in the document as an Object. Returns 'undefined' if
     * the document doesn't exist.
     *
     * By default, `FieldValue.serverTimestamp()` values that have not yet been
     * set to their final value will be returned as `null`. You can override
     * this by passing an options object.
     *
     * @param options An options object to configure how data is retrieved from
     * the snapshot (e.g. the desired behavior for server timestamps that have
     * not yet been set to their final value).
     * @return An Object containing all fields in the document or 'undefined' if
     * the document doesn't exist.
     */
    data(options?: SnapshotOptions): DocumentData | undefined;

    /**
     * Retrieves the field specified by `fieldPath`. Returns `undefined` if the
     * document or field doesn't exist.
     *
     * By default, a `FieldValue.serverTimestamp()` that has not yet been set to
     * its final value will be returned as `null`. You can override this by
     * passing an options object.
     *
     * @param fieldPath The path (e.g. 'foo' or 'foo.bar') to a specific field.
     * @param options An options object to configure how the field is retrieved
     * from the snapshot (e.g. the desired behavior for server timestamps that have
     * not yet been set to their final value).
     * @return The data at the specified field location or undefined if no such
     * field exists in the document.
     */
    get(fieldPath: string | FieldPath, options?: SnapshotOptions): any;

    /**
     * Returns true if this `DocumentSnapshot` is equal to the provided one.
     *
     * @param other The `DocumentSnapshot` to compare against.
     * @return true if this `DocumentSnapshot` is equal to the provided one.
     */
    isEqual(other: DocumentSnapshot): boolean;
  }

  /**
   * A `QueryDocumentSnapshot` contains data read from a document in your
   * Firestore database as part of a query. The document is guaranteed to exist
   * and its data can be extracted with `.data()` or `.get(<field>)` to get a
   * specific field.
   *
   * A `QueryDocumentSnapshot` offers the same API surface as a
   * `DocumentSnapshot`. Since query results contain only existing documents, the
   * `exists` property will always be true and `data()` will never return
   * 'undefined'.
   */
  export class QueryDocumentSnapshot extends DocumentSnapshot {
    private constructor();

    /**
     * Retrieves all fields in the document as an Object.
     *
     * By default, `FieldValue.serverTimestamp()` values that have not yet been
     * set to their final value will be returned as `null`. You can override
     * this by passing an options object.
     *
     * @override
     * @param options An options object to configure how data is retrieved from
     * the snapshot (e.g. the desired behavior for server timestamps that have
     * not yet been set to their final value).
     * @return An Object containing all fields in the document.
     */
    data(options?: SnapshotOptions): DocumentData;
  }

  /**
   * The direction of a `Query.orderBy()` clause is specified as 'desc' or 'asc'
   * (descending or ascending).
   */
  export type OrderByDirection = 'desc' | 'asc';

  /**
   * Filter conditions in a `Query.where()` clause are specified using the
   * strings '<', '<=', '==', '>=', '>', and 'array-contains'.
   */
  export type WhereFilterOp = '<' | '<=' | '==' | '>=' | '>' | 'array-contains';

  /**
   * A `Query` refers to a Query which you can read or listen to. You can also
   * construct refined `Query` objects by adding filters and ordering.
   */
  export class Query {
    protected constructor();

    /**
     * The `Firestore` for the Firestore database (useful for performing
     * transactions, etc.).
     */
    readonly firestore: Firestore;

    /**
     * Creates and returns a new Query with the additional filter that documents
     * must contain the specified field and the value should satisfy the
     * relation constraint provided.
     *
     * @param fieldPath The path to compare
     * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=").
     * @param value The value for comparison
     * @return The created Query.
     */
    where(
      fieldPath: string | FieldPath,
      opStr: WhereFilterOp,
      value: any
    ): Query;

    /**
     * Creates and returns a new Query that's additionally sorted by the
     * specified field, optionally in descending order instead of ascending.
     *
     * @param fieldPath The field to sort by.
     * @param directionStr Optional direction to sort by (`asc` or `desc`). If
     * not specified, order will be ascending.
     * @return The created Query.
     */
    orderBy(
      fieldPath: string | FieldPath,
      directionStr?: OrderByDirection
    ): Query;

    /**
     * Creates and returns a new Query where the results are limited to the
     * specified number of documents.
     *
     * @param limit The maximum number of items to return.
     * @return The created Query.
     */
    limit(limit: number): Query;

    /**
     * Creates and returns a new Query that starts at the provided document
     * (inclusive). The starting position is relative to the order of the query.
     * The document must contain all of the fields provided in the `orderBy` of
     * this query.
     *
     * @param snapshot The snapshot of the document to start at.
     * @return The created Query.
     */
    startAt(snapshot: DocumentSnapshot): Query;

    /**
     * Creates and returns a new Query that starts at the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to start this query at, in order
     * of the query's order by.
     * @return The created Query.
     */
    startAt(...fieldValues: any[]): Query;

    /**
     * Creates and returns a new Query that starts after the provided document
     * (exclusive). The starting position is relative to the order of the query.
     * The document must contain all of the fields provided in the orderBy of
     * this query.
     *
     * @param snapshot The snapshot of the document to start after.
     * @return The created Query.
     */
    startAfter(snapshot: DocumentSnapshot): Query;

    /**
     * Creates and returns a new Query that starts after the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to start this query after, in order
     * of the query's order by.
     * @return The created Query.
     */
    startAfter(...fieldValues: any[]): Query;

    /**
     * Creates and returns a new Query that ends before the provided document
     * (exclusive). The end position is relative to the order of the query. The
     * document must contain all of the fields provided in the orderBy of this
     * query.
     *
     * @param snapshot The snapshot of the document to end before.
     * @return The created Query.
     */
    endBefore(snapshot: DocumentSnapshot): Query;

    /**
     * Creates and returns a new Query that ends before the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to end this query before, in order
     * of the query's order by.
     * @return The created Query.
     */
    endBefore(...fieldValues: any[]): Query;

    /**
     * Creates and returns a new Query that ends at the provided document
     * (inclusive). The end position is relative to the order of the query. The
     * document must contain all of the fields provided in the orderBy of this
     * query.
     *
     * @param snapshot The snapshot of the document to end at.
     * @return The created Query.
     */
    endAt(snapshot: DocumentSnapshot): Query;

    /**
     * Creates and returns a new Query that ends at the provided fields
     * relative to the order of the query. The order of the field values
     * must match the order of the order by clauses of the query.
     *
     * @param fieldValues The field values to end this query at, in order
     * of the query's order by.
     * @return The created Query.
     */
    endAt(...fieldValues: any[]): Query;

    /**
     * Returns true if this `Query` is equal to the provided one.
     *
     * @param other The `Query` to compare against.
     * @return true if this `Query` is equal to the provided one.
     */
    isEqual(other: Query): boolean;

    /**
     * Executes the query and returns the results as a `QuerySnapshot`.
     *
     * Note: By default, get() attempts to provide up-to-date data when possible
     * by waiting for data from the server, but it may return cached data or fail
     * if you are offline and the server cannot be reached. This behavior can be
     * altered via the `GetOptions` parameter.
     *
     * @param options An object to configure the get behavior.
     * @return A Promise that will be resolved with the results of the Query.
     */
    get(options?: GetOptions): Promise<QuerySnapshot>;

    /**
     * Attaches a listener for QuerySnapshot events. You may either pass
     * individual `onNext` and `onError` callbacks or pass a single observer
     * object with `next` and `error` callbacks. The listener can be cancelled by
     * calling the function that is returned when `onSnapshot` is called.
     *
     * NOTE: Although an `onCompletion` callback can be provided, it will
     * never be called because the snapshot stream is never-ending.
     *
     * @param observer A single object containing `next` and `error` callbacks.
     * @return An unsubscribe function that can be called to cancel
     * the snapshot listener.
     */
    onSnapshot(observer: {
      next?: (snapshot: QuerySnapshot) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }): () => void;
    /**
     * Attaches a listener for QuerySnapshot events. You may either pass
     * individual `onNext` and `onError` callbacks or pass a single observer
     * object with `next` and `error` callbacks. The listener can be cancelled by
     * calling the function that is returned when `onSnapshot` is called.
     *
     * NOTE: Although an `onCompletion` callback can be provided, it will
     * never be called because the snapshot stream is never-ending.
     *
     * @param options Options controlling the listen behavior.
     * @param observer A single object containing `next` and `error` callbacks.
     * @return An unsubscribe function that can be called to cancel
     * the snapshot listener.
     */
    onSnapshot(
      options: SnapshotListenOptions,
      observer: {
        next?: (snapshot: QuerySnapshot) => void;
        error?: (error: Error) => void;
        complete?: () => void;
      }
    ): () => void;
    /**
     * Attaches a listener for QuerySnapshot events. You may either pass
     * individual `onNext` and `onError` callbacks or pass a single observer
     * object with `next` and `error` callbacks. The listener can be cancelled by
     * calling the function that is returned when `onSnapshot` is called.
     *
     * NOTE: Although an `onCompletion` callback can be provided, it will
     * never be called because the snapshot stream is never-ending.
     *
     * @param onNext A callback to be called every time a new `QuerySnapshot`
     * is available.
     * @param onError A callback to be called if the listen fails or is
     * cancelled. No further callbacks will occur.
     * @return An unsubscribe function that can be called to cancel
     * the snapshot listener.
     */
    onSnapshot(
      onNext: (snapshot: QuerySnapshot) => void,
      onError?: (error: Error) => void,
      onCompletion?: () => void
    ): () => void;
    /**
     * Attaches a listener for QuerySnapshot events. You may either pass
     * individual `onNext` and `onError` callbacks or pass a single observer
     * object with `next` and `error` callbacks. The listener can be cancelled by
     * calling the function that is returned when `onSnapshot` is called.
     *
     * NOTE: Although an `onCompletion` callback can be provided, it will
     * never be called because the snapshot stream is never-ending.
     *
     * @param options Options controlling the listen behavior.
     * @param onNext A callback to be called every time a new `QuerySnapshot`
     * is available.
     * @param onError A callback to be called if the listen fails or is
     * cancelled. No further callbacks will occur.
     * @return An unsubscribe function that can be called to cancel
     * the snapshot listener.
     */
    onSnapshot(
      options: SnapshotListenOptions,
      onNext: (snapshot: QuerySnapshot) => void,
      onError?: (error: Error) => void,
      onCompletion?: () => void
    ): () => void;
  }

  /**
   * A `QuerySnapshot` contains zero or more `DocumentSnapshot` objects
   * representing the results of a query. The documents can be accessed as an
   * array via the `docs` property or enumerated using the `forEach` method. The
   * number of documents can be determined via the `empty` and `size`
   * properties.
   */
  export class QuerySnapshot {
    private constructor();

    /**
     * The query on which you called `get` or `onSnapshot` in order to get this
     * `QuerySnapshot`.
     */
    readonly query: Query;
    /**
     * Metadata about this snapshot, concerning its source and if it has local
     * modifications.
     */
    readonly metadata: SnapshotMetadata;

    /** An array of all the documents in the `QuerySnapshot`. */
    readonly docs: QueryDocumentSnapshot[];

    /** The number of documents in the `QuerySnapshot`. */
    readonly size: number;

    /** True if there are no documents in the `QuerySnapshot`. */
    readonly empty: boolean;

    /**
     * Returns an array of the documents changes since the last snapshot. If this
     * is the first snapshot, all documents will be in the list as added changes.
     *
     * @param options `SnapshotListenOptions` that control whether metadata-only
     * changes (i.e. only `DocumentSnapshot.metadata` changed) should trigger
     * snapshot events.
     */
    docChanges(options?: SnapshotListenOptions): DocumentChange[];

    /**
     * Enumerates all of the documents in the `QuerySnapshot`.
     *
     * @param callback A callback to be called with a `QueryDocumentSnapshot` for
     * each document in the snapshot.
     * @param thisArg The `this` binding for the callback.
     */
    forEach(
      callback: (result: QueryDocumentSnapshot) => void,
      thisArg?: any
    ): void;

    /**
     * Returns true if this `QuerySnapshot` is equal to the provided one.
     *
     * @param other The `QuerySnapshot` to compare against.
     * @return true if this `QuerySnapshot` is equal to the provided one.
     */
    isEqual(other: QuerySnapshot): boolean;
  }

  /**
   * The type of of a `DocumentChange` may be 'added', 'removed', or 'modified'.
   */
  export type DocumentChangeType = 'added' | 'removed' | 'modified';

  /**
   * A `DocumentChange` represents a change to the documents matching a query.
   * It contains the document affected and the type of change that occurred.
   */
  export interface DocumentChange {
    /** The type of change ('added', 'modified', or 'removed'). */
    readonly type: DocumentChangeType;

    /** The document affected by this change. */
    readonly doc: QueryDocumentSnapshot;

    /**
     * The index of the changed document in the result set immediately prior to
     * this `DocumentChange` (i.e. supposing that all prior `DocumentChange` objects
     * have been applied). Is -1 for 'added' events.
     */
    readonly oldIndex: number;

    /**
     * The index of the changed document in the result set immediately after
     * this `DocumentChange` (i.e. supposing that all prior `DocumentChange`
     * objects and the current `DocumentChange` object have been applied).
     * Is -1 for 'removed' events.
     */
    readonly newIndex: number;
  }

  /**
   * A `CollectionReference` object can be used for adding documents, getting
   * document references, and querying for documents (using the methods
   * inherited from `Query`).
   */
  export class CollectionReference extends Query {
    private constructor();

    /** The collection's identifier. */
    readonly id: string;

    /**
     * A reference to the containing `DocumentReference` if this is a subcollection.
     * If this isn't a subcollection, the reference is null.
     */
    readonly parent: DocumentReference | null;

    /**
     * A string representing the path of the referenced collection (relative
     * to the root of the database).
     */
    readonly path: string;

    /**
     * Get a `DocumentReference` for the document within the collection at the
     * specified path. If no path is specified, an automatically-generated
     * unique ID will be used for the returned DocumentReference.
     *
     * @param documentPath A slash-separated path to a document.
     * @return The `DocumentReference` instance.
     */
    doc(documentPath?: string): DocumentReference;

    /**
     * Add a new document to this collection with the specified data, assigning
     * it a document ID automatically.
     *
     * @param data An Object containing the data for the new document.
     * @return A Promise resolved with a `DocumentReference` pointing to the
     * newly created document after it has been written to the backend.
     */
    add(data: DocumentData): Promise<DocumentReference>;

    /**
     * Returns true if this `CollectionReference` is equal to the provided one.
     *
     * @param other The `CollectionReference` to compare against.
     * @return true if this `CollectionReference` is equal to the provided one.
     */
    isEqual(other: CollectionReference): boolean;
  }

  /**
   * Sentinel values that can be used when writing document fields with `set()`
   * or `update()`.
   */
  export class FieldValue {
    private constructor();

    /**
     * Returns a sentinel used with `set()` or `update()` to include a
     * server-generated timestamp in the written data.
     */
    static serverTimestamp(): FieldValue;

    /**
     * Returns a sentinel for use with `update()` to mark a field for deletion.
     */
    static delete(): FieldValue;

    /**
     * Returns a special value that can be used with `set()` or `update()` that tells
     * the server to union the given elements with any array value that already
     * exists on the server. Each specified element that doesn't already exist in
     * the array will be added to the end. If the field being modified is not
     * already an array it will be overwritten with an array containing exactly
     * the specified elements.
     *
     * @param elements The elements to union into the array.
     * @return The FieldValue sentinel for use in a call to `set()` or `update()`.
     */
    static arrayUnion(...elements: any[]): FieldValue;

    /**
     * Returns a special value that can be used with `set()` or `update()` that tells
     * the server to remove the given elements from any array value that already
     * exists on the server. All instances of each element specified will be
     * removed from the array. If the field being modified is not already an
     * array it will be overwritten with an empty array.
     *
     * @param elements The elements to remove from the array.
     * @return The FieldValue sentinel for use in a call to `set()` or `update()`.
     */
    static arrayRemove(...elements: any[]): FieldValue;

    /**
     * Returns a special value that can be used with set() or update() that tells
     * the server to increment the field's current value by the given value.
     *
     * If either the operand or the current field value uses floating point
     * precision, all arithmetic will follow IEEE 754 semantics. If both values
     * are integers, values outside of JavaScript's safe number range
     * (`Number.MIN_SAFE_INTEGER` to `Number.MAX_SAFE_INTEGER`) are also subject
     * to precision loss. Furthermore, once processed by the Firestore backend,
     * all integer operations are capped between -2^63 and 2^63-1.
     *
     * If the current field value is not of type 'number', or if the field does
     * not yet exist, the transformation will set the field to the given value.
     *
     * @param n The value to increment by.
     * @return The FieldValue sentinel for use in a call to set() or update().
     */
    static increment(n: number): FieldValue;

    /**
     * Returns true if this `FieldValue` is equal to the provided one.
     *
     * @param other The `FieldValue` to compare against.
     * @return true if this `FieldValue` is equal to the provided one.
     */
    isEqual(other: FieldValue): boolean;
  }

  /**
   * A FieldPath refers to a field in a document. The path may consist of a
   * single field name (referring to a top-level field in the document), or a
   * list of field names (referring to a nested field in the document).
   *
   * Create a FieldPath by providing field names. If more than one field
   * name is provided, the path will point to a nested field in a document.
   *
   */
  export class FieldPath {
    /**
     * Creates a FieldPath from the provided field names. If more than one field
     * name is provided, the path will point to a nested field in a document.
     *
     * @param fieldNames A list of field names.
     */
    constructor(...fieldNames: string[]);

    /**
     * Returns a special sentinel `FieldPath` to refer to the ID of a document.
     * It can be used in queries to sort or filter by the document ID.
     */
    static documentId(): FieldPath;

    /**
     * Returns true if this `FieldPath` is equal to the provided one.
     *
     * @param other The `FieldPath` to compare against.
     * @return true if this `FieldPath` is equal to the provided one.
     */
    isEqual(other: FieldPath): boolean;
  }

  /**
   * The set of Firestore status codes. The codes are the same at the ones
   * exposed by gRPC here:
   * https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
   *
   * Possible values:
   * - 'cancelled': The operation was cancelled (typically by the caller).
   * - 'unknown': Unknown error or an error from a different error domain.
   * - 'invalid-argument': Client specified an invalid argument. Note that this
   *   differs from 'failed-precondition'. 'invalid-argument' indicates
   *   arguments that are problematic regardless of the state of the system
   *   (e.g. an invalid field name).
   * - 'deadline-exceeded': Deadline expired before operation could complete.
   *   For operations that change the state of the system, this error may be
   *   returned even if the operation has completed successfully. For example,
   *   a successful response from a server could have been delayed long enough
   *   for the deadline to expire.
   * - 'not-found': Some requested document was not found.
   * - 'already-exists': Some document that we attempted to create already
   *   exists.
   * - 'permission-denied': The caller does not have permission to execute the
   *   specified operation.
   * - 'resource-exhausted': Some resource has been exhausted, perhaps a
   *   per-user quota, or perhaps the entire file system is out of space.
   * - 'failed-precondition': Operation was rejected because the system is not
   *   in a state required for the operation's execution.
   * - 'aborted': The operation was aborted, typically due to a concurrency
   *   issue like transaction aborts, etc.
   * - 'out-of-range': Operation was attempted past the valid range.
   * - 'unimplemented': Operation is not implemented or not supported/enabled.
   * - 'internal': Internal errors. Means some invariants expected by
   *   underlying system has been broken. If you see one of these errors,
   *   something is very broken.
   * - 'unavailable': The service is currently unavailable. This is most likely
   *   a transient condition and may be corrected by retrying with a backoff.
   * - 'data-loss': Unrecoverable data loss or corruption.
   * - 'unauthenticated': The request does not have valid authentication
   *   credentials for the operation.
   */
  export type FirestoreErrorCode =
    | 'cancelled'
    | 'unknown'
    | 'invalid-argument'
    | 'deadline-exceeded'
    | 'not-found'
    | 'already-exists'
    | 'permission-denied'
    | 'resource-exhausted'
    | 'failed-precondition'
    | 'aborted'
    | 'out-of-range'
    | 'unimplemented'
    | 'internal'
    | 'unavailable'
    | 'data-loss'
    | 'unauthenticated';

  /** An error returned by a Firestore operation. */
  // TODO(b/63008957): FirestoreError should extend firebase.FirebaseError
  export interface FirestoreError {
    code: FirestoreErrorCode;
    message: string;
    name: string;
    stack?: string;
  }
}

export = firebase;
export as namespace firebase;
