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
 * @fileoverview Defines Auth credentials used for signInWithCredential.
 */

goog.provide('fireauth.AuthCredential');
goog.provide('fireauth.AuthProvider');
goog.provide('fireauth.EmailAuthCredential');
goog.provide('fireauth.EmailAuthProvider');
goog.provide('fireauth.FacebookAuthProvider');
goog.provide('fireauth.FederatedProvider');
goog.provide('fireauth.GithubAuthProvider');
goog.provide('fireauth.GoogleAuthProvider');
goog.provide('fireauth.OAuthCredential');
goog.provide('fireauth.OAuthProvider');
goog.provide('fireauth.OAuthResponse');
goog.provide('fireauth.PhoneAuthCredential');
goog.provide('fireauth.PhoneAuthProvider');
goog.provide('fireauth.TwitterAuthProvider');

goog.require('fireauth.ActionCodeUrl');
goog.require('fireauth.AuthError');
goog.require('fireauth.DynamicLink');
goog.require('fireauth.IdToken');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.idp');
goog.require('fireauth.object');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.object');

goog.forwardDeclare('fireauth.RpcHandler');



/**
 * The interface that represents Auth credential. It provides the underlying
 * implementation for retrieving the ID token depending on the type of
 * credential.
 * @interface
 */
fireauth.AuthCredential = function() {};


/**
 * Returns a promise to retrieve ID token using the underlying RPC handler API
 * for the current credential.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler.
 * @return {!goog.Promise<!Object, !fireauth.AuthError>}
 *     idTokenPromise The RPC handler method that returns a promise which
 *     resolves with an ID token.
 */
fireauth.AuthCredential.prototype.getIdTokenProvider;


/**
 * Links the credential to an existing account, identified by an ID token.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler.
 * @param {string} idToken The ID token of the existing account.
 * @return {!goog.Promise<!Object>} A Promise that resolves when the accounts
 *     are linked.
 */
fireauth.AuthCredential.prototype.linkToIdToken;


/**
 * Tries to match the credential's idToken with the provided UID.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler.
 * @param {string} uid The UID of the user to reauthenticate.
 * @return {!goog.Promise<!Object>} A Promise that resolves when
 *     idToken UID match succeeds and returns the server response.
 */
fireauth.AuthCredential.prototype.matchIdTokenWithUid;


/** @return {!Object} The plain object representation of an Auth credential. */
fireauth.AuthCredential.prototype.toPlainObject;


/**
 * @param {!goog.Promise<!Object>} idTokenResolver A promise that resolves with
 *     the ID token response.
 * @param {string} uid The UID to match in the token response.
 * @return {!goog.Promise<!Object>} A promise that resolves with the same
 *     response if the UID matches.
 */
fireauth.AuthCredential.verifyTokenResponseUid =
    function(idTokenResolver, uid) {
  return idTokenResolver.then(function(response) {
    // This should not happen as rpcHandler verifyAssertion and verifyPassword
    // always guarantee an ID token is available.
    if (response[fireauth.RpcHandler.AuthServerField.ID_TOKEN]) {
      // Parse the token object.
      var parsedIdToken = fireauth.IdToken.parse(
          response[fireauth.RpcHandler.AuthServerField.ID_TOKEN]);
      // Confirm token localId matches the provided UID. If not, throw the user
      // mismatch error.
      if (!parsedIdToken || uid != parsedIdToken.getLocalId()) {
        throw new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH);
      }
      return response;
    }
    throw new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH);
  })
  .thenCatch(function(error) {
    // Translate auth/user-not-found error directly to auth/user-mismatch.
    throw fireauth.AuthError.translateError(
        error,
        fireauth.authenum.Error.USER_DELETED,
        fireauth.authenum.Error.USER_MISMATCH);
  });
};



/**
 * The interface that represents the Auth provider.
 * @interface
 */
fireauth.AuthProvider = function() {};


/**
 * @param {...*} var_args The credential data.
 * @return {!fireauth.AuthCredential} The Auth provider credential.
 */
fireauth.AuthProvider.credential;


/**
 * @typedef {{
 *   idToken: (?string|undefined),
 *   accessToken: (?string|undefined),
 *   oauthToken: (?string|undefined),
 *   oauthTokenSecret: (?string|undefined)
 * }}
 */
fireauth.OAuthResponse;



/**
 * The OAuth credential class.
 * @param {!fireauth.idp.ProviderId} providerId The provider ID.
 * @param {!fireauth.OAuthResponse} oauthResponse The OAuth
 *     response object containing token information.
 * @param {!fireauth.idp.SignInMethod} signInMethod The sign in method.
 * @constructor
 * @implements {fireauth.AuthCredential}
 */
fireauth.OAuthCredential = function(providerId, oauthResponse, signInMethod) {
  if (oauthResponse['idToken'] || oauthResponse['accessToken']) {
    // OAuth 2 and either ID token or access token.
    if (oauthResponse['idToken']) {
      fireauth.object.setReadonlyProperty(
          this, 'idToken', oauthResponse['idToken']);
    }
    if (oauthResponse['accessToken']) {
      fireauth.object.setReadonlyProperty(
          this, 'accessToken', oauthResponse['accessToken']);
    }
  } else if (oauthResponse['oauthToken'] &&
             oauthResponse['oauthTokenSecret'])  {
    // OAuth 1 and OAuth token with OAuth token secret.
    fireauth.object.setReadonlyProperty(
        this, 'accessToken', oauthResponse['oauthToken']);
    fireauth.object.setReadonlyProperty(
        this, 'secret', oauthResponse['oauthTokenSecret']);
  } else {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR,
        'failed to construct a credential');
  }

  fireauth.object.setReadonlyProperty(this, 'providerId', providerId);
  fireauth.object.setReadonlyProperty(this, 'signInMethod', signInMethod);
};


/**
 * Returns a promise to retrieve ID token using the underlying RPC handler API
 * for the current credential.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler.
 * @return {!goog.Promise<!Object, !fireauth.AuthError>}
 *     idTokenPromise The RPC handler method that returns a promise which
 *     resolves with an ID token.
 * @override
 */
fireauth.OAuthCredential.prototype.getIdTokenProvider = function(rpcHandler) {
  return rpcHandler.verifyAssertion(
      /** @type {!fireauth.RpcHandler.VerifyAssertionData} */ (
      this.makeVerifyAssertionRequest_()));
};


/**
 * Links the credential to an existing account, identified by an ID token.
 * @param {!fireauth.RpcHandler} rpcHandler The rpc handler.
 * @param {string} idToken The ID token of the existing account.
 * @return {!goog.Promise<!Object>} A Promise that resolves when the accounts
 *     are linked, returning the backend response.
 * @override
 */
fireauth.OAuthCredential.prototype.linkToIdToken =
    function(rpcHandler, idToken) {
  var request = this.makeVerifyAssertionRequest_();
  request['idToken'] = idToken;
  return rpcHandler.verifyAssertionForLinking(
      /** @type {!fireauth.RpcHandler.VerifyAssertionData} */ (request));
};


/**
 * Tries to match the credential's idToken with the provided UID.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler.
 * @param {string} uid The UID of the user to reauthenticate.
 * @return {!goog.Promise<!Object>} A Promise that resolves when
 *     idToken UID match succeeds and returns the server response.
 * @override
 */
fireauth.OAuthCredential.prototype.matchIdTokenWithUid =
    function(rpcHandler, uid) {
  var request = this.makeVerifyAssertionRequest_();
  // Do not create a new account if the user doesn't exist.
  return fireauth.AuthCredential.verifyTokenResponseUid(
      rpcHandler.verifyAssertionForExisting(
          /** @type {!fireauth.RpcHandler.VerifyAssertionData} */ (request)),
      uid);
};


/**
 * @return {!Object} A request to the VerifyAssertion endpoint, populated with
 *     the OAuth data from this credential.
 * @private
 */
fireauth.OAuthCredential.prototype.makeVerifyAssertionRequest_ = function() {
  var postBody = {};
  if (this['idToken']) {
    postBody['id_token'] = this['idToken'];
  }
  if (this['accessToken']) {
    postBody['access_token'] = this['accessToken'];
  }
  if (this['secret']) {
    postBody['oauth_token_secret'] = this['secret'];
  }
  postBody['providerId'] = this['providerId'];
  return {
    'postBody': goog.Uri.QueryData.createFromMap(postBody).toString(),
    // Always use http://localhost.
    'requestUri': 'http://localhost'
  };
};


/**
 * @return {!Object} The plain object representation of an Auth credential.
 * @override
 */
fireauth.OAuthCredential.prototype.toPlainObject = function() {
  var obj = {
    'providerId': this['providerId'],
    'signInMethod': this['signInMethod']
  };
  if (this['idToken']) {
    obj['oauthIdToken'] = this['idToken'];
  }
  if (this['accessToken']) {
    obj['oauthAccessToken'] = this['accessToken'];
  }
  if (this['secret']) {
    obj['oauthTokenSecret'] = this['secret'];
  }
  return obj;
};


/**
 * A generic OAuth provider (OAuth1 or OAuth2).
 * @param {string} providerId The IdP provider ID (e.g. google.com,
 *     facebook.com) registered with the backend.
 * @param {?Array<string>=} opt_reservedParams The backlist of parameters that
 *     cannot be set through setCustomParameters.
 * @constructor
 */
fireauth.FederatedProvider = function(providerId, opt_reservedParams) {
  /** @private {!Array<string>} */
  this.reservedParams_ = opt_reservedParams || [];

  // Set read only instance providerId property.
  // Set read only instance isOAuthProvider property.
  fireauth.object.setReadonlyProperties(this, {
    'providerId': providerId,
    'isOAuthProvider': true
  });

  /** @private {!Object} The OAuth custom parameters for current provider. */
  this.customParameters_ = {};
  /** @protected {?string} The custom OAuth language parameter. */
  this.languageParameter =
      (fireauth.idp.getIdpSettings(/** @type {!fireauth.idp.ProviderId} */ (
          providerId)) || {}).languageParam || null;
  /** @protected {?string} The default language. */
  this.defaultLanguageCode = null;
};

/**
 * @param {!Object} customParameters The custom OAuth parameters to pass
 *     in OAuth request.
 * @return {!fireauth.FederatedProvider} The FederatedProvider instance, for
 *     chaining method calls.
 */
fireauth.FederatedProvider.prototype.setCustomParameters =
    function(customParameters) {
  this.customParameters_ = goog.object.clone(customParameters);
  return this;
};


/**
 * Set the default language code on the provider instance.
 * @param {?string} languageCode The default language code to set if not already
 *     provided in the custom parameters.
 */
fireauth.FederatedProvider.prototype.setDefaultLanguage =
    function(languageCode) {
  this.defaultLanguageCode = languageCode;
};


/**
 * @return {!Object} The custom OAuth parameters to pass in OAuth request.
 */
fireauth.FederatedProvider.prototype.getCustomParameters = function() {
  // The backend already checks for these values and makes sure no reserved
  // fields like client ID, redirect URI, state are overwritten by these
  // fields.
  var params =
      fireauth.util.copyWithoutNullsOrUndefined(this.customParameters_);
  // Convert to strings.
  for (var key in params) {
    params[key] = params[key].toString();
  }
  // Remove blacklisted OAuth custom parameters.
  var customParams =
      fireauth.util.removeEntriesWithKeys(params, this.reservedParams_);
  // If language param supported and not already provided, use default language.
  if (this.languageParameter &&
      this.defaultLanguageCode &&
      !customParams[this.languageParameter]) {
    customParams[this.languageParameter] = this.defaultLanguageCode;
  }
  return customParams;
};


/**
 * Generic OAuth2 Auth provider.
 * @param {string} providerId The IdP provider ID (e.g. google.com,
 *     facebook.com) registered with the backend.
 * @constructor
 * @extends {fireauth.FederatedProvider}
 * @implements {fireauth.AuthProvider}
 */
fireauth.OAuthProvider = function(providerId) {
  fireauth.OAuthProvider.base(this, 'constructor', providerId,
      fireauth.idp.RESERVED_OAUTH2_PARAMS);

  /** @private {!Array<string>} The list of OAuth2 scopes to request. */
  this.scopes_ = [];
};
goog.inherits(fireauth.OAuthProvider, fireauth.FederatedProvider);


/**
 * @param {string} scope The OAuth scope to request.
 * @return {!fireauth.OAuthProvider} The OAuthProvider instance, for chaining
 *     method calls.
 */
fireauth.OAuthProvider.prototype.addScope = function(scope) {
  // If not already added, add scope to list.
  if (!goog.array.contains(this.scopes_, scope)) {
    this.scopes_.push(scope);
  }
  return this;
};


/** @return {!Array<string>} The Auth provider's list of scopes. */
fireauth.OAuthProvider.prototype.getScopes = function() {
  return goog.array.clone(this.scopes_);
};


/**
 * Initializes an OAuth AuthCredential. At least one of ID token or access token
 * must be defined.
 * @param {?string=} opt_idToken The optional OAuth ID token.
 * @param {?string=} opt_accessToken The optional OAuth access token.
 * @return {!fireauth.AuthCredential} The Auth credential object.
 */
fireauth.OAuthProvider.prototype.credential = function(opt_idToken,
    opt_accessToken) {
  if (!opt_idToken && !opt_accessToken) {
    throw new fireauth.AuthError(fireauth.authenum.Error.ARGUMENT_ERROR,
        'credential failed: must provide the ID token and/or the access ' +
        'token.');
  }
  var oauthResponse = {
    'idToken': opt_idToken || null,
    'accessToken': opt_accessToken || null
  };
  // For OAuthCredential, sign in method is same as providerId.
  return new fireauth.OAuthCredential(this['providerId'],
                                      oauthResponse,
                                      this['providerId']);
};


/**
 * Facebook Auth provider.
 * @constructor
 * @extends {fireauth.OAuthProvider}
 * @implements {fireauth.AuthProvider}
 */
fireauth.FacebookAuthProvider = function() {
  fireauth.FacebookAuthProvider.base(this, 'constructor',
      fireauth.idp.ProviderId.FACEBOOK);
};
goog.inherits(fireauth.FacebookAuthProvider, fireauth.OAuthProvider);

fireauth.object.setReadonlyProperty(fireauth.FacebookAuthProvider,
    'PROVIDER_ID', fireauth.idp.ProviderId.FACEBOOK);

fireauth.object.setReadonlyProperty(fireauth.FacebookAuthProvider,
    'FACEBOOK_SIGN_IN_METHOD', fireauth.idp.SignInMethod.FACEBOOK);


/**
 * Initializes a Facebook AuthCredential.
 * @param {string} accessTokenOrObject The Facebook access token, or object
 *     containing the token for FirebaseUI backwards compatibility.
 * @return {!fireauth.AuthCredential} The Auth credential object.
 * @override
 */
fireauth.FacebookAuthProvider.credential = function(accessTokenOrObject) {
  if (!accessTokenOrObject) {
    throw new fireauth.AuthError(fireauth.authenum.Error.ARGUMENT_ERROR,
        'credential failed: expected 1 argument (the OAuth access token).');
  }
  var accessToken = accessTokenOrObject;
  if (goog.isObject(accessTokenOrObject)) {
    accessToken = accessTokenOrObject['accessToken'];
  }
  return new fireauth.FacebookAuthProvider().credential(null,
      /** @type {string} */ (accessToken));
};


/**
 * GitHub Auth provider.
 * @constructor
 * @extends {fireauth.OAuthProvider}
 * @implements {fireauth.AuthProvider}
 */
fireauth.GithubAuthProvider = function() {
  fireauth.GithubAuthProvider.base(this, 'constructor',
      fireauth.idp.ProviderId.GITHUB);
};
goog.inherits(fireauth.GithubAuthProvider, fireauth.OAuthProvider);

fireauth.object.setReadonlyProperty(fireauth.GithubAuthProvider,
    'PROVIDER_ID', fireauth.idp.ProviderId.GITHUB);

fireauth.object.setReadonlyProperty(fireauth.GithubAuthProvider,
    'GITHUB_SIGN_IN_METHOD', fireauth.idp.SignInMethod.GITHUB);


/**
 * Initializes a GitHub AuthCredential.
 * @param {string} accessTokenOrObject The GitHub access token, or object
 *     containing the token for FirebaseUI backwards compatibility.
 * @return {!fireauth.AuthCredential} The Auth credential object.
 * @override
 */
fireauth.GithubAuthProvider.credential = function(accessTokenOrObject) {
  if (!accessTokenOrObject) {
    throw new fireauth.AuthError(fireauth.authenum.Error.ARGUMENT_ERROR,
        'credential failed: expected 1 argument (the OAuth access token).');
  }
  var accessToken = accessTokenOrObject;
  if (goog.isObject(accessTokenOrObject)) {
    accessToken = accessTokenOrObject['accessToken'];
  }
  return new fireauth.GithubAuthProvider().credential(null,
      /** @type {string} */ (accessToken));
};


/**
 * Google Auth provider.
 * @constructor
 * @extends {fireauth.OAuthProvider}
 * @implements {fireauth.AuthProvider}
 */
fireauth.GoogleAuthProvider = function() {
  fireauth.GoogleAuthProvider.base(this, 'constructor',
      fireauth.idp.ProviderId.GOOGLE);

  // Add profile scope to Google Auth provider as default scope.
  // This is to ensure profile info is populated in current user.
  this.addScope('profile');
};
goog.inherits(fireauth.GoogleAuthProvider, fireauth.OAuthProvider);

fireauth.object.setReadonlyProperty(fireauth.GoogleAuthProvider,
    'PROVIDER_ID', fireauth.idp.ProviderId.GOOGLE);

fireauth.object.setReadonlyProperty(fireauth.GoogleAuthProvider,
    'GOOGLE_SIGN_IN_METHOD', fireauth.idp.SignInMethod.GOOGLE);


/**
 * Initializes a Google AuthCredential.
 * @param {?string=} idTokenOrObject The Google ID token. If null or undefined,
 *     we expect the access token to be passed. It can also be an object
 *     containing the tokens for FirebaseUI backwards compatibility.
 * @param {?string=} accessToken The Google access token. If null or
 *     undefined, we expect the ID token to have been passed.
 * @return {!fireauth.AuthCredential} The Auth credential object.
 * @override
 */
fireauth.GoogleAuthProvider.credential =
    function(idTokenOrObject, accessToken) {
  var idToken = idTokenOrObject;
  if (goog.isObject(idTokenOrObject)) {
    idToken = idTokenOrObject['idToken'];
    accessToken = idTokenOrObject['accessToken'];
  }
  return new fireauth.GoogleAuthProvider().credential(
      /** @type {string} */ (idToken), /** @type {string} */ (accessToken));
};


/**
 * Twitter Auth provider.
 * @constructor
 * @extends {fireauth.FederatedProvider}
 * @implements {fireauth.AuthProvider}
 */
fireauth.TwitterAuthProvider = function() {
  fireauth.TwitterAuthProvider.base(this, 'constructor',
      fireauth.idp.ProviderId.TWITTER,
      fireauth.idp.RESERVED_OAUTH1_PARAMS);
};
goog.inherits(fireauth.TwitterAuthProvider, fireauth.FederatedProvider);

fireauth.object.setReadonlyProperty(fireauth.TwitterAuthProvider,
    'PROVIDER_ID', fireauth.idp.ProviderId.TWITTER);

fireauth.object.setReadonlyProperty(fireauth.TwitterAuthProvider,
    'TWITTER_SIGN_IN_METHOD', fireauth.idp.SignInMethod.TWITTER);


/**
 * Initializes a Twitter AuthCredential.
 * @param {string} tokenOrObject The Twitter access token, or object
 *     containing the token for FirebaseUI backwards compatibility.
 * @param {string} secret The Twitter secret.
 * @return {!fireauth.AuthCredential} The Auth credential object.
 * @override
 */
fireauth.TwitterAuthProvider.credential = function(tokenOrObject, secret) {
  var tokenObject = tokenOrObject;
  if (!goog.isObject(tokenObject)) {
    tokenObject = {
      'oauthToken': tokenOrObject,
      'oauthTokenSecret': secret
    };
  }

  if (!tokenObject['oauthToken'] || !tokenObject['oauthTokenSecret']) {
    throw new fireauth.AuthError(fireauth.authenum.Error.ARGUMENT_ERROR,
        'credential failed: expected 2 arguments (the OAuth access token ' +
        'and secret).');
  }

  return new fireauth.OAuthCredential(fireauth.idp.ProviderId.TWITTER,
      /** @type {!fireauth.OAuthResponse} */ (tokenObject),
      fireauth.idp.SignInMethod.TWITTER);
};


/**
 * The email and password credential class.
 * @param {string} email The credential email.
 * @param {string} password The credential password.
 * @param {string=} opt_signInMethod The credential sign in method can be either
 *     'password' or 'emailLink'
 * @constructor
 * @implements {fireauth.AuthCredential}
 */
fireauth.EmailAuthCredential = function(email, password, opt_signInMethod) {
  this.email_ = email;
  this.password_ = password;
  fireauth.object.setReadonlyProperty(this, 'providerId',
      fireauth.idp.ProviderId.PASSWORD);
  var signInMethod = opt_signInMethod ===
      fireauth.EmailAuthProvider['EMAIL_LINK_SIGN_IN_METHOD'] ?
      fireauth.EmailAuthProvider['EMAIL_LINK_SIGN_IN_METHOD'] :
      fireauth.EmailAuthProvider['EMAIL_PASSWORD_SIGN_IN_METHOD'];
  fireauth.object.setReadonlyProperty(this, 'signInMethod', signInMethod);
};


/**
 * Returns a promise to retrieve ID token using the underlying RPC handler API
 * for the current credential.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler.
 * @return {!goog.Promise<!Object, !fireauth.AuthError>}
 *     idTokenPromise The RPC handler method that returns a promise which
 *     resolves with an ID token.
 * @override
 */
fireauth.EmailAuthCredential.prototype.getIdTokenProvider =
    function(rpcHandler) {
  if (this['signInMethod'] ==
      fireauth.EmailAuthProvider['EMAIL_LINK_SIGN_IN_METHOD']) {
    return rpcHandler.emailLinkSignIn(this.email_, this.password_);
  }
  return rpcHandler.verifyPassword(this.email_, this.password_);
};


/**
 * Adds an email and password account to an existing account, identified by an
 * ID token.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler.
 * @param {string} idToken The ID token of the existing account.
 * @return {!goog.Promise<!Object>} A Promise that resolves when the accounts
 *     are linked, returning the backend response.
 * @override
 */
fireauth.EmailAuthCredential.prototype.linkToIdToken =
    function(rpcHandler, idToken) {
  if (this['signInMethod'] ==
      fireauth.EmailAuthProvider['EMAIL_LINK_SIGN_IN_METHOD']) {
    return rpcHandler.emailLinkSignInForLinking(
        idToken, this.email_, this.password_);
  }
  return rpcHandler.updateEmailAndPassword(
      idToken, this.email_, this.password_);
};


/**
 * Tries to match the credential's idToken with the provided UID.
 * @param {!fireauth.RpcHandler} rpcHandler The rpc handler.
 * @param {string} uid The UID of the user to reauthenticate.
 * @return {!goog.Promise<!Object>} A Promise that resolves when
 *     reauthentication succeeds.
 * @override
 */
fireauth.EmailAuthCredential.prototype.matchIdTokenWithUid =
    function(rpcHandler, uid) {
  // Do not create a new account if the user doesn't exist.
  return fireauth.AuthCredential.verifyTokenResponseUid(
      // This shouldn't create a new email/password account.
      this.getIdTokenProvider(rpcHandler),
      uid);
};


/**
 * @return {!Object} The plain object representation of an Auth credential.
 * @override
 */
fireauth.EmailAuthCredential.prototype.toPlainObject = function() {
  return {
    'email': this.email_,
    'password': this.password_,
    'signInMethod': this['signInMethod']
  };
};



/**
 * Email password Auth provider implementation.
 * @constructor
 * @implements {fireauth.AuthProvider}
 */
fireauth.EmailAuthProvider = function() {
  // Set read-only instance providerId and isOAuthProvider property.
  fireauth.object.setReadonlyProperties(this, {
    'providerId': fireauth.idp.ProviderId.PASSWORD,
    'isOAuthProvider': false
  });
};


/**
 * Initializes an instance of an email/password Auth credential.
 * @param {string} email The credential email.
 * @param {string} password The credential password.
 * @return {!fireauth.EmailAuthCredential} The Auth credential object.
 * @override
 */
fireauth.EmailAuthProvider.credential = function(email, password) {
  return new fireauth.EmailAuthCredential(email, password);
};


/**
 * @param {string} email The credential email.
 * @param {string} emailLink The credential email link.
 * @return {!fireauth.EmailAuthCredential} The Auth credential object.
 */
fireauth.EmailAuthProvider.credentialWithLink = function(email, emailLink) {
  var code = fireauth.EmailAuthProvider
      .getActionCodeFromSignInEmailLink(emailLink);
  if (!code) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR, 'Invalid email link!');
  }
  return new fireauth.EmailAuthCredential(email, code,
      fireauth.EmailAuthProvider['EMAIL_LINK_SIGN_IN_METHOD']);
};


/**
 * @param {string} emailLink The sign in email link to be validated.
 * @return {?string} Action code if the email link is valid, otherwise null.
 */
fireauth.EmailAuthProvider.getActionCodeFromSignInEmailLink =
    function(emailLink) {
  emailLink = fireauth.DynamicLink.parseDeepLink(emailLink);
  var actionCodeUrl = new fireauth.ActionCodeUrl(emailLink);
  var code = actionCodeUrl.getCode();
  if (actionCodeUrl.getMode() === fireauth.ActionCodeUrl.Mode.SIGN_IN && code) {
    return code;
  }
  return null;
};


// Set read only PROVIDER_ID property.
fireauth.object.setReadonlyProperties(fireauth.EmailAuthProvider, {
  'PROVIDER_ID': fireauth.idp.ProviderId.PASSWORD
});

// Set read only EMAIL_LINK_SIGN_IN_METHOD property.
fireauth.object.setReadonlyProperties(fireauth.EmailAuthProvider, {
  'EMAIL_LINK_SIGN_IN_METHOD': fireauth.idp.SignInMethod.EMAIL_LINK
});

// Set read only EMAIL_PASSWORD_SIGN_IN_METHOD property.
fireauth.object.setReadonlyProperties(fireauth.EmailAuthProvider, {
  'EMAIL_PASSWORD_SIGN_IN_METHOD': fireauth.idp.SignInMethod.EMAIL_PASSWORD
});


/**
 * A credential for phone number sign-in.
 * @param {!fireauth.PhoneAuthCredential.Parameters_} params The credential
 *     parameters that prove the user owns the claimed phone number.
 * @constructor
 * @implements {fireauth.AuthCredential}
 */
fireauth.PhoneAuthCredential = function(params) {
  // Either verification ID and code, or phone number temporary proof must be
  // provided.
  if (!(params.verificationId && params.verificationCode) &&
      !(params.temporaryProof && params.phoneNumber)) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }

  /**
   * The phone Auth parameters that prove ownership of a phone number, either
   * through completion of a phone verification flow, or by referencing a
   * previously completed verification flow ("temporaryProof").
   * @private {!fireauth.PhoneAuthCredential.Parameters_}
   */
  this.params_ = params;

  fireauth.object.setReadonlyProperty(this, 'providerId',
      fireauth.idp.ProviderId.PHONE);

  fireauth.object.setReadonlyProperty(
      this, 'signInMethod', fireauth.idp.SignInMethod.PHONE);
};


/**
 * Parameters that prove ownership of a phone number via a ID "verificationId"
 * of a request to send a code to the phone number, with the code
 * "verificationCode" that the user received on their phone.
 * @private
 * @typedef {{
 *   verificationId: string,
 *   verificationCode: string
 * }}
 */
fireauth.PhoneAuthCredential.VerificationParameters_;


/**
 * Parameters that prove ownership of a phone number by referencing a previously
 * completed phone Auth flow.
 * @private
 * @typedef {{
 *   temporaryProof: string,
 *   phoneNumber: string
 * }}
 */
fireauth.PhoneAuthCredential.TemporaryProofParameters_;


/**
 * @private
 * @typedef {
 *   fireauth.PhoneAuthCredential.VerificationParameters_|
 *   fireauth.PhoneAuthCredential.TemporaryProofParameters_
 * }
 */
fireauth.PhoneAuthCredential.Parameters_;


/**
 * Retrieves an ID token from the backend given the current credential.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler.
 * @return {!goog.Promise<!Object>} A Promise that resolves with the
 *     backend response.
 * @override
 */
fireauth.PhoneAuthCredential.prototype.getIdTokenProvider =
    function(rpcHandler) {
  return rpcHandler.verifyPhoneNumber(this.makeVerifyPhoneNumberRequest_());
};


/**
 * Adds a phone credential to an existing account identified by an ID token.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler.
 * @param {string} idToken The ID token of the existing account.
 * @return {!goog.Promise<!Object>} A Promise that resolves when the accounts
 *     are linked, returning the backend response.
 * @override
 */
fireauth.PhoneAuthCredential.prototype.linkToIdToken =
    function(rpcHandler, idToken) {
  var request = this.makeVerifyPhoneNumberRequest_();
  request['idToken'] = idToken;
  return rpcHandler.verifyPhoneNumberForLinking(request);
};


/**
 * Tries to match the credential's idToken with the provided UID.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler.
 * @param {string} uid The UID of the user to reauthenticate.
 * @return {!goog.Promise<!Object>} A Promise that resolves when
 *     reauthentication succeeds.
 * @override
 */
fireauth.PhoneAuthCredential.prototype.matchIdTokenWithUid =
    function(rpcHandler, uid) {
  var request = this.makeVerifyPhoneNumberRequest_();
  return fireauth.AuthCredential.verifyTokenResponseUid(
      rpcHandler.verifyPhoneNumberForExisting(request),
      uid);
};


/**
 * Converts a PhoneAuthCredential to a plain object.
 * @return {!Object}
 * @override
 */
fireauth.PhoneAuthCredential.prototype.toPlainObject = function() {
  var obj =  {
    'providerId': fireauth.idp.ProviderId.PHONE
  };
  if (this.params_.verificationId) {
    obj['verificationId'] = this.params_.verificationId;
  }
  if (this.params_.verificationCode) {
    obj['verificationCode'] = this.params_.verificationCode;
  }
  if (this.params_.temporaryProof) {
    obj['temporaryProof'] = this.params_.temporaryProof;
  }
  if (this.params_.phoneNumber) {
    obj['phoneNumber'] = this.params_.phoneNumber;
  }
  return obj;
};


/**
 * @return {!Object} A request to the verifyPhoneNumber endpoint based on the
 *     current state of the object.
 * @private
 */
fireauth.PhoneAuthCredential.prototype.makeVerifyPhoneNumberRequest_ =
    function() {
  if (this.params_.temporaryProof && this.params_.phoneNumber) {
    return {
      'temporaryProof': this.params_.temporaryProof,
      'phoneNumber': this.params_.phoneNumber
    };
  }

  return {
    'sessionInfo': this.params_.verificationId,
    'code': this.params_.verificationCode
  };
};


/**
 * Phone Auth provider implementation.
 * @param {?fireauth.Auth=} opt_auth The Firebase Auth instance.
 * @constructor
 * @implements {fireauth.AuthProvider}
 */
fireauth.PhoneAuthProvider = function(opt_auth) {
  try {
    /** @private {!fireauth.Auth} */
    this.auth_ = opt_auth || firebase['auth']();
  } catch (e) {
    throw new fireauth.AuthError(fireauth.authenum.Error.ARGUMENT_ERROR,
        'Either an instance of firebase.auth.Auth must be passed as an ' +
        'argument to the firebase.auth.PhoneAuthProvider constructor, or the ' +
        'default firebase App instance must be initialized via ' +
        'firebase.initializeApp().');
  }
  fireauth.object.setReadonlyProperties(this, {
    'providerId': fireauth.idp.ProviderId.PHONE,
    'isOAuthProvider': false
  });
};


/**
 * Initiates a phone number confirmation flow.
 * @param {string} phoneNumber The user's phone number.
 * @param {!firebase.auth.ApplicationVerifier} applicationVerifier The
 *     application verifier for anti-abuse purposes.
 * @return {!goog.Promise<string>} A Promise that resolves with the
 *     verificationId of the phone number confirmation flow.
 */
fireauth.PhoneAuthProvider.prototype.verifyPhoneNumber =
    function(phoneNumber, applicationVerifier) {
  var rpcHandler = this.auth_.getRpcHandler();

  // Convert the promise into a goog.Promise. If the applicationVerifier throws
  // an error, just propagate it to the client. Reset the reCAPTCHA widget every
  // time after sending the token to the server.
  return goog.Promise.resolve(applicationVerifier['verify']())
      .then(function(assertion) {
        if (!goog.isString(assertion)) {
          throw new fireauth.AuthError(fireauth.authenum.Error.ARGUMENT_ERROR,
              'An implementation of firebase.auth.ApplicationVerifier' +
              '.prototype.verify() must return a firebase.Promise ' +
              'that resolves with a string.');
        }

        switch (applicationVerifier['type']) {
          case 'recaptcha':
            return rpcHandler
                .sendVerificationCode(
                    {'phoneNumber': phoneNumber, 'recaptchaToken': assertion})
                .then(
                    function(verificationId) {
                      if (typeof applicationVerifier.reset === 'function') {
                        applicationVerifier.reset();
                      }
                      return verificationId;
                    },
                    function(error) {
                      if (typeof applicationVerifier.reset === 'function') {
                        applicationVerifier.reset();
                      }
                      throw error;
                    });
          default:
            throw new fireauth.AuthError(fireauth.authenum.Error.ARGUMENT_ERROR,
                'Only firebase.auth.ApplicationVerifiers with ' +
                'type="recaptcha" are currently supported.');
        }
      });
};


/**
 * Creates a PhoneAuthCredential.
 * @param {string} verificationId The ID of the phone number flow, to correlate
 *     this request with a previous call to
 *     PhoneAuthProvider.prototype.verifyPhoneNumber.
 * @param {string} verificationCode The verification code that was sent to the
 *     user's phone.
 * @return {!fireauth.PhoneAuthCredential}
 * @override
 */
fireauth.PhoneAuthProvider.credential =
    function(verificationId, verificationCode) {
  if (!verificationId) {
    throw new fireauth.AuthError(fireauth.authenum.Error.MISSING_SESSION_INFO);
  }
  if (!verificationCode) {
    throw new fireauth.AuthError(fireauth.authenum.Error.MISSING_CODE);
  }
  return new fireauth.PhoneAuthCredential({
    verificationId: verificationId,
    verificationCode: verificationCode
  });
};


// Set read only PROVIDER_ID property.
fireauth.object.setReadonlyProperties(fireauth.PhoneAuthProvider, {
  'PROVIDER_ID': fireauth.idp.ProviderId.PHONE
});


// Set read only PHONE_SIGN_IN_METHOD property.
fireauth.object.setReadonlyProperties(fireauth.PhoneAuthProvider, {
  'PHONE_SIGN_IN_METHOD': fireauth.idp.SignInMethod.PHONE
});


/**
 * Constructs an Auth credential from a backend response.
 * @param {?Object} response The backend response to build a credential from.
 * @return {?fireauth.AuthCredential} The corresponding AuthCredential.
 */
fireauth.AuthProvider.getCredentialFromResponse = function(response) {
  // Handle phone Auth credential responses, as they have a different format
  // from other backend responses (i.e. no providerId).
  if (response['temporaryProof'] && response['phoneNumber']) {
    return new fireauth.PhoneAuthCredential({
      temporaryProof: response['temporaryProof'],
      phoneNumber: response['phoneNumber']
    });
  }

  // Get all OAuth response parameters from response.
  var providerId = response && response['providerId'];

  // Email and password is not supported as there is no situation where the
  // server would return the password to the client.
  if (!providerId || providerId === fireauth.idp.ProviderId.PASSWORD) {
    return null;
  }

  var accessToken = response && response['oauthAccessToken'];
  var accessTokenSecret = response && response['oauthTokenSecret'];
  // Google Id Token returned when no additional scopes provided.
  var idToken = response && response['oauthIdToken'];
  try {
    switch (providerId) {
      case fireauth.idp.ProviderId.GOOGLE:
        return fireauth.GoogleAuthProvider.credential(
            idToken, accessToken);

      case fireauth.idp.ProviderId.FACEBOOK:
        return fireauth.FacebookAuthProvider.credential(
            accessToken);

      case fireauth.idp.ProviderId.GITHUB:
        return fireauth.GithubAuthProvider.credential(
            accessToken);

      case fireauth.idp.ProviderId.TWITTER:
        return fireauth.TwitterAuthProvider.credential(
            accessToken, accessTokenSecret);

      default:
        return new fireauth.OAuthProvider(providerId).credential(
            idToken, accessToken);
    }
  } catch (e) {
    return null;
  }
};


/**
 * Checks if OAuth is supported by provider, if not throws an error.
 * @param {!fireauth.AuthProvider} provider The provider to check.
 */
fireauth.AuthProvider.checkIfOAuthSupported =
    function(provider) {
  if (!provider['isOAuthProvider']) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
  }
};
