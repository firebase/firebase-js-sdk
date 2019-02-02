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
 * @fileoverview Defines the Firebase dynamic link constructor.
 */

goog.provide('fireauth.DynamicLink');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.object');
goog.require('fireauth.util');
goog.require('goog.Uri');


/**
 * Dynamic link builder used to help build the FDL link to redirect to an app
 * while passing some payload or error.
 * @param {?string} fdlDomain The FDL domain. If none is available, custom
 *     scheme redirects are used.
 * @param {!fireauth.DynamicLink.Platform} platform The FDL supported
 *     platform (Android or iOS).
 * @param {string} appIdentifier The app identifier (iOS bundle ID or Android
 *     package name).
 * @param {string} authDomain The Firebase application authDomain.
 * @param {string} payload The FDL deep link content.
 * @param {?string=} opt_clientId The optional OAuth client ID.
 * @constructor
 */
fireauth.DynamicLink = function(fdlDomain, platform, appIdentifier, authDomain,
    payload, opt_clientId) {
  // The fallback error when the app is not installed on the device.
  var defaultError =
      new fireauth.AuthError(fireauth.authenum.Error.APP_NOT_INSTALLED);
  /** @private {string} The fallback URL when the app is not installed. */
  this.fallbackUrl_ = 'https://' + authDomain + '/__/auth/handler?' +
      'firebaseError=' + encodeURIComponent(/** @type {string} */ (
          fireauth.util.stringifyJSON(defaultError.toPlainObject())));
  fireauth.object.setReadonlyProperty(this, 'fallbackUrl', this.fallbackUrl_);
  /** @private {?string} The FDL domain if available. */
  this.fdlDomain_ = fdlDomain;
  fireauth.object.setReadonlyProperty(this, 'fdlDomain', fdlDomain);
  /** @private {!fireauth.DynamicLink.Platform} The FDL link platform. */
  this.platform_ = platform;
  fireauth.object.setReadonlyProperty(this, 'platform', platform);
  /** @private {string} The app identifier. */
  this.appIdentifier_ = appIdentifier;
  fireauth.object.setReadonlyProperty(this, 'appIdentifier', appIdentifier);
  /** @private {string} The Firebase application authDomain. */
  this.authDomain_ = authDomain;
  fireauth.object.setReadonlyProperty(this, 'authDomain', authDomain);
  /** @private {string} The FDL deep link content. */
  this.link_ = payload;
  fireauth.object.setReadonlyProperty(this, 'payload', payload);
  /** @private {?string} The application display name. */
  this.appName_ = null;
  fireauth.object.setReadonlyProperty(this, 'appName', null);
  /** @private {?string} The client ID if available. */
  this.clientId_ = opt_clientId || null;
  fireauth.object.setReadonlyProperty(this, 'clientId', this.clientId_);
};


/**
 * Sets the app name for the current dynamic link.
 * @param {?string|undefined} appName The app name typically displayed in an FDL
 *     button.
 */
fireauth.DynamicLink.prototype.setAppName = function(appName) {
  this.appName_ = appName || null;
  fireauth.object.setReadonlyProperty(this, 'appName', appName);
};


/**
 * Sets the dynamic link fallback URL overriding the default one.
 * @param {string} fallbackUrl The dynamic link fallback URL.
 */
fireauth.DynamicLink.prototype.setFallbackUrl = function(fallbackUrl) {
  this.fallbackUrl_ = fallbackUrl;
  fireauth.object.setReadonlyProperty(this, 'fallbackUrl', fallbackUrl);
};


/**
 * Parses a dynamic link object from an automatic FDL redirect link.
 * @param {string} url The URL string to parse and convert to a dynamic link.
 * @return {?fireauth.DynamicLink} The corresponding dynamic link if applicable.
 */
fireauth.DynamicLink.fromURL = function(url) {
  // This constructs the Dynamic link from the URL provided.
  var uri = goog.Uri.parse(url);
  var fdlDomain = uri.getParameterValue('fdlDomain');
  var platform = uri.getParameterValue('platform');
  var appIdentifier = uri.getParameterValue('appIdentifier');
  var authDomain = uri.getParameterValue('authDomain');
  var payload = uri.getParameterValue('link');
  var appName = uri.getParameterValue('appName');
  if (fdlDomain && platform && appIdentifier && authDomain && payload &&
      appName) {
    var dl = new fireauth.DynamicLink(
        /** @type {string} */ (fdlDomain),
        /** @type {!fireauth.DynamicLink.Platform} */ (platform),
        /** @type {string} */ (appIdentifier),
        /** @type {string} */ (authDomain),
        /** @type {string} */ (payload));
    dl.setAppName(appName);
    return dl;
  }
  return null;
};


/**
 * @param {string} url The dynamic link URL.
 * @return {string} The deep link embedded within the dynamic link.
 */
fireauth.DynamicLink.parseDeepLink = function(url) {
  var uri = goog.Uri.parse(url);
  var link = uri.getParameterValue('link');
  // Double link case (automatic redirect).
  var doubleDeepLink = goog.Uri.parse(link).getParameterValue('link');
  // iOS custom scheme links.
  var iOSdeepLink = uri.getParameterValue('deep_link_id');
  var iOSDoubledeepLink = goog.Uri.parse(iOSdeepLink).getParameterValue('link');
  var callbackUrl =
      iOSDoubledeepLink || iOSdeepLink || doubleDeepLink || link || url;
  return callbackUrl;
};


/**
 * The supported FDL platforms.
 * @enum {string}
 */
fireauth.DynamicLink.Platform = {
  ANDROID: 'android',
  IOS: 'ios'
};


/**
 * Constructs the common FDL link base used for building the button link or the
 * automatic redirect link.
 * @param {string} fallbackUrl The fallback URL to use.
 * @return {!goog.Uri} The partial URI of the FDL link used to build the final
 *     button link or the automatic redirect link.
 * @private
 */
fireauth.DynamicLink.prototype.constructFdlBase_ = function(fallbackUrl) {
  var uri = goog.Uri.create(
      'https',
      null,
      this.fdlDomain_,
      null,
      '/');
  if (this.platform_ == fireauth.DynamicLink.Platform.ANDROID) {
    uri.setParameterValue('apn', this.appIdentifier_);
    uri.setParameterValue('afl', fallbackUrl);
  } else if (this.platform_ == fireauth.DynamicLink.Platform.IOS) {
    uri.setParameterValue('ibi', this.appIdentifier_);
    uri.setParameterValue('ifl', fallbackUrl);
  }
  return uri;
};


/**
 * Constructs the custom scheme URL. This is used when no FDL domain is
 * available.
 * @return {!goog.Uri} The uri of the dynamic link used to build the final
 *      button link or the automatic redirect link.
 * @private
 */
fireauth.DynamicLink.prototype.constructCustomSchemeUrl_ = function() {
  // This mimics the FDL custom scheme URL format.
  var uri = goog.Uri.create(
      this.clientId_ ? this.clientId_.split('.').reverse().join('.') :
          this.appIdentifier_,
      null,
      // 'firebaseauth' is used in the app verification flow.
      // 'google' is used for the Cordova iOS flow.
      this.clientId_ ? 'firebaseauth' : 'google',
      null,
      '/link');
  uri.setParameterValue('deep_link_id', this.link_);
  return uri;
};


/**
 * @param {boolean=} opt_isAutoRedirect Whether the link is an auto redirect
 *     link.
 * @return {string} The generated dynamic link string.
 * @override
 */
fireauth.DynamicLink.prototype.toString = function(opt_isAutoRedirect) {
  // When FDL domain is not available, always returns the custom scheme URL.
  if (!this.fdlDomain_) {
    return this.constructCustomSchemeUrl_().toString();
  }
  if (!!opt_isAutoRedirect) {
    return this.generateAutomaticRedirectLink_();
  }
  return this.generateButtonLink_();
};


/**
 * @return {string} The final FDL button link.
 * @private
 */
fireauth.DynamicLink.prototype.generateButtonLink_ = function() {
  var fdlLink = this.constructFdlBase_(this.fallbackUrl_);
  fdlLink.setParameterValue('link', this.link_);
  return fdlLink.toString();
};


/**
 * @return {string} The final FDL automatic redirect link.
 * @private
 */
fireauth.DynamicLink.prototype.generateAutomaticRedirectLink_ =
    function() {
  var doubleDeeplink = goog.Uri.create(
      'https',
      null,
      this.authDomain_,
      null,
      '/__/auth/callback');
  doubleDeeplink.setParameterValue('fdlDomain', this.fdlDomain_);
  doubleDeeplink.setParameterValue('platform', this.platform_);
  doubleDeeplink.setParameterValue('appIdentifier', this.appIdentifier_);
  doubleDeeplink.setParameterValue('authDomain', this.authDomain_);
  doubleDeeplink.setParameterValue('link', this.link_);
  doubleDeeplink.setParameterValue('appName', this.appName_ || '');
  // The fallback URL is the deep link itself.
  // This is in case the link fails to be intercepted by the app, FDL will
  // redirect to the fallback URL.
  var fdlLink = this.constructFdlBase_(doubleDeeplink.toString());
  fdlLink.setParameterValue('link', doubleDeeplink.toString());
  return fdlLink.toString();
};
