/**
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
 * @fileoverview Firebase Auth API.
 * Version: ${JSCORE_VERSION}
 *
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @externs
 */

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
 * // Get the Auth service for the default app
 * var defaultAuth = firebase.auth();
 *
 * @example
 * // Get the Auth service for a given app
 * var otherAuth = firebase.auth(otherApp);
 *
 * @namespace
 * @param {!firebase.app.App=} app
 *
 * @return {!firebase.auth.Auth}
 */
firebase.auth = function(app) {};

/**
 * Interface that represents the credentials returned by an auth provider.
 * Implementations specify the details about each auth provider's credential
 * requirements.
 *
 * @interface
 */
firebase.auth.AuthCredential = function() {};

/**
 * The authentication provider ID for the credential.
 * For example, 'facebook.com', or 'google.com'.
 *
 * @type {string}
 */
firebase.auth.AuthCredential.prototype.providerId;

/**
 * Interface that represents the OAuth credentials returned by an OAuth
 * provider. Implementations specify the details about each auth provider's
 * credential requirements.
 *
 * @interface
 * @extends {firebase.auth.AuthCredential}
 */
firebase.auth.OAuthCredential = function() {};

/**
 * The OAuth ID token associated with the credential if it belongs to an
 * OIDC provider, such as `google.com`.
 *
 * @type {?string|undefined}
 */
firebase.auth.OAuthCredential.prototype.idToken;

/**
 * The OAuth access token associated with the credential if it belongs to an
 * OAuth provider, such as `facebook.com`, `twitter.com`, etc.
 *
 * @type {?string|undefined}
 */
firebase.auth.OAuthCredential.prototype.accessToken;

/**
 * The OAuth access token secret associated with the credential if it belongs
 * to an OAuth 1.0 provider, such as `twitter.com`.
 *
 * @type {?string|undefined}
 */
firebase.auth.OAuthCredential.prototype.secret;

/**
 * Gets the {@link firebase.auth.Auth `Auth`} service for the current app.
 *
 * @example
 * var auth = app.auth();
 * // The above is shorthand for:
 * // var auth = firebase.auth(app);
 *
 * @return {!firebase.auth.Auth}
 */
firebase.app.App.prototype.auth = function() {};

/**
 * Interface representing a user's metadata.
 *
 * @interface
 */
firebase.auth.UserMetadata = function() {};

/**
 * The date the user last signed in, formatted as a UTC string.
 * For example, 'Fri, 22 Sep 2017 01:49:58 GMT'.
 *
 * @type {?string}
 */
firebase.auth.UserMetadata.prototype.lastSignInTime;

/**
 * The date the user was created, formatted as a UTC string.
 * For example, 'Fri, 22 Sep 2017 01:49:58 GMT'.
 *
 * @type {?string}
 */
firebase.auth.UserMetadata.prototype.creationTime;

/**
 * User profile information, visible only to the Firebase project's
 * apps.
 *
 * @interface
 */
firebase.UserInfo = function() {};

/**
 * The user's unique ID.
 *
 * @type {string}
 */
firebase.UserInfo.prototype.uid;

/**
 * The authentication provider ID for the current user.
 * For example, 'facebook.com', or 'google.com'.
 *
 * @type {string}
 */
firebase.UserInfo.prototype.providerId;

/**
 * The user's email address (if available).
 * @type {?string}
 */
firebase.UserInfo.prototype.email;

/**
 * The user's display name (if available).
 *
 * @type {?string}
 */
firebase.UserInfo.prototype.displayName;

/**
 * The URL of the user's profile picture (if available).
 *
 * @type {?string}
 */
firebase.UserInfo.prototype.photoURL;

/**
 * The user's E.164 formatted phone number (if available).
 *
 * @type {?string}
 */
firebase.UserInfo.prototype.phoneNumber;

/**
 * A user account.
 *
 * @interface
 * @extends {firebase.UserInfo}
 */
firebase.User = function() {};

/**
 * The phone number normalized based on the E.164 standard (e.g. +16505550101)
 * for the current user. This is null if the user has no phone credential linked
 * to the account.
 * @type {?string}
 */
firebase.User.prototype.phoneNumber;

/** @type {boolean} */
firebase.User.prototype.isAnonymous;

/**
 * True if the user's email address has been verified.
 * @type {boolean}
 */
firebase.User.prototype.emailVerified;

/**
 * Additional metadata about the user.
 * @type {!firebase.auth.UserMetadata}
 */
firebase.User.prototype.metadata;

/**
 * Additional provider-specific information about the user.
 * @type {!Array<firebase.UserInfo>}
 */
firebase.User.prototype.providerData;

/**
 * A refresh token for the user account. Use only for advanced scenarios that
 * require explicitly refreshing tokens.
 * @type {string}
 */
firebase.User.prototype.refreshToken;

/**
 * Returns a JWT token used to identify the user to a Firebase service.
 *
 * Returns the current token if it has not expired, otherwise this will
 * refresh the token and return a new one.
 *
 * This property is deprecated. Use {@link firebase.User#getIdToken} instead.
 *
 * @param {boolean=} forceRefresh Force refresh regardless of token
 *     expiration.
 * @return {!firebase.Promise<string>}
 * @deprecated
 */
firebase.User.prototype.getToken = function(forceRefresh) {};

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
firebase.User.prototype.getIdToken = function(forceRefresh) {};

/**
 * Refreshes the current user, if signed in.
 *
 * @return {!firebase.Promise<void>}
 */
firebase.User.prototype.reload = function() {};

/**
 * Sends a verification email to a user.
 *
 * The verification process is completed by calling
 * {@link firebase.auth.Auth#applyActionCode}
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
firebase.User.prototype.sendEmailVerification = function(actionCodeSettings) {};

/**
 * Links the user account with the given credentials.
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
 *     via {@link firebase.auth.Auth#signInWithCredential}.</dd>
 * <dt>auth/email-already-in-use</dt>
 * <dd>Thrown if the email corresponding to the credential already exists
 *     among your users. When thrown while linking a credential to an existing
 *     user, an <code>error.email</code> and <code>error.credential</code>
 *     ({@link firebase.auth.AuthCredential}) fields are also provided.
 *     You have to link the credential to the existing user with that email if
 *     you wish to continue signing in with that credential. To do so, call
 *     {@link firebase.auth.Auth#fetchProvidersForEmail}, sign in to
 *     <code>error.email</code> via one of the providers returned and then
 *     {@link firebase.User#linkWithCredential} the original credential to that
 *     newly signed in user.</dd>
 * <dt>auth/operation-not-allowed</dt>
 * <dd>Thrown if you have not enabled the provider in the Firebase Console. Go
 *     to the Firebase Console for your project, in the Auth section and the
 *     <strong>Sign in Method</strong> tab and configure the provider.</dd>
 * <dt>auth/invalid-email</dt>
 * <dd>Thrown if the email used in a
 *     {@link firebase.auth.EmailAuthProvider#credential} is invalid.</dd>
 * <dt>auth/wrong-password</dt>
 * <dd>Thrown if the password used in a
 *     {@link firebase.auth.EmailAuthProvider#credential} is not correct or
 *     when the user associated with the email does not have a password.</dd>
 * <dt>auth/invalid-verification-code</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential} and the verification
 *     code of the credential is not valid.</dd>
 * <dt>auth/invalid-verification-id</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential}  and the verification
 *     ID of the credential is not valid.</dd>
 * </dl>
 *
 * @param {!firebase.auth.AuthCredential} credential The auth credential.
 * @return {!firebase.Promise<!firebase.User>}
 */
firebase.User.prototype.linkWithCredential = function(credential) {};

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
 *     via {@link firebase.auth.Auth#signInWithCredential}.</dd>
 * <dt>auth/email-already-in-use</dt>
 * <dd>Thrown if the email corresponding to the credential already exists
 *     among your users. When thrown while linking a credential to an existing
 *     user, an <code>error.email</code> and <code>error.credential</code>
 *     ({@link firebase.auth.AuthCredential}) fields are also provided.
 *     You have to link the credential to the existing user with that email if
 *     you wish to continue signing in with that credential. To do so, call
 *     {@link firebase.auth.Auth#fetchProvidersForEmail}, sign in to
 *     <code>error.email</code> via one of the providers returned and then
 *     {@link firebase.User#linkWithCredential} the original credential to that
 *     newly signed in user.</dd>
 * <dt>auth/operation-not-allowed</dt>
 * <dd>Thrown if you have not enabled the provider in the Firebase Console. Go
 *     to the Firebase Console for your project, in the Auth section and the
 *     <strong>Sign in Method</strong> tab and configure the provider.</dd>
 * <dt>auth/invalid-email</dt>
 * <dd>Thrown if the email used in a
 *     {@link firebase.auth.EmailAuthProvider#credential} is invalid.</dd>
 * <dt>auth/wrong-password</dt>
 * <dd>Thrown if the password used in a
 *     {@link firebase.auth.EmailAuthProvider#credential} is not correct or
 *     when the user associated with the email does not have a password.</dd>
 * <dt>auth/invalid-verification-code</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential} and the verification
 *     code of the credential is not valid.</dd>
 * <dt>auth/invalid-verification-id</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential}  and the verification
 *     ID of the credential is not valid.</dd>
 * </dl>
 *
 * @param {!firebase.auth.AuthCredential} credential The auth credential.
 * @return {!firebase.Promise<!firebase.auth.UserCredential>}
 */
firebase.User.prototype.linkAndRetrieveDataWithCredential = function(
  credential
) {};

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
 *     {@link firebase.auth.Auth#signInWithCredential}.</dd>
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
firebase.User.prototype.linkWithPhoneNumber = function(
  phoneNumber,
  applicationVerifier
) {};

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
firebase.User.prototype.unlink = function(providerId) {};

/**
 * Re-authenticates a user using a fresh credential. Use before operations
 * such as {@link firebase.User#updatePassword} that require tokens from recent
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
 *     {@link firebase.auth.EmailAuthProvider#credential} is invalid.</dd>
 * <dt>auth/wrong-password</dt>
 * <dd>Thrown if the password used in a
 *     {@link firebase.auth.EmailAuthProvider#credential} is not correct or when
 *     the user associated with the email does not have a password.</dd>
 * <dt>auth/invalid-verification-code</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential} and the verification
 *     code of the credential is not valid.</dd>
 * <dt>auth/invalid-verification-id</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential}  and the verification
 *     ID of the credential is not valid.</dd>
 * </dl>
 *
 * @param {!firebase.auth.AuthCredential} credential
 * @return {!firebase.Promise<void>}
 */
firebase.User.prototype.reauthenticateWithCredential = function(credential) {};

/**
 * Re-authenticates a user using a fresh credential, and returns any available
 * additional user information, such as user name. Use before operations
 * such as {@link firebase.User#updatePassword} that require tokens from recent
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
 *     {@link firebase.auth.EmailAuthProvider#credential} is invalid.</dd>
 * <dt>auth/wrong-password</dt>
 * <dd>Thrown if the password used in a
 *     {@link firebase.auth.EmailAuthProvider#credential} is not correct or when
 *     the user associated with the email does not have a password.</dd>
 * <dt>auth/invalid-verification-code</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential} and the verification
 *     code of the credential is not valid.</dd>
 * <dt>auth/invalid-verification-id</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential}  and the verification
 *     ID of the credential is not valid.</dd>
 * </dl>
 *
 * @param {!firebase.auth.AuthCredential} credential
 * @return {!firebase.Promise<!firebase.auth.UserCredential>}
 */
firebase.User.prototype.reauthenticateAndRetrieveDataWithCredential = function(
  credential
) {};

/**
 * Re-authenticates a user using a fresh credential. Use before operations
 * such as {@link firebase.User#updatePassword} that require tokens from recent
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
firebase.User.prototype.reauthenticateWithPhoneNumber = function(
  phoneNumber,
  applicationVerifier
) {};

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
 * {@link firebase.User#reauthenticateWithCredential}.
 *
 * <h4>Error Codes</h4>
 * <dl>
 * <dt>auth/invalid-email</dt>
 * <dd>Thrown if the email used is invalid.</dd>
 * <dt>auth/email-already-in-use</dt>
 * <dd>Thrown if the email is already used by another user.</dd>
 * <dt>auth/requires-recent-login</dt>
 * <dd>Thrown if the user's last sign-in time does not meet the security
 *     threshold. Use {@link firebase.User#reauthenticateWithCredential} to
 *     resolve. This does not apply if the user is anonymous.</dd>
 * </dl>
 *
 * @param {string} newEmail The new email address.
 * @return {!firebase.Promise<void>}
 */
firebase.User.prototype.updateEmail = function(newEmail) {};

/**
 * Updates the user's password.
 *
 * <b>Important:</b> this is a security sensitive operation that requires the
 * user to have recently signed in. If this requirement isn't met, ask the user
 * to authenticate again and then call
 * {@link firebase.User#reauthenticateWithCredential}.
 *
 * <h4>Error Codes</h4>
 * <dl>
 * <dt>auth/weak-password</dt>
 * <dd>Thrown if the password is not strong enough.</dd>
 * <dt>auth/requires-recent-login</dt>
 * <dd>Thrown if the user's last sign-in time does not meet the security
 *     threshold. Use {@link firebase.User#reauthenticateWithCredential} to
 *     resolve. This does not apply if the user is anonymous.</dd>
 * </dl>
 *
 * @param {string} newPassword
 * @return {!firebase.Promise<void>}
 */
firebase.User.prototype.updatePassword = function(newPassword) {};

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
firebase.User.prototype.updatePhoneNumber = function(phoneCredential) {};

/**
 * Updates a user's profile data.
 *
 * @example
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
 *
 * @param {!{displayName: ?string, photoURL: ?string}} profile The profile's
 *     displayName and photoURL to update.
 * @return {!firebase.Promise<void>}
 */
firebase.User.prototype.updateProfile = function(profile) {};

/**
 * Deletes and signs out the user.
 *
 * <b>Important:</b> this is a security sensitive operation that requires the
 * user to have recently signed in. If this requirement isn't met, ask the user
 * to authenticate again and then call
 * {@link firebase.User#reauthenticateWithCredential}.
 *
 * <h4>Error Codes</h4>
 * <dl>
 * <dt>auth/requires-recent-login</dt>
 * <dd>Thrown if the user's last sign-in time does not meet the security
 *     threshold. Use {@link firebase.User#reauthenticateWithCredential} to
 *     resolve. This does not apply if the user is anonymous.</dd>
 * </dl>
 *
 * @return {!firebase.Promise<void>}
 */
firebase.User.prototype.delete = function() {};

/**
 * Returns a JSON-serializable representation of this object.
 *
 * @return {!Object} A JSON-serializable representation of this object.
 */
firebase.User.prototype.toJSON = function() {};

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
 * @interface
 */
firebase.auth.Auth = function() {};

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
firebase.auth.Auth.prototype.verifyPasswordResetCode = function(code) {};

/**
 * A response from {@link firebase.auth.Auth#checkActionCode}.
 *
 * @interface
 */
firebase.auth.ActionCodeInfo = function() {};

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
 *
 * @typedef {{
 *   email: (?string|undefined),
 *   fromEmail: (?string|undefined)
 * }}
 */
firebase.auth.ActionCodeInfo.prototype.data;

/**
 * The type of operation that generated the action code. This could be:
 * <ul>
 * <li>`PASSWORD_RESET`: password reset code generated via
 *     {@link firebase.auth.Auth#sendPasswordResetEmail}.</li>
 * <li>`VERIFY_EMAIL`: email verification code generated via
 *     {@link firebase.User#sendEmailVerification}.</li>
 * <li>`RECOVER_EMAIL`: email change revocation code generated via
 *     {@link firebase.User#updateEmail}.</li>
 * </ul>
 *
 * @type {string}
 */
firebase.auth.ActionCodeInfo.prototype.operation;

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
 *
 * @typedef {{
 *   url: string,
 *   iOS: ({bundleId: string}|undefined),
 *   android: ({packageName: string, installApp: (boolean|undefined),
 *              minimumVersion: (string|undefined)}|undefined),
 *   handleCodeInApp: (boolean|undefined)
 * }}
 */
firebase.auth.ActionCodeSettings;

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
firebase.auth.Auth.prototype.checkActionCode = function(code) {};

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
 * @return {!firebase.Promise<void>}
 */
firebase.auth.Auth.prototype.applyActionCode = function(code) {};

/**
 * The {@link firebase.app.App app} associated with the `Auth` service
 * instance.
 *
 * @example
 * var app = auth.app;
 *
 * @type {!firebase.app.App}
 */
firebase.auth.Auth.prototype.app;

/**
 * The currently signed-in user (or null).
 *
 * @type {firebase.User|null}
 */
firebase.auth.Auth.prototype.currentUser;

/**
 * @enum {string}
 * An enumeration of the possible persistence mechanism types.
 */
firebase.auth.Auth.Persistence = {
  /**
   * Indicates that the state will be persisted even when the browser window is
   * closed or the activity is destroyed in react-native.
   */
  LOCAL: 'local',
  /**
   * Indicates that the state will only be stored in memory and will be cleared
   * when the window or activity is refreshed.
   */
  NONE: 'none',
  /**
   * Indicates that the state will only persist in current session/tab, relevant
   * to web only, and will be cleared when the tab is closed.
   */
  SESSION: 'session'
};

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
 * firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
 *     .then(function() {
 *   // Existing and future Auth states are now persisted in the current
 *   // session only. Closing the window would clear any existing state even if
 *   // a user forgets to sign out.
 * });
 *
 * @param {!firebase.auth.Auth.Persistence} persistence The auth state
 *     persistence mechanism.
 * @return {!firebase.Promise<void>}
 */
firebase.auth.Auth.prototype.setPersistence = function(persistence) {};

/**
 * The current Auth instance's language code. This is a readable/writable
 * property. When set to null, the default Firebase Console language setting
 * is applied. The language code will propagate to email action templates
 * (password reset, email verification and email change revocation), SMS
 * templates for phone authentication, reCAPTCHA verifier and OAuth
 * popup/redirect operations provided the specified providers support
 * localization with the language code specified.
 *
 * @type {string|null}
 */
firebase.auth.Auth.prototype.languageCode;

/**
 * Sets the current language to the default device/browser preference.
 */
firebase.auth.Auth.prototype.useDeviceLanguage = function() {};

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
 *
 * @param {string} email The user's email address.
 * @param {string} password The user's chosen password.
 * @return {!firebase.Promise<!firebase.User>}
 */
firebase.auth.Auth.prototype.createUserWithEmailAndPassword = function(
  email,
  password
) {};

/**
 * Gets the list of provider IDs that can be used to sign in for the given email
 * address. Useful for an "identifier-first" sign-in flow.
 *
 * <h4>Error Codes</h4>
 * <dl>
 * <dt>auth/invalid-email</dt>
 * <dd>Thrown if the email address is not valid.</dd>
 * </dl>
 *
 * @param {string} email An email address.
 * @return {!firebase.Promise<!Array<string>>}
 */
firebase.auth.Auth.prototype.fetchProvidersForEmail = function(email) {};

/**
 * Adds an observer for changes to the user's sign-in state.
 *
 * Prior to 4.0.0, this triggered the observer when users were signed in,
 * signed out, or when the user's ID token changed in situations such as token
 * expiry or password change. After 4.0.0, the observer is only triggered
 * on sign-in or sign-out.
 *
 * To keep the old behavior, see {@link firebase.auth.Auth#onIdTokenChanged}.
 *
 * @example
 * firebase.auth().onAuthStateChanged(function(user) {
 *   if (user) {
 *     // User is signed in.
 *   }
 * });
 *
 * @param {!firebase.Observer<firebase.User, firebase.auth.Error>|function(?firebase.User)}
 *     nextOrObserver An observer object or a function triggered on change.
 * @param {function(!firebase.auth.Error)=} error Optional A function
 *     triggered on auth error.
 * @param {firebase.CompleteFn=} completed Optional A function triggered when the
 *     observer is removed.
 * @return {!firebase.Unsubscribe} The unsubscribe function for the observer.
 */
firebase.auth.Auth.prototype.onAuthStateChanged = function(
  nextOrObserver,
  error,
  completed
) {};

/**
 * Adds an observer for changes to the signed-in user's ID token, which includes
 * sign-in, sign-out, and token refresh events. This method has the same
 * behavior as {@link firebase.auth.Auth#onAuthStateChanged} had prior to 4.0.0.
 *
 * @example
 * firebase.auth().onIdTokenChanged(function(user) {
 *   if (user) {
 *     // User is signed in or token was refreshed.
 *   }
 * });
 *
 * @param {!firebase.Observer<firebase.User, firebase.auth.Error>|function(?firebase.User)}
 *     nextOrObserver An observer object or a function triggered on change.
 * @param {function(!firebase.auth.Error)=} error Optional A function
 *     triggered on auth error.
 * @param {firebase.CompleteFn=} completed Optional A function triggered when the
 *     observer is removed.
 * @return {!firebase.Unsubscribe} The unsubscribe function for the observer.
 */
firebase.auth.Auth.prototype.onIdTokenChanged = function(
  nextOrObserver,
  error,
  completed
) {};

/**
 * Sends a password reset email to the given email address.
 *
 * To complete the password reset, call
 * {@link firebase.auth.Auth#confirmPasswordReset} with the code supplied in the
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
 * @return {!firebase.Promise<void>}
 */
firebase.auth.Auth.prototype.sendPasswordResetEmail = function(
  email,
  actionCodeSettings
) {};

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
 * @return {!firebase.Promise<void>}
 */
firebase.auth.Auth.prototype.confirmPasswordReset = function(
  code,
  newPassword
) {};

/**
 * Asynchronously signs in with the given credentials.
 *
 * <h4>Error Codes</h4>
 * <dl>
 * <dt>auth/account-exists-with-different-credential</dt>
 * <dd>Thrown if there already exists an account with the email address
 *     asserted by the credential. Resolve this by calling
 *     {@link firebase.auth.Auth#fetchProvidersForEmail} and then asking the
 *     user to sign in using one of the returned providers. Once the user is
 *     signed in, the original credential can be linked to the user with
 *     {@link firebase.User#linkWithCredential}.</dd>
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
 *     {@link firebase.auth.EmailAuthProvider#credential} and there is no user
 *     corresponding to the given email. </dd>
 * <dt>auth/wrong-password</dt>
 * <dd>Thrown if signing in with a credential from
 *     {@link firebase.auth.EmailAuthProvider#credential} and the password is
 *     invalid for the given email, or if the account corresponding to the email
 *     does not have a password set.</dd>
 * <dt>auth/invalid-verification-code</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential} and the verification
 *     code of the credential is not valid.</dd>
 * <dt>auth/invalid-verification-id</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential}  and the verification
 *     ID of the credential is not valid.</dd>
 * </dl>
 *
 * @example
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
 *
 * @param {!firebase.auth.AuthCredential} credential The auth credential.
 * @return {!firebase.Promise<!firebase.User>}
 */
firebase.auth.Auth.prototype.signInWithCredential = function(credential) {};

/**
 * Asynchronously signs in with the given credentials, and returns any available
 * additional user information, such as user name.
 *
 * <h4>Error Codes</h4>
 * <dl>
 * <dt>auth/account-exists-with-different-credential</dt>
 * <dd>Thrown if there already exists an account with the email address
 *     asserted by the credential. Resolve this by calling
 *     {@link firebase.auth.Auth#fetchProvidersForEmail} and then asking the
 *     user to sign in using one of the returned providers. Once the user is
 *     signed in, the original credential can be linked to the user with
 *     {@link firebase.User#linkWithCredential}.</dd>
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
 *     {@link firebase.auth.EmailAuthProvider#credential} and there is no user
 *     corresponding to the given email. </dd>
 * <dt>auth/wrong-password</dt>
 * <dd>Thrown if signing in with a credential from
 *     {@link firebase.auth.EmailAuthProvider#credential} and the password is
 *     invalid for the given email, or if the account corresponding to the email
 *     does not have a password set.</dd>
 * <dt>auth/invalid-verification-code</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential} and the verification
 *     code of the credential is not valid.</dd>
 * <dt>auth/invalid-verification-id</dt>
 * <dd>Thrown if the credential is a
 *     {@link firebase.auth.PhoneAuthProvider#credential}  and the verification
 *     ID of the credential is not valid.</dd>
 * </dl>
 *
 * @example
 * firebase.auth().signInAndRetrieveDataWithCredential(credential)
 *     .then(function(userCredential) {
 *       console.log(userCredential.additionalUserInfo.username);
 *     });
 *
 * @param {!firebase.auth.AuthCredential} credential The auth credential.
 * @return {!firebase.Promise<!firebase.auth.UserCredential>}
 */
firebase.auth.Auth.prototype.signInAndRetrieveDataWithCredential = function(
  credential
) {};

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
 *
 * @param {string} token The custom token to sign in with.
 * @return {!firebase.Promise<!firebase.User>}
 */
firebase.auth.Auth.prototype.signInWithCustomToken = function(token) {};

/**
 * Asynchronously signs in using an email and password.
 *
 * Fails with an error if the email address and password do not match.
 *
 * Note: The user's password is NOT the password used to access the user's email
 * account. The email address serves as a unique identifier for the user, and
 * the password is used to access the user's account in your Firebase project.
 *
 * See also: {@link firebase.auth.Auth#createUserWithEmailAndPassword}.
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
 *
 * @param {string} email The users email address.
 * @param {string} password The users password.
 * @return {!firebase.Promise<!firebase.User>}
 */
firebase.auth.Auth.prototype.signInWithEmailAndPassword = function(
  email,
  password
) {};

/**
 * Asynchronously signs in using a phone number. This method sends a code via
 * SMS to the given phone number, and returns a
 * {@link firebase.auth.ConfirmationResult}. After the user provides the code
 * sent to their phone, call {@link firebase.auth.ConfirmationResult#confirm}
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
 *
 * @param {string} phoneNumber The user's phone number in E.164 format (e.g.
 *     +16505550101).
 * @param {!firebase.auth.ApplicationVerifier} applicationVerifier
 * @return {!firebase.Promise<!firebase.auth.ConfirmationResult>}
 */
firebase.auth.Auth.prototype.signInWithPhoneNumber = function(
  phoneNumber,
  applicationVerifier
) {};

/**
 * A result from a phone number sign-in, link, or reauthenticate call.
 * @interface
 */
firebase.auth.ConfirmationResult = function() {};

/**
 * The phone number authentication operation's verification ID. This can be used
 * along with the verification code to initialize a phone auth credential.
 *
 * @type {string}
 */
firebase.auth.ConfirmationResult.prototype.verificationId;

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
 * @param {string} verificationCode
 * @return {!firebase.Promise<!firebase.auth.UserCredential>}
 */
firebase.auth.ConfirmationResult.prototype.confirm = function(
  verificationCode
) {};

/**
 * Asynchronously signs in as an anonymous user.
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
 *
 * @return {!firebase.Promise<!firebase.User>}
 */
firebase.auth.Auth.prototype.signInAnonymously = function() {};

/**
 * A structure containing a User, an AuthCredential, the operationType, and
 * any additional user information that was returned from the identity provider.
 * operationType could be 'signIn' for a sign-in operation, 'link' for a linking
 * operation and 'reauthenticate' for a reauthentication operation.
 *
 * @typedef {{
 *   user: ?firebase.User,
 *   credential: ?firebase.auth.AuthCredential,
 *   operationType: (?string|undefined),
 *   additionalUserInfo: (?firebase.auth.AdditionalUserInfo|undefined)
 * }}
 */
firebase.auth.UserCredential;

/**
 * A structure containing additional user information from a federated identity
 * provider.
 * @typedef {{
 *   providerId: string,
 *   profile: ?Object,
 *   username: (?string|undefined),
 *   isNewUser: boolean
 * }}
 */
firebase.auth.AdditionalUserInfo;

/**
 * Signs out the current user.
 *
 * @return {!firebase.Promise<void>}
 */
firebase.auth.Auth.prototype.signOut = function() {};

/**
 * An authentication error.
 * For method-specific error codes, refer to the specific methods in the
 * documentation. For common error codes, check the reference below. Use {@link
 * firebase.auth.Error#code} to get the specific error code. For a detailed
 * message, use {@link firebase.auth.Error#message}.
 * Errors with the code <strong>auth/account-exists-with-different-credential
 * </strong> will have the additional fields <strong>email</strong> and <strong>
 * credential</strong> which are needed to provide a way to resolve these
 * specific errors. Refer to {@link firebase.auth.Auth#signInWithPopup} for more
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
 *     threshold. Use {@link firebase.User#reauthenticateWithCredential} to
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
 *
 * @interface
 */
firebase.auth.Error = function() {};

/**
 * Unique error code.
 *
 * @type {string}
 */
firebase.auth.Error.prototype.code;

/**
 * Complete error message.
 *
 * @type {string}
 */
firebase.auth.Error.prototype.message;

//
// List of Auth Providers.
//

/**
 * Interface that represents an auth provider.
 *
 * @interface
 */
firebase.auth.AuthProvider = function() {};

/** @type {string} */
firebase.auth.AuthProvider.prototype.providerId;

/**
 * Generic OAuth provider.
 *
 * @example
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
 *
 * @example
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
 *
 * @see {@link firebase.auth.Auth#onAuthStateChanged} to receive sign in state
 * changes.
 * @param {string} providerId The associated provider ID, such as `github.com`.
 * @constructor
 * @implements {firebase.auth.AuthProvider}
 */
firebase.auth.OAuthProvider = function(providerId) {};

/**
 * Creates a Firebase credential from a generic OAuth provider's access token or
 * ID token.
 *
 * @example
 * // `googleUser` from the onsuccess Google Sign In callback.
 * // Initialize a generate OAuth provider with a `google.com` providerId.
 * var provider = new firebase.auth.OAuthProvider('google.com');
 * var credential = provider.credential(
 *     googleUser.getAuthResponse().id_token);
 * firebase.auth().signInWithCredential(credential)
 *
 * @param {?string=} idToken The OAuth ID token if OIDC compliant.
 * @param {?string=} accessToken The OAuth access token.
 * @return {!firebase.auth.OAuthCredential} The auth provider credential.
 */
firebase.auth.OAuthProvider.prototype.credential = function(
  idToken,
  accessToken
) {};

/** @type {string} */
firebase.auth.OAuthProvider.prototype.providerId;

/**
 * @param {string} scope Provider OAuth scope to add.
 * @return {!firebase.auth.OAuthProvider} The provider instance.
 */
firebase.auth.OAuthProvider.prototype.addScope = function(scope) {};

/**
 * Sets the OAuth custom parameters to pass in an OAuth request for popup
 * and redirect sign-in operations.
 * For a detailed list, check the
 * reserved required OAuth 2.0 parameters such as `client_id`, `redirect_uri`,
 * `scope`, `response_type` and `state` are not allowed and will be ignored.
 * @param {!Object} customOAuthParameters The custom OAuth parameters to pass
 *     in the OAuth request.
 * @return {!firebase.auth.OAuthProvider} The provider instance.
 */
firebase.auth.OAuthProvider.prototype.setCustomParameters = function(
  customOAuthParameters
) {};

/**
 * Facebook auth provider.
 *
 * @example
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
 *
 * @example
 * // Sign in using a popup.
 * var provider = new firebase.auth.FacebookAuthProvider();
 * provider.addScope('user_birthday');
 * firebase.auth().signInWithPopup(provider).then(function(result) {
 *   // This gives you a Facebook Access Token.
 *   var token = result.credential.accessToken;
 *   // The signed-in user info.
 *   var user = result.user;
 * });
 *
 * @see {@link firebase.auth.Auth#onAuthStateChanged} to receive sign in state
 * changes.
 * @constructor
 * @implements {firebase.auth.AuthProvider}
 */
firebase.auth.FacebookAuthProvider = function() {};

/** @type {string} */
firebase.auth.FacebookAuthProvider.PROVIDER_ID;

/**
 * @example
 * var cred = firebase.auth.FacebookAuthProvider.credential(
 *     // `event` from the Facebook auth.authResponseChange callback.
 *     event.authResponse.accessToken
 * );
 *
 * @param {string} token Facebook access token.
 * @return {!firebase.auth.OAuthCredential} The auth provider credential.
 */
firebase.auth.FacebookAuthProvider.credential = function(token) {};

/** @type {string} */
firebase.auth.FacebookAuthProvider.prototype.providerId;

/**
 * @param {string} scope Facebook OAuth scope.
 * @return {!firebase.auth.AuthProvider} The provider instance itself.
 */
firebase.auth.FacebookAuthProvider.prototype.addScope = function(scope) {};

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
firebase.auth.FacebookAuthProvider.prototype.setCustomParameters = function(
  customOAuthParameters
) {};

/**
 * Github auth provider.
 *
 * GitHub requires an OAuth 2.0 redirect, so you can either handle the redirect
 * directly, or use the signInWithPopup handler:
 *
 * @example
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
 *
 * @example
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
 *
 * @see {@link firebase.auth.Auth#onAuthStateChanged} to receive sign in state
 * changes.
 * @constructor
 * @implements {firebase.auth.AuthProvider}
 */
firebase.auth.GithubAuthProvider = function() {};

/** @type {string} */
firebase.auth.GithubAuthProvider.PROVIDER_ID;

/**
 * @example
 * var cred = firebase.auth.FacebookAuthProvider.credential(
 *     // `event` from the Facebook auth.authResponseChange callback.
 *     event.authResponse.accessToken
 * );
 *
 * @param {string} token Github access token.
 * @return {!firebase.auth.OAuthCredential} The auth provider credential.
 */
firebase.auth.GithubAuthProvider.credential = function(token) {};

/** @type {string} */
firebase.auth.GithubAuthProvider.prototype.providerId;

/**
 * @param {string} scope Github OAuth scope.
 * @return {!firebase.auth.AuthProvider} The provider instance itself.
 */
firebase.auth.GithubAuthProvider.prototype.addScope = function(scope) {};

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
firebase.auth.GithubAuthProvider.prototype.setCustomParameters = function(
  customOAuthParameters
) {};

/**
 * Google auth provider.
 *
 * @example
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
 *
 * @example
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
 *
 * @see {@link firebase.auth.Auth#onAuthStateChanged} to receive sign in state
 * changes.
 * @constructor
 * @implements {firebase.auth.AuthProvider}
 */
firebase.auth.GoogleAuthProvider = function() {};

/** @type {string} */
firebase.auth.GoogleAuthProvider.PROVIDER_ID;

/**
 * Creates a credential for Google. At least one of ID token and access token
 * is required.
 *
 * @example
 * // `googleUser` from the onsuccess Google Sign In callback.
 * var credential = firebase.auth.GoogleAuthProvider.credential(
              googleUser.getAuthResponse().id_token);
 * firebase.auth().signInWithCredential(credential)
 *
 * @param {?string=} idToken Google ID token.
 * @param {?string=} accessToken Google access token.
 * @return {!firebase.auth.OAuthCredential} The auth provider credential.
 */
firebase.auth.GoogleAuthProvider.credential = function(idToken, accessToken) {};

/** @type {string} */
firebase.auth.GoogleAuthProvider.prototype.providerId;

/**
 * @param {string} scope Google OAuth scope.
 * @return {!firebase.auth.AuthProvider} The provider instance itself.
 */
firebase.auth.GoogleAuthProvider.prototype.addScope = function(scope) {};

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
firebase.auth.GoogleAuthProvider.prototype.setCustomParameters = function(
  customOAuthParameters
) {};

/**
 * Twitter auth provider.
 *
 * @example
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
 *
 * @example
 * // Using a popup.
 * var provider = new firebase.auth.TwitterAuthProvider();
 * firebase.auth().signInWithPopup(provider).then(function(result) {
 *   // For accessing the Twitter API.
 *   var token = result.credential.accessToken;
 *   var secret = result.credential.secret;
 *   // The signed-in user info.
 *   var user = result.user;
 * });
 *
 * @see {@link firebase.auth.Auth#onAuthStateChanged} to receive sign in state
 * changes.
 * @constructor
 * @implements {firebase.auth.AuthProvider}
 */
firebase.auth.TwitterAuthProvider = function() {};

/** @type {string} */
firebase.auth.TwitterAuthProvider.PROVIDER_ID;

/**
 * @param {string} token Twitter access token.
 * @param {string} secret Twitter secret.
 * @return {!firebase.auth.OAuthCredential} The auth provider credential.
 */
firebase.auth.TwitterAuthProvider.credential = function(token, secret) {};

/** @type {string} */
firebase.auth.TwitterAuthProvider.prototype.providerId;

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
firebase.auth.TwitterAuthProvider.prototype.setCustomParameters = function(
  customOAuthParameters
) {};

/**
 * Email and password auth provider implementation.
 *
 * To authenticate: {@link firebase.auth.Auth#createUserWithEmailAndPassword}
 * and {@link firebase.auth.Auth#signInWithEmailAndPassword}.
 *
 * @constructor
 * @implements {firebase.auth.AuthProvider}
 */
firebase.auth.EmailAuthProvider = function() {};

/** @type {string} */
firebase.auth.EmailAuthProvider.PROVIDER_ID;

/**
 * @example
 * var cred = firebase.auth.EmailAuthProvider.credential(
 *     email,
 *     password
 * );
 *
 * @param {string} email Email address.
 * @param {string} password User account password.
 * @return {!firebase.auth.AuthCredential} The auth provider credential.
 */
firebase.auth.EmailAuthProvider.credential = function(email, password) {};

/** @type {string} */
firebase.auth.EmailAuthProvider.prototype.providerId;

/**
 * Phone number auth provider.
 *
 * @example
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
 *
 * @constructor
 * @param {?firebase.auth.Auth=} auth The Firebase Auth instance in which
 *     sign-ins should occur. Uses the default Auth instance if unspecified.
 * @implements {firebase.auth.AuthProvider}
 */
firebase.auth.PhoneAuthProvider = function(auth) {};

/** @type {string} */
firebase.auth.PhoneAuthProvider.PROVIDER_ID;

/**
 * Creates a phone auth credential, given the verification ID from
 * {@link firebase.auth.PhoneAuthProvider#verifyPhoneNumber} and the code
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
 *     {@link firebase.auth.PhoneAuthProvider#verifyPhoneNumber}.
 * @param {string} verificationCode The verification code sent to the user's
 *     mobile device.
 * @return {!firebase.auth.AuthCredential} The auth provider credential.
 */
firebase.auth.PhoneAuthProvider.credential = function(
  verificationId,
  verificationCode
) {};

/** @type {string} */
firebase.auth.PhoneAuthProvider.prototype.providerId;

/**
 * Starts a phone number authentication flow by sending a verification code to
 * the given phone number. Returns an ID that can be passed to
 * {@link firebase.auth.PhoneAuthProvider#credential} to identify this flow.
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
firebase.auth.PhoneAuthProvider.prototype.verifyPhoneNumber = function(
  phoneNumber,
  applicationVerifier
) {};

/**
 * A verifier for domain verification and abuse prevention. Currently, the
 * only implementation is {@link firebase.auth.RecaptchaVerifier}.
 * @interface
 */
firebase.auth.ApplicationVerifier = function() {};

/**
 * Identifies the type of application verifier (e.g. "recaptcha").
 * @type {string}
 */
firebase.auth.ApplicationVerifier.prototype.type;

/**
 * Executes the verification process.
 * @return {!firebase.Promise<string>} A Promise for a token that can be used to
 *     assert the validity of a request.
 */
firebase.auth.ApplicationVerifier.prototype.verify = function() {};
