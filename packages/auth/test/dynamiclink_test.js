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
 * @fileoverview Tests for dynamiclink.js.
 */

goog.provide('fireauth.DynamicLinkTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.DynamicLink');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.util');
goog.require('goog.Uri');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.DynamicLinkTest');


var customSchemeLink;
var reverseOAuthClientIdCustomSchemeLink;
var customSchemeLinkUrl;
var reverseOAuthClientIdCustomSchemeLinkUrl;
var androidDynamicLink;
var iosDynamicLink;
var androidDynamicLinkUrl;
var clientId = '123456.apps.googleusercontent.com';
var fdlDomain = 'example.app.goo.gl';
var androidPlatform = fireauth.DynamicLink.Platform.ANDROID;
var iosPlatform = fireauth.DynamicLink.Platform.IOS;
var appIdentifier = 'com.example.application';
var authDomain = 'example.firebaseapp.com';
var payload = 'https://example.firebaseapp.com/__/auth/callback#oauthResponse';
var defaultError =
    new fireauth.AuthError(fireauth.authenum.Error.APP_NOT_INSTALLED);
var appName = 'Hello World!';
var customFallbackUrl = 'https://example.firebaseapp.com/custom/fallback';
var fallbackUrl;
var androidAutoRedirectDynamicLinkUrl;
var androidUserInteractionDynamicLinkUrl;
var noAppNameAndroidDynamicLinkUrl;
var noAppNameAndroidAutoRedirectDynamicLinkUrl;
var requiredDynamicLinkUrlFields = [
  'fdlDomain', 'platform', 'appIdentifier', 'authDomain', 'link', 'appName'];


function setUp() {
  fallbackUrl = 'https://' + authDomain + '/__/auth/handler?firebaseError=' +
      encodeURIComponent(/** @type {string} */ (
          fireauth.util.stringifyJSON(defaultError.toPlainObject())));
  androidDynamicLinkUrl = 'https://example.firebaseapp.com/__/auth/callback?' +
      'fdlDomain=' + encodeURIComponent(fdlDomain) +
      '&platform=' + encodeURIComponent(androidPlatform) +
      '&appIdentifier=' + encodeURIComponent(appIdentifier) +
      '&authDomain=' + encodeURIComponent(authDomain) +
      '&link=' + encodeURIComponent(payload) +
      '&appName=' + encodeURIComponent(appName);
  noAppNameAndroidDynamicLinkUrl =
      goog.Uri.parse(androidDynamicLinkUrl).setParameterValue('appName', '')
      .toString();
  androidUserInteractionDynamicLinkUrl = 'https://' + fdlDomain + '/?' +
      'apn=' + encodeURIComponent(appIdentifier) +
      '&afl=' + encodeURIComponent(fallbackUrl) +
      '&link=' + encodeURIComponent(payload);
  androidAutoRedirectDynamicLinkUrl = 'https://' + fdlDomain + '/?' +
      'apn=' + encodeURIComponent(appIdentifier) +
      '&afl=' + encodeURIComponent(androidDynamicLinkUrl) +
      '&link=' + encodeURIComponent(androidDynamicLinkUrl);
  noAppNameAndroidAutoRedirectDynamicLinkUrl = 'https://' + fdlDomain + '/?' +
      'apn=' + encodeURIComponent(appIdentifier) +
      '&afl=' + encodeURIComponent(noAppNameAndroidDynamicLinkUrl) +
      '&link=' + encodeURIComponent(noAppNameAndroidDynamicLinkUrl);
  iosDynamicLinkUrl = 'https://example.firebaseapp.com/__/auth/callback?' +
      'fdlDomain=' + encodeURIComponent(fdlDomain) +
      '&platform=' + encodeURIComponent(iosPlatform) +
      '&appIdentifier=' + encodeURIComponent(appIdentifier) +
      '&authDomain=' + encodeURIComponent(authDomain) +
      '&link=' + encodeURIComponent(payload) +
      '&appName=' + encodeURIComponent(appName);
  iosUserInteractionDynamicLinkUrl = 'https://' + fdlDomain + '/?' +
      'ibi=' + encodeURIComponent(appIdentifier) +
      '&ifl=' + encodeURIComponent(fallbackUrl) +
      '&link=' + encodeURIComponent(payload);
  iosAutoRedirectDynamicLinkUrl = 'https://' + fdlDomain + '/?' +
      'ibi=' + encodeURIComponent(appIdentifier) +
      '&ifl=' + encodeURIComponent(iosDynamicLinkUrl) +
      '&link=' + encodeURIComponent(iosDynamicLinkUrl);
  customSchemeLinkUrl = appIdentifier + '://google/link?deep_link_id=' +
      encodeURIComponent(payload);
  reverseOAuthClientIdCustomSchemeLinkUrl =
      'com.googleusercontent.apps.123456://firebaseauth/link?deep_link_id=' +
      encodeURIComponent(payload);
}


function tearDown() {
  androidDynamicLink = null;
  androidDynamicLinkUrl = null;
  androidAutoRedirectDynamicLinkUrl = null;
  androidUserInteractionDynamicLinkUrl = null;
  iosDynamicLink = null;
  iosDynamicLinkUrl = null;
  iosAutoRedirectDynamicLinkUrl = null;
  iosUserInteractionDynamicLinkUrl = null;
  noAppNameAndroidDynamicLinkUrl = null;
  noAppNameAndroidAutoRedirectDynamicLinkUrl = null;
  customSchemeLink = null;
  customSchemeLinkUrl = null;
  reverseOAuthClientIdCustomSchemeLink = null;
  reverseOAuthClientIdCustomSchemeLinkUrl = null;
}


function testDynamicLink_initialization() {
  // Initialize the dynamic link.
  androidDynamicLink = new fireauth.DynamicLink(
      fdlDomain, androidPlatform, appIdentifier, authDomain, payload);
  // Confirm all properties set correctly.
  assertEquals(fallbackUrl, androidDynamicLink['fallbackUrl']);
  assertEquals(fdlDomain, androidDynamicLink['fdlDomain']);
  assertEquals(androidPlatform, androidDynamicLink['platform']);
  assertEquals(appIdentifier, androidDynamicLink['appIdentifier']);
  assertEquals(authDomain, androidDynamicLink['authDomain']);
  assertEquals(payload, androidDynamicLink['payload']);
  assertNull(androidDynamicLink['appName']);
  assertNull(androidDynamicLink['clientId']);
  // Set app name.
  androidDynamicLink.setAppName(appName);
  assertEquals(appName, androidDynamicLink['appName']);
  // Override the default fallback URL.
  androidDynamicLink.setFallbackUrl(customFallbackUrl);
  assertEquals(customFallbackUrl, androidDynamicLink['fallbackUrl']);
}


function testDynamicLink_initialization_noFdlDomain() {
  // Initialize the dynamic link.
  customSchemeLink = new fireauth.DynamicLink(
      null, iosPlatform, appIdentifier, authDomain, payload);
  // Confirm all properties set correctly.
  assertEquals(fallbackUrl, customSchemeLink['fallbackUrl']);
  assertNull(customSchemeLink['fdlDomain']);
  assertEquals(iosPlatform, customSchemeLink['platform']);
  assertEquals(appIdentifier, customSchemeLink['appIdentifier']);
  assertEquals(authDomain, customSchemeLink['authDomain']);
  assertEquals(payload, customSchemeLink['payload']);
  assertNull(customSchemeLink['appName']);
  assertNull(customSchemeLink['clientId']);
  // Set app name.
  customSchemeLink.setAppName(appName);
  assertEquals(appName, customSchemeLink['appName']);
  // Override the default fallback URL.
  customSchemeLink.setFallbackUrl(customFallbackUrl);
  assertEquals(customFallbackUrl, customSchemeLink['fallbackUrl']);
}


function testDynamicLink_initialization_clientIdAndNoFdlDomain() {
  // Initialize the dynamic link.
  reverseOAuthClientIdCustomSchemeLink = new fireauth.DynamicLink(
      null, iosPlatform, appIdentifier, authDomain, payload, clientId);
  // Confirm all properties set correctly.
  assertEquals(
      fallbackUrl, reverseOAuthClientIdCustomSchemeLink['fallbackUrl']);
  assertNull(reverseOAuthClientIdCustomSchemeLink['fdlDomain']);
  assertEquals(iosPlatform, reverseOAuthClientIdCustomSchemeLink['platform']);
  assertEquals(
      appIdentifier, reverseOAuthClientIdCustomSchemeLink['appIdentifier']);
  assertEquals(authDomain, reverseOAuthClientIdCustomSchemeLink['authDomain']);
  assertEquals(payload, reverseOAuthClientIdCustomSchemeLink['payload']);
  assertEquals(clientId, reverseOAuthClientIdCustomSchemeLink['clientId']);
  assertNull(reverseOAuthClientIdCustomSchemeLink['appName']);
  // Set app name.
  reverseOAuthClientIdCustomSchemeLink.setAppName(appName);
  assertEquals(appName, reverseOAuthClientIdCustomSchemeLink['appName']);
  // Override the default fallback URL.
  reverseOAuthClientIdCustomSchemeLink.setFallbackUrl(customFallbackUrl);
  assertEquals(
      customFallbackUrl, reverseOAuthClientIdCustomSchemeLink['fallbackUrl']);
}


function testDynamicLink_fromURL() {
  // Invalid dynamic link.
  assertNull(fireauth.DynamicLink.fromURL(payload));
  // Valid Android dynamic link.
  androidDynamicLink = new fireauth.DynamicLink(
      fdlDomain, androidPlatform, appIdentifier, authDomain, payload);
  androidDynamicLink.setAppName(appName);
  assertObjectEquals(
      androidDynamicLink, fireauth.DynamicLink.fromURL(androidDynamicLinkUrl));
  // Valid iOS dynamic link.
  iosDynamicLink = new fireauth.DynamicLink(
      fdlDomain, iosPlatform, appIdentifier, authDomain, payload);
  iosDynamicLink.setAppName(appName);
  assertObjectEquals(
      iosDynamicLink, fireauth.DynamicLink.fromURL(iosDynamicLinkUrl));
  // Any missing field should resolve to null.
  for (var i = 0; i < requiredDynamicLinkUrlFields.length; i++) {
    // Remove one required field and confirm it resolves to null.
    assertNull(fireauth.DynamicLink.fromURL(
        goog.Uri.parse(androidDynamicLinkUrl)
        .removeParameter(requiredDynamicLinkUrlFields[i])
        .toString()));
  }
  // Custom scheme URLs can't be constructed from URL string.
  assertNull(fireauth.DynamicLink.fromURL(customSchemeLinkUrl));
  assertNull(fireauth.DynamicLink.fromURL(
      reverseOAuthClientIdCustomSchemeLinkUrl));
}


function testDynamicLink_toString_isAutoRedirect_android() {
  androidDynamicLink = new fireauth.DynamicLink(
      fdlDomain, androidPlatform, appIdentifier, authDomain, payload);
  androidDynamicLink.setAppName(appName);
  assertEquals(
      androidAutoRedirectDynamicLinkUrl, androidDynamicLink.toString(true));
}


function testDynamicLink_toString_isAutoRedirect_android_noAppName() {
  androidDynamicLink = new fireauth.DynamicLink(
      fdlDomain, androidPlatform, appIdentifier, authDomain, payload);
  // Assume no app name provided.
  androidDynamicLink.setAppName(null);
  assertEquals(
      noAppNameAndroidAutoRedirectDynamicLinkUrl,
      androidDynamicLink.toString(true));
}


function testDynamicLink_toString_isAutoRedirect_ios() {
  iosDynamicLink = new fireauth.DynamicLink(
      fdlDomain, iosPlatform, appIdentifier, authDomain, payload);
  iosDynamicLink.setAppName(appName);
  assertEquals(iosAutoRedirectDynamicLinkUrl, iosDynamicLink.toString(true));
}


function testDynamicLink_toString_isNotAutoRedirect_android() {
  androidDynamicLink = new fireauth.DynamicLink(
      fdlDomain, androidPlatform, appIdentifier, authDomain, payload);
  androidDynamicLink.setAppName(appName);
  assertEquals(
      androidUserInteractionDynamicLinkUrl, androidDynamicLink.toString());
}


function testDynamicLink_toString_isNotAutoRedirect_ios() {
  iosDynamicLink = new fireauth.DynamicLink(
      fdlDomain, iosPlatform, appIdentifier, authDomain,
      payload);
  iosDynamicLink.setAppName(appName);
  assertEquals(
      iosUserInteractionDynamicLinkUrl, iosDynamicLink.toString());
}


function testDynamicLink_toString_customSchemeUrl() {
  customSchemeLink = new fireauth.DynamicLink(
      null, iosPlatform, appIdentifier, authDomain, payload);
  customSchemeLink.setAppName(appName);
  assertEquals(
      customSchemeLinkUrl, customSchemeLink.toString(false));
  assertEquals(
      customSchemeLinkUrl, customSchemeLink.toString(true));
}


function testDynamicLink_toString_reverseOAuthClientIdCustomSchemeUrl() {
  reverseOAuthClientIdCustomSchemeLink = new fireauth.DynamicLink(
      null, iosPlatform, appIdentifier, authDomain, payload, clientId);
  reverseOAuthClientIdCustomSchemeLink.setAppName(appName);
  assertEquals(
      reverseOAuthClientIdCustomSchemeLinkUrl,
      reverseOAuthClientIdCustomSchemeLink.toString(false));
  assertEquals(
      reverseOAuthClientIdCustomSchemeLinkUrl,
      reverseOAuthClientIdCustomSchemeLink.toString(true));
}


function testDynamicLink_parseDeepLink_urlItself() {
  var deepLink =
      'https://example.firebaseapp.com/__/auth/callback#oauthResponse';
  assertEquals(deepLink, fireauth.DynamicLink.parseDeepLink(deepLink));
}


function testDynamicLink_parseDeepLink_deepLink() {
  var deepLink =
      'https://example.firebaseapp.com/__/auth/callback#oauthResponse';
  var url = 'https://example.app.goo.gl/?link=' + encodeURIComponent(deepLink);
  assertEquals(deepLink, fireauth.DynamicLink.parseDeepLink(url));
}


function testDynamicLink_parseDeepLink_linkWithinLink() {
  var deepLink =
      'https://example.firebaseapp.com/__/auth/callback#oauthResponse';
  var linkWithLink = 'https://example.firebaseapp.com/__/auth/callback?link=' +
      encodeURIComponent(deepLink);
  var url = 'https://example.app.goo.gl/?link=' +
      encodeURIComponent(linkWithLink);
  assertEquals(deepLink, fireauth.DynamicLink.parseDeepLink(url));
}


function testDynamicLink_parseDeepLink_customUrlSchemeDeepLink() {
  var deepLink =
      'https://example.firebaseapp.com/__/auth/callback#oauthResponse';
  var url = 'comexampleiosurl://google/link?deep_link_id=' +
      encodeURIComponent(deepLink);
  assertEquals(deepLink, fireauth.DynamicLink.parseDeepLink(url));
}


function testDynamicLink_parseDeepLink_reverseClientIdSchemeDeepLink() {
  var deepLink =
      'https://example.firebaseapp.com/__/auth/callback#oauthResponse';
  var url = 'com.googleusercontent.apps.123456://firebaseauth/link?' +
      'deep_link_id=' + encodeURIComponent(deepLink);
  assertEquals(deepLink, fireauth.DynamicLink.parseDeepLink(url));
}


function testDynamicLink_parseDeepLink_customUrlSchemeLinkWithinLink() {
  var deepLink =
      'https://example.firebaseapp.com/__/auth/callback#oauthResponse';
  var linkWithLink = 'https://example.firebaseapp.com/__/auth/callback?link=' +
      encodeURIComponent(deepLink);
  var url = 'comexampleiosurl://google/link?deep_link_id=' +
      encodeURIComponent(linkWithLink);
  assertEquals(deepLink, fireauth.DynamicLink.parseDeepLink(url));
}


function testDynamicLink_parseDeepLink_clientIdCustomUrlSchemeLinkWithinLink() {
  var deepLink =
      'https://example.firebaseapp.com/__/auth/callback#oauthResponse';
  var linkWithLink = 'https://example.firebaseapp.com/__/auth/callback?link=' +
      encodeURIComponent(deepLink);
  var url = 'com.googleusercontent.apps.123456://firebaseauth/link?' +
      'deep_link_id=' + encodeURIComponent(linkWithLink);
  assertEquals(deepLink, fireauth.DynamicLink.parseDeepLink(url));
}
