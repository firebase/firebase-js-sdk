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
 * @fileoverview Defines utility and helper functions.
 */

goog.provide('fireauth.util');

goog.require('goog.Promise');
goog.require('goog.Timer');
goog.require('goog.Uri');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.html.SafeUrl');
goog.require('goog.json');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.userAgent');
goog.require('goog.window');


/** @suppress {duplicate} Suppress variable 'angular' first declared. */
var angular;

/**
 * Checks whether the user agent is IE11.
 * @return {boolean} True if it is IE11.
 */
fireauth.util.isIe11 = function() {
  return goog.userAgent.IE &&
      !!goog.userAgent.DOCUMENT_MODE &&
      goog.userAgent.DOCUMENT_MODE == 11;
};


/**
 * Checks whether the user agent is IE10.
 * @return {boolean} True if it is IE10.
 */
fireauth.util.isIe10 = function() {
  return goog.userAgent.IE &&
      !!goog.userAgent.DOCUMENT_MODE &&
      goog.userAgent.DOCUMENT_MODE == 10;
};


/**
 * Checks whether the user agent is Edge.
 * @param {string} userAgent The browser user agent string.
 * @return {boolean} True if it is Edge.
 */
fireauth.util.isEdge = function(userAgent) {
  return /Edge\/\d+/.test(userAgent);
};


/**
 * @param {?string=} opt_userAgent The navigator user agent.
 * @return {boolean} Whether local storage is not synchronized between an iframe
 *     and a popup of the same domain.
 */
fireauth.util.isLocalStorageNotSynchronized = function(opt_userAgent) {
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  return fireauth.util.isIe11() || fireauth.util.isEdge(ua);
};


/** @return {string} The current URL. */
fireauth.util.getCurrentUrl = function() {
  return (goog.global['window'] && goog.global['window']['location']['href']) ||
      // Check for worker environments.
      (self && self['location'] && self['location']['href']) || '';
};


/**
 * @param {string} requestUri The request URI to send in verifyAssertion
 *     request.
 * @return {string} The sanitized URI, in this case it undoes the hashbang
 *     angularJs routing changes to request URI.
 */
fireauth.util.sanitizeRequestUri = function(requestUri) {
  // If AngularJS is included.
  if (typeof angular != 'undefined') {
    // Remove hashbang modifications from URL.
    requestUri = requestUri.replace('#/', '#').replace('#!/', '#');
  }
  return requestUri;
};


/**
 * @param {?string} url The target URL. When !url, redirects to a blank page.
 * @param {!Window=} opt_window The optional window to redirect to target URL.
 * @param {boolean=} opt_bypassCheck Whether to bypass check. Used for custom
 *     scheme redirects.
 */
fireauth.util.goTo = function(url, opt_window, opt_bypassCheck) {
  var win = opt_window || goog.global['window'];
  // No URL, redirect to blank page.
  var finalUrl = 'about:blank';
  // Popping up a window and then assigning its URL seems to cause some weird
  // error. Fixed by setting win.location.href for now in IE browsers.
  // Bug was detected in Edge and IE9.
  if (url && !opt_bypassCheck) {
    // We cannot use goog.dom.safe.setLocationHref since it tries to read
    // popup.location from a different origin, which is an error in IE.
    // (In Chrome, popup.location is just an empty Location object)
    finalUrl = goog.html.SafeUrl.unwrap(goog.html.SafeUrl.sanitize(url));
  }
  win.location.href = finalUrl;
};


/**
 * @param {string} url The target URL.
 * @param {!Window=} opt_window The optional window to replace with target URL.
 * @param {boolean=} opt_bypassCheck Whether to bypass check. Used for custom
 *     scheme redirects.
 */
fireauth.util.replaceCurrentUrl = function(url, opt_window, opt_bypassCheck) {
  var win = opt_window || goog.global['window'];
  if (!opt_bypassCheck) {
    win.location.replace(
        goog.html.SafeUrl.unwrap(goog.html.SafeUrl.sanitize(url)));
  } else {
    win.location.replace(url);
  }
};


/**
 * @param {!Object} a The first object.
 * @param {!Object} b The second object.
 * @return {!Array<string>} The list of keys that are different between both
 *     objects provided.
 */
fireauth.util.getKeyDiff = function(a, b) {
  var diff = [];
  for (var k in a) {
    if (!(k in b)) {
      diff.push(k);
    } else if (typeof a[k] != typeof b[k]) {
      diff.push(k);
    } else if (goog.isArray(a[k])) {
      if (!goog.object.equals(a[k], b[k])) {
        diff.push(k);
      }
    } else if (typeof a[k] == 'object' && a[k] != null && b[k] != null) {
      if (fireauth.util.getKeyDiff(
          a[k], b[k]).length > 0) {
        diff.push(k);
      }
    } else if (a[k] !== b[k]) {
      diff.push(k);
    }
  }
  for (var k in b) {
    if (!(k in a)) {
      diff.push(k);
    }
  }
  return diff;
};


/**
 * @param {?string=} opt_userAgent The navigator user agent.
 * @return {?number} The Chrome version, null if the user agent is not Chrome.
 */
fireauth.util.getChromeVersion = function(opt_userAgent) {
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  var browserName = fireauth.util.getBrowserName(ua);
  // Confirm current browser is Chrome.
  if (browserName != fireauth.util.BrowserName.CHROME) {
    return null;
  }
  var matches = ua.match(/\sChrome\/(\d+)/i);
  if (matches && matches.length == 2) {
    return parseInt(matches[1], 10);
  }
  return null;
};


/**
 * Detects CORS support.
 * @param {?string=} opt_userAgent The navigator user agent.
 * @return {boolean} True if the browser supports CORS.
 */
fireauth.util.supportsCors = function(opt_userAgent) {
  // Chrome 7 has CORS issues, pick 30 as upper limit.
  var chromeVersion = fireauth.util.getChromeVersion(opt_userAgent);
  if (chromeVersion && chromeVersion < 30) {
    return false;
  }
  // Among all other supported browsers, only IE8 and IE9 don't support CORS.
  return !goog.userAgent.IE || // Not IE.
      !goog.userAgent.DOCUMENT_MODE || // No document mode == IE Edge.
      goog.userAgent.DOCUMENT_MODE > 9;
};


/**
 * Detects whether browser is running on a mobile device.
 * @param {?string=} opt_userAgent The navigator user agent.
 * @return {boolean} True if the browser is running on a mobile device.
 */
fireauth.util.isMobileBrowser = function(opt_userAgent) {
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  var uaLower = ua.toLowerCase();
  // TODO: implement getBrowserName equivalent for OS.
  if (uaLower.match(/android/) ||
      uaLower.match(/webos/) ||
      uaLower.match(/iphone|ipad|ipod/) ||
      uaLower.match(/blackberry/) ||
      uaLower.match(/windows phone/) ||
      uaLower.match(/iemobile/)) {
    return true;
  }
  return false;
};


/**
 * Closes the provided window.
 * @param {?Window=} opt_window The optional window to close. The current window
 *     is used if none is provided.
 */
fireauth.util.closeWindow = function(opt_window) {
  var win = opt_window || goog.global['window'];
  // In some browsers, in certain cases after the window closes, as seen in
  // Samsung Galaxy S3 Android 4.4.2 stock browser, the win object here is an
  // empty object {}. Try to catch the failure and ignore it.
  try {
    win.close();
  } catch(e) {}
};


/**
 * Opens a popup window.
 * @param {?string=} opt_url initial URL of the popup window
 * @param {string=} opt_name title of the popup
 * @param {?number=} opt_width width of the popup
 * @param {?number=} opt_height height of the popup
 * @return {?Window} Returns the window object that was opened. This returns
 *                   null if a popup blocker prevented the window from being
 *                   opened.
 */
fireauth.util.popup = function(opt_url, opt_name, opt_width, opt_height) {
  var width = opt_width || 500;
  var height = opt_height || 600;
  var top = (window.screen.availHeight - height) / 2;
  var left = (window.screen.availWidth - width) / 2;
  var options = {
    'width': width,
    'height': height,
    'top': top > 0 ? top : 0,
    'left': left > 0 ? left : 0,
    'location': true,
    'resizable': true,
    'statusbar': true,
    'toolbar': false
  };
  // Chrome iOS 7 and 8 is returning an undefined popup win when target is
  // specified, even though the popup is not necessarily blocked.
  var ua = fireauth.util.getUserAgentString().toLowerCase();
  if (opt_name) {
    options['target'] = opt_name;
    // This will force a new window on each call, achieving the same effect as
    // passing a random name on each call.
    if (goog.string.contains(ua, 'crios/')) {
      options['target'] = '_blank';
    }
  }
  var browserName = fireauth.util.getBrowserName(
      fireauth.util.getUserAgentString());
  if (browserName == fireauth.util.BrowserName.FIREFOX) {
    // Firefox complains when invalid URLs are popped out. Hacky way to bypass.
    opt_url = opt_url || 'http://localhost';
    // Firefox disables by default scrolling on popup windows, which can create
    // issues when the user has many Google accounts, for instance.
    options['scrollbars'] = true;
  }
  // about:blank getting sanitized causing browsers like IE/Edge to display
  // brief error message before redirecting to handler.
  var newWin = goog.window.open(opt_url || '', options);
  if (newWin) {
    // Flaky on IE edge, encapsulate with a try and catch.
    try {
      newWin.focus();
    } catch (e) {}
  }
  return newWin;
};


/**
 * The default value for the popup wait cycle in ms.
 * @const {number}
 * @private
 */
fireauth.util.POPUP_WAIT_CYCLE_MS_ = 2000;


/**
 * @param {?string=} opt_userAgent The optional user agent.
 * @return {boolean} Whether the popup requires a delay before closing itself.
 */
fireauth.util.requiresPopupDelay = function(opt_userAgent) {
  // TODO: remove this hack when CriOS behavior is fixed in iOS.
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  // Was observed in iOS 10.2 Chrome version 55.0.2883.79.
  // Apply to Chrome 55+ iOS 10+ to ensure future Chrome versions or iOS 10
  // minor updates do not suddenly resurface this bug. Revisit this check on
  // next CriOS update.
  var matches = ua.match(/OS (\d+)_.*CriOS\/(\d+)\./i);
  if (matches && matches.length > 2) {
    // iOS 10+ && chrome 55+.
    return parseInt(matches[1], 10) >= 10 && parseInt(matches[2], 10) >= 55;
  }
  return false;
};


/**
 * @param {?Window} win The popup window to check.
 * @param {number=} opt_stepDuration The duration of each wait cycle before
 *     checking that window is closed.
 * @return {!goog.Promise<undefined>} The promise to resolve when window is
 *     closed.
 */
fireauth.util.onPopupClose = function(win, opt_stepDuration) {
  var stepDuration = opt_stepDuration || fireauth.util.POPUP_WAIT_CYCLE_MS_;
  return new goog.Promise(function(resolve, reject) {
    // Function to repeat each stepDuration.
    var repeat = function() {
      goog.Timer.promise(stepDuration).then(function() {
        // After wait, check if window is closed.
        if (!win || win.closed) {
          // If so, resolve.
          resolve();
        } else {
          // Call repeat again.
          return repeat();
        }
      });
    };
    return repeat();
  });
};


/**
 * @param {!Array<string>} authorizedDomains List of authorized domains.
 * @param {string} url The URL to check.
 * @return {boolean} Whether the passed domain is an authorized one.
 */
fireauth.util.isAuthorizedDomain = function(authorizedDomains, url) {
  var uri = goog.Uri.parse(url);
  var scheme = uri.getScheme();
  var domain = uri.getDomain();
  for (var i = 0; i < authorizedDomains.length; i++) {
    // Currently this corresponds to: domain.com = *://*.domain.com:* or
    // exact domain match.
    // In the case of Chrome extensions, the authorizedDomain will be formatted
    // as 'chrome-extension://abcdefghijklmnopqrstuvwxyz123456'.
    // The URL to check must have a chrome extension scheme and the domain
    // must be an exact match domain == 'abcdefghijklmnopqrstuvwxyz123456'.
    if (fireauth.util.matchDomain(authorizedDomains[i], domain, scheme)) {
      return true;
    }
  }
  return false;
};


/**
 * Represents the dimensions of an entity (width and height).
 * @typedef {{
 *   width: number,
 *   height: number
 * }}
 */
fireauth.util.Dimensions;


/**
 * @param {?Window=} opt_window The optional window whose dimensions are to be
 *     returned. The current window is used if not found.
 * @return {?fireauth.util.Dimensions} The requested window dimensions if
 *     available.
 */
fireauth.util.getWindowDimensions = function(opt_window) {
  var win = opt_window || goog.global['window'];
  if (win && win['innerWidth'] && win['innerHeight']) {
    return {
      'width': parseFloat(win['innerWidth']),
      'height': parseFloat(win['innerHeight'])
    };
  }
  return null;
};


/**
 * RegExp to detect if the domain given is an IP address. This is only used
 * for validating http and https schemes.
 *
 * It does not strictly validate if the IP is a real IP address, but as the
 * matchDomain method tests against a set of valid domains (extracted from the
 * window's current URL), it is sufficient.
 *
 * @const {!RegExp}
 * @private
 */
fireauth.util.IP_ADDRESS_REGEXP_ = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;


/**
 * @param {string} domainPattern The domain pattern to match.
 * @param {string} domain The domain to check. It is assumed that it is a valid
 *     domain, not a user provided one.
 * @param {string} scheme The scheme of the domain to check.
 * @return {boolean} Whether the provided domain matches the domain pattern.
 */
fireauth.util.matchDomain = function(domainPattern, domain, scheme) {
  // Chrome extension matching.
  if (domainPattern.indexOf('chrome-extension://') == 0) {
    var chromeExtUri = goog.Uri.parse(domainPattern);
    // Domain must match and the current scheme must be a Chrome extension.
    return chromeExtUri.getDomain() == domain && scheme == 'chrome-extension';
  } else if (scheme != 'http' && scheme != 'https') {
    // Any other scheme that is not http or https cannot be whitelisted.
    return false;
  } else {
    // domainPattern must not contain a scheme and the current scheme must be
    // either http or https.
    // Check if authorized domain pattern is an IP address.
    if (fireauth.util.IP_ADDRESS_REGEXP_.test(domainPattern)) {
      // The domain has to be exactly equal to the pattern, as an IP domain will
      // only contain the IP, no extra character.
      return domain == domainPattern;
    }
    // Dots in pattern should be escaped.
    var escapedDomainPattern = domainPattern.split('.').join('\\.');
    // Non ip address domains.
    // domain.com = *.domain.com OR domain.com
    var re = new RegExp(
        '^(.+\\.' + escapedDomainPattern + '|' +
        escapedDomainPattern + ')$', 'i');
    return re.test(domain);
  }
};


/**
 * @return {!goog.Promise<void>} A promise that resolves when DOM is ready.
 */
fireauth.util.onDomReady = function() {
  var resolver = null;
  return new goog.Promise(function(resolve, reject) {
    var doc = goog.global.document;
    // If document already loaded, resolve immediately.
    if (doc.readyState == 'complete') {
      resolve();
    } else {
      // Document not ready, wait for load before resolving.
      // Save resolver, so we can remove listener in case it was externally
      // cancelled.
      resolver = function() {
        resolve();
      };
      goog.events.listenOnce(window, goog.events.EventType.LOAD, resolver);
    }
  }).thenCatch(function(error) {
    // In case this promise was cancelled, make sure it unlistens to load.
    goog.events.unlisten(window, goog.events.EventType.LOAD, resolver);
    throw error;
  });
};


/** @return {boolean} Whether environment supports DOM. */
fireauth.util.isDOMSupported = function() {
  return !!goog.global.document;
};


/**
 * The default ondeviceready Cordova timeout in ms.
 * @const {number}
 * @private
 */
fireauth.util.CORDOVA_ONDEVICEREADY_TIMEOUT_MS_ = 1000;


/**
 * @param {?string=} opt_userAgent The optional user agent.
 * @param {number=} opt_timeout The optional timeout in ms for deviceready
 *     event to resolve.
 * @return {!goog.Promise} A promise that resolves if the current environment is
 *     a Cordova environment.
 */
fireauth.util.checkIfCordova = function(opt_userAgent, opt_timeout) {
  // Errors generated are internal and should be converted if needed to
  // developer facing Firebase errors.
  // Only supported in Android/iOS environment.
  if (fireauth.util.isAndroidOrIosFileEnvironment(opt_userAgent)) {
    return fireauth.util.onDomReady().then(function() {
      return new goog.Promise(function(resolve, reject) {
        var doc = goog.global.document;
        var timeoutId = setTimeout(function() {
          reject(new Error('Cordova framework is not ready.'));
        }, opt_timeout || fireauth.util.CORDOVA_ONDEVICEREADY_TIMEOUT_MS_);
        // This should resolve immediately after DOM ready.
        doc.addEventListener('deviceready', function() {
          clearTimeout(timeoutId);
          resolve();
        }, false);
      });
    });
  }
  return goog.Promise.reject(
      new Error('Cordova must run in an Android or iOS file scheme.'));
};


/**
 * @param {?string=} opt_userAgent The optional user agent.
 * @return {boolean} Whether the app is rendered in a mobile iOS or Android file
 *     environment.
 */
fireauth.util.isAndroidOrIosFileEnvironment = function(opt_userAgent) {
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  return !!(fireauth.util.getCurrentScheme() === 'file:' &&
            ua.toLowerCase().match(/iphone|ipad|ipod|android/));
};


/**
 * @param {?string=} opt_userAgent The optional user agent.
 * @return {boolean} Whether the app is rendered in a mobile iOS 7 or 8 browser.
 */
fireauth.util.isIOS7Or8 = function(opt_userAgent) {
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  return !!(ua.match(/(iPad|iPhone|iPod).*OS 7_\d/i) ||
            ua.match(/(iPad|iPhone|iPod).*OS 8_\d/i));
};


/**
 * @return {boolean} Whether browser is Safari or an iOS browser and page is
 *     embedded in an iframe. Local Storage does not synchronize with an iframe
 *     embedded on a page in a different domain but will still trigger storage
 *     event with storage changes.
 */
fireauth.util.isSafariLocalStorageNotSynced = function() {
  var ua = fireauth.util.getUserAgentString();
  // Safari or iOS browser and embedded in an iframe.
  if (!fireauth.util.iframeCanSyncWebStorage(ua) && fireauth.util.isIframe()) {
    return true;
  }
  return false;
};


/**
 * @param {?Window=} opt_win Optional window to check whether it is an iframe.
 *     If not provided, the current window is checked.
 * @return {boolean} Whether web page is running in an iframe.
 */
fireauth.util.isIframe = function(opt_win) {
  var win = opt_win || goog.global['window'];
  try {
    // Check that the current window is not the top window.
    // If so, return true.
    return !!(win && win != win['top']);
  } catch (e) {
    return false;
  }
};


/**
 * @param {?Window=} opt_win Optional window to check whether it has an opener
 *     that is an iframe.
 * @return {boolean} Whether the web page was opened from an iframe.
 */
fireauth.util.isOpenerAnIframe = function(opt_win) {
  var win = opt_win || goog.global['window'];
  try {
    // Get the opener if available.
    var opener = win && win['opener'];
    // Check if the opener is an iframe. If so, return true.
    // Confirm opener is available, otherwise the current window is checked
    // instead.
    return !!(opener && fireauth.util.isIframe(opener));
  } catch (e) {
    return false;
  }
};


/**
 * @param {?Object=} opt_global The optional global scope.
 * @return {boolean} Whether current environment is a worker.
 */
fireauth.util.isWorker = function(opt_global) {
  var scope = opt_global || goog.global;
  return typeof scope['window'] !== 'object' &&
         typeof scope['importScripts'] === 'function';
};


/**
 * @param {?Object=} opt_global The optional global scope.
 * @return {boolean} Whether current environment supports fetch API and other
 *     APIs it depends on.
 */
fireauth.util.isFetchSupported = function(opt_global) {
  // Required by fetch API calls.
  var scope = opt_global || goog.global;
  return typeof scope['fetch'] !== 'undefined' &&
         typeof scope['Headers'] !== 'undefined' &&
         typeof scope['Request'] !== 'undefined';
};


/**
 * Enum for the runtime environment.
 * @enum {string}
 */
fireauth.util.Env = {
  BROWSER: 'Browser',
  NODE: 'Node',
  REACT_NATIVE: 'ReactNative',
  WORKER: 'Worker'
};


/**
 * @return {!fireauth.util.Env} The current runtime environment.
 */
fireauth.util.getEnvironment = function() {
  if (firebase.INTERNAL.hasOwnProperty('reactNative')) {
    return fireauth.util.Env.REACT_NATIVE;
  } else if (firebase.INTERNAL.hasOwnProperty('node')) {
    // browserify seems to keep the process property in some cases even though
    // the library is browser only. Use this check instead to reliably detect
    // a Node.js environment.
    return fireauth.util.Env.NODE;
  } else if (fireauth.util.isWorker()) {
    // Worker environment.
    return fireauth.util.Env.WORKER;
  }
  // The default is a browser environment.
  return fireauth.util.Env.BROWSER;
};


/**
 * @return {boolean} Whether the environment is a native environment, where
 *     CORS checks do not apply.
 */
fireauth.util.isNativeEnvironment = function() {
  var environment = fireauth.util.getEnvironment();
  return environment === fireauth.util.Env.REACT_NATIVE ||
      environment === fireauth.util.Env.NODE;
};


/**
 * The separator for storage keys to concatenate App name and API key.
 * @const {string}
 * @private
 */
fireauth.util.STORAGE_KEY_SEPARATOR_ = ':';


/**
 * @param {string} apiKey The API Key of the app.
 * @param {string} appName The App name.
 * @return {string} The key used for identifying the app owner of the user.
 */
fireauth.util.createStorageKey = function(apiKey, appName) {
  return apiKey + fireauth.util.STORAGE_KEY_SEPARATOR_ + appName;
};


/** @return {string} a long random character string. */
fireauth.util.generateRandomString = function() {
  return Math.floor(Math.random() * 1000000000).toString();
};


/**
 * Enums for Browser name.
 * @enum {string}
 */
fireauth.util.BrowserName = {
  ANDROID: 'Android',
  BLACKBERRY: 'Blackberry',
  EDGE: 'Edge',
  FIREFOX: 'Firefox',
  IE: 'IE',
  IEMOBILE: 'IEMobile',
  OPERA: 'Opera',
  OTHER: 'Other',
  CHROME: 'Chrome',
  SAFARI: 'Safari',
  SILK: 'Silk',
  WEBOS: 'Webos'
};


/**
 * @param {string} userAgent The navigator user agent string.
 * @return {string} The browser name, eg Safari, Firefox, etc.
 */
fireauth.util.getBrowserName = function(userAgent) {
  var ua = userAgent.toLowerCase();
  if (goog.string.contains(ua, 'opera/') ||
      goog.string.contains(ua, 'opr/') ||
      goog.string.contains(ua, 'opios/')) {
    return fireauth.util.BrowserName.OPERA;
  } else if (goog.string.contains(ua, 'iemobile')) {
    // Windows phone IEMobile browser.
    return fireauth.util.BrowserName.IEMOBILE;
  } else if (goog.string.contains(ua, 'msie') ||
             goog.string.contains(ua, 'trident/')) {
    return fireauth.util.BrowserName.IE;
  } else if (goog.string.contains(ua, 'edge/')) {
    return fireauth.util.BrowserName.EDGE;
  } else if (goog.string.contains(ua, 'firefox/')) {
    return fireauth.util.BrowserName.FIREFOX;
  } else if (goog.string.contains(ua, 'silk/')) {
    return fireauth.util.BrowserName.SILK;
  } else if (goog.string.contains(ua, 'blackberry')) {
    // Blackberry browser.
    return fireauth.util.BrowserName.BLACKBERRY;
  } else if (goog.string.contains(ua, 'webos')) {
    // WebOS default browser.
    return fireauth.util.BrowserName.WEBOS;
  } else if (goog.string.contains(ua, 'safari/') &&
             !goog.string.contains(ua, 'chrome/') &&
             !goog.string.contains(ua, 'crios/') &&
             !goog.string.contains(ua, 'android')) {
    return fireauth.util.BrowserName.SAFARI;
  } else if ((goog.string.contains(ua, 'chrome/') ||
              goog.string.contains(ua, 'crios/')) &&
             !goog.string.contains(ua, 'edge/')) {
    return fireauth.util.BrowserName.CHROME;
  } else if (goog.string.contains(ua, 'android')) {
    // Android stock browser.
    return fireauth.util.BrowserName.ANDROID;
  } else {
    // Most modern browsers have name/version at end of user agent string.
    var re = new RegExp('([a-zA-Z\\d\\.]+)\/[a-zA-Z\\d\\.]*$');
    var matches = userAgent.match(re);
    if (matches && matches.length == 2) {
      return matches[1];
    }
  }
  return fireauth.util.BrowserName.OTHER;
};


/**
 * Enums for client implementation name.
 * @enum {string}
 */
fireauth.util.ClientImplementation = {
  JSCORE: 'JsCore',
  OAUTH_HANDLER: 'Handler',
  OAUTH_IFRAME: 'Iframe'
};


/**
 * Enums for the framework ID to be logged in RPC header.
 * Future frameworks to possibly add: angularfire, polymerfire, reactfire, etc.
 * @enum {string}.
 */
fireauth.util.Framework = {
  // No other framework used.
  DEFAULT: 'FirebaseCore-web',
  // Firebase Auth used with FirebaseUI-web.
  FIREBASEUI: 'FirebaseUI-web'
};


/**
 * @param {!Array<string>} providedFrameworks List of framework ID strings.
 * @return {!Array<!fireauth.util.Framework>} List of supported framework IDs
 *     with no duplicates.
 */
fireauth.util.getFrameworkIds = function(providedFrameworks) {
  var frameworkVersion = [];
  var frameworkSet = {};
  for (var key in fireauth.util.Framework) {
    frameworkSet[fireauth.util.Framework[key]] = true;
  }
  for (var i = 0; i < providedFrameworks.length; i++) {
    if (typeof frameworkSet[providedFrameworks[i]] !== 'undefined') {
      // Delete it from set to prevent duplications.
      delete frameworkSet[providedFrameworks[i]];
      frameworkVersion.push(providedFrameworks[i]);
    }
  }
  // Sort alphabetically so that "FirebaseCore-web,FirebaseUI-web" and
  // "FirebaseUI-web,FirebaseCore-web" aren't viewed as different.
  frameworkVersion.sort();
  return frameworkVersion;
};


/**
 * @param {!fireauth.util.ClientImplementation} clientImplementation The client
 *     implementation.
 * @param {string} clientVersion The client version.
 * @param {?Array<string>=} opt_frameworkVersion The framework version.
 * @param {?string=} opt_userAgent The optional user agent.
 * @return {string} The full client SDK version.
 */
fireauth.util.getClientVersion = function(clientImplementation, clientVersion,
    opt_frameworkVersion, opt_userAgent) {
  var frameworkVersion = fireauth.util.getFrameworkIds(
      opt_frameworkVersion || []);
  if (!frameworkVersion.length) {
    frameworkVersion = [fireauth.util.Framework.DEFAULT];
  }
  var environment = fireauth.util.getEnvironment();
  var reportedEnvironment = '';
  if (environment === fireauth.util.Env.BROWSER) {
    // In a browser environment, report the browser name.
    var userAgent = opt_userAgent || fireauth.util.getUserAgentString();
    reportedEnvironment = fireauth.util.getBrowserName(userAgent);
  } else if (environment === fireauth.util.Env.WORKER) {
    // Technically a worker runs from a browser but we need to differentiate a
    // worker from a browser.
    // For example: Chrome-Worker/JsCore/4.9.1/FirebaseCore-web.
    var userAgent = opt_userAgent || fireauth.util.getUserAgentString();
    reportedEnvironment = fireauth.util.getBrowserName(userAgent) + '-' +
        environment;
  } else {
    // Otherwise, just report the environment name.
    reportedEnvironment = environment;
  }
  // The format to be followed:
  // ${browserName}/${clientImplementation}/${clientVersion}/${frameworkVersion}
  // As multiple Firebase frameworks/libraries can be used, join their IDs with
  // a comma.
  return reportedEnvironment + '/' + clientImplementation +
      '/' + clientVersion + '/' + frameworkVersion.join(',');
};


/**
 * @return {string} The user agent string reported by the environment, or the
 *     empty string if not available.
 */
fireauth.util.getUserAgentString = function() {
  return (goog.global['navigator'] && goog.global['navigator']['userAgent']) ||
      '';
};


/**
 * @param {string} varStrName The variable string name.
 * @param {?Object=} opt_scope The optional scope where to look in. The default
 *     is window.
 * @return {*} The reference if found.
 */
fireauth.util.getObjectRef = function(varStrName, opt_scope) {
  var pieces = varStrName.split('.');
  var last = opt_scope || goog.global;
  for (var i = 0;
       i < pieces.length && typeof last == 'object' && last != null;
       i++) {
    last = last[pieces[i]];
  }
  // Last hasn't reached the end yet, return undefined.
  if (i != pieces.length) {
    last = undefined;
  }
  return last;
};


/** @return {boolean} Whether web storage is supported. */
fireauth.util.isWebStorageSupported = function() {
  try {
    var storage = goog.global['localStorage'];
    var key = fireauth.util.generateEventId();
    if (storage) {
      // setItem will throw an exception if we cannot access WebStorage (e.g.,
      // Safari in private mode).
      storage['setItem'](key, '1');
      storage['removeItem'](key);
      // For browsers where iframe web storage does not synchronize with a popup
      // of the same domain, indexedDB is used for persistent storage. These
      // browsers include IE11 and Edge.
      // Make sure it is supported (IE11 and Edge private mode does not support
      // that).
      if (fireauth.util.isLocalStorageNotSynchronized()) {
        // In such browsers, if indexedDB is not supported, an iframe cannot be
        // notified of the popup sign in result.
        return !!goog.global['indexedDB'];
      }
      return true;
    }
  } catch (e) {
    // localStorage is not available from a worker. Test availability of
    // indexedDB.
    return fireauth.util.isWorker() && !!goog.global['indexedDB'];
  }
  return false;
};


/**
 * This guards against leaking Cordova support before official launch.
 * This field will be removed or updated to return true when the new feature is
 * ready for launch.
 * @return {boolean} Whether Cordova OAuth support is enabled.
 */
fireauth.util.isCordovaOAuthEnabled = function() {
  return false;
};


/**
 * @return {boolean} Whether popup and redirect operations are supported in the
 *     current environment.
 */
fireauth.util.isPopupRedirectSupported = function() {
  // Popup and redirect are supported in an environment where the container
  // origin can be securely whitelisted.
  return (fireauth.util.isHttpOrHttps() ||
          fireauth.util.isChromeExtension() ||
          fireauth.util.isAndroidOrIosFileEnvironment()) &&
         // React Native with remote debugging reports its location.protocol as
         // http.
         !fireauth.util.isNativeEnvironment() &&
         // Local storage has to be supported for browser popup and redirect
         // operations to work.
         fireauth.util.isWebStorageSupported() &&
         // DOM, popups and redirects are not supported within a worker.
         !fireauth.util.isWorker();
};


/**
 * @return {boolean} Whether the current environment is http or https.
 */
fireauth.util.isHttpOrHttps = function() {
  return fireauth.util.getCurrentScheme() === 'http:' ||
       fireauth.util.getCurrentScheme() === 'https:';
};


/** @return {?string} The current URL scheme. */
fireauth.util.getCurrentScheme = function() {
  return (goog.global['location'] && goog.global['location']['protocol']) ||
      null;
};


/**
 * Checks whether the current page is a Chrome extension.
 * @return {boolean} Whether the current page is a Chrome extension.
 */
fireauth.util.isChromeExtension = function() {
  return fireauth.util.getCurrentScheme() === 'chrome-extension:';
};


/**
 * @param {?string=} opt_userAgent The optional user agent.
 * @return {boolean} Whether the current browser is running in an iOS
 *     environment.
 */
fireauth.util.isIOS = function(opt_userAgent) {
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  return !!ua.toLowerCase().match(/iphone|ipad|ipod/);
};


/**
 * @param {?string=} opt_userAgent The optional user agent.
 * @return {boolean} Whether the current browser is running in an Android
 *     environment.
 */
fireauth.util.isAndroid = function(opt_userAgent) {
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  return !!ua.toLowerCase().match(/android/);
};


/**
 * @param {?string=} opt_userAgent The optional user agent.
 * @return {boolean} Whether the opener of a popup cannot communicate with the
 *     popup while it is in the foreground.
 */
fireauth.util.runsInBackground = function(opt_userAgent) {
  // TODO: split this check into 2, one check that opener can access
  // popup, another check that storage synchronizes between popup and opener.
  // Popup events fail in iOS version 7 (lowest version we currently support)
  // browsers. When the popup is triggered, the opener is unable to redirect
  // the popup url, close the popup and in some cases will miss the storage
  // event triggered when localStorage is changed.
  // Extend this to all mobile devices. This behavior is more likely to work
  // cross mobile platforms.
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  if (fireauth.util.isMobileBrowser(ua)) {
    return false;
  } else if (fireauth.util.getBrowserName(ua) ==
             fireauth.util.BrowserName.FIREFOX) {
    // Latest version of Firefox 47.0 does not allow you to access properties on
    // the popup window from the opener.
    return false;
  }
  return true;
};


/**
 * Stringifies an object, retuning null if the object is not defined.
 * @param {*} obj The raw object.
 * @return {?string} The JSON-serialized object.
 */
fireauth.util.stringifyJSON = function(obj) {
  if (typeof obj === 'undefined') {
    return null;
  }
  return goog.json.serialize(obj);
};


/**
 * @param {!Object} obj The original object.
 * @return {!Object} A copy of the original object with all entries that are
 *     null or undefined removed.
 */
fireauth.util.copyWithoutNullsOrUndefined = function(obj) {
  // The processed copy to return.
  var trimmedObj = {};
  // Remove all empty fields from data, allow zero and false booleans.
  for (var key in obj) {
    if (obj.hasOwnProperty(key) &&
        obj[key] !== null &&
        obj[key] !== undefined) {
      trimmedObj[key] = obj[key];
    }
  }
  return trimmedObj;
};


/**
 * Removes all key/pairs with the specified keys from the given object.
 * @param {!Object} obj The object to process.
 * @param {!Array<string>} keys The list of keys to remove.
 * @return {!Object} The object with the keys removed.
 */
fireauth.util.removeEntriesWithKeys = function(obj, keys) {
  // Clone object.
  var copy = goog.object.clone(obj);
  // Traverse keys.
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    // If key found in object, remove it.
    if (key in copy) {
      delete copy[key];
    }
  }
  // Returned filtered copy.
  return copy;
};


/**
 * Parses a JSON string, returning undefined if null is passed.
 * @param {?string} json The JSON-serialized object.
 * @return {*} The raw object.
 */
fireauth.util.parseJSON = function(json) {
  if (goog.isNull(json)) {
    return undefined;
  }

  // Do not use goog.json.parse since it uses eval underneath to support old
  // browsers that do not provide JSON.parse. The recommended Content Security
  // Policy does not allow unsafe-eval in some environments like Chrome
  // extensions. Usage of eval is not recommend in Chrome in general.
  // Use native parsing instead via JSON.parse. This is provided in our list
  // of supported browsers.
  return JSON.parse(json);
};


/**
 * @param {?string=} opt_prefix An optional prefix string to prepend to ID.
 * @return {string} The generated event ID used to identify a generic event.
 */
fireauth.util.generateEventId = function(opt_prefix) {
  return opt_prefix ? opt_prefix : '' +
      Math.floor(Math.random() * 1000000000).toString();
};


/**
 * @param {?string=} opt_userAgent The optional user agent.
 * @return {boolean} Whether an embedded iframe can sync to web storage changes.
 *     Web storage sync fails in Safari desktop browsers and iOS mobile
 *     browsers.
 */
fireauth.util.iframeCanSyncWebStorage = function(opt_userAgent) {
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  if (fireauth.util.getBrowserName(ua) == fireauth.util.BrowserName.SAFARI ||
      ua.toLowerCase().match(/iphone|ipad|ipod/)) {
    return false;
  }
  return true;
};


/**
 * Reset unlaoded GApi modules. If gapi.load fails due to a network error,
 * it will stop working after a retrial. This is a hack to fix this issue.
 */
fireauth.util.resetUnloadedGapiModules = function() {
  // Clear last failed gapi.load state to force next gapi.load to first
  // load the failed gapi.iframes module.
  // Get gapix.beacon context.
  var beacon = goog.global['___jsl'];
  // Get current hint.
  if (beacon && beacon['H']) {
    // Get gapi hint.
    for (var hint in beacon['H']) {
      // Requested modules.
      beacon['H'][hint]['r'] = beacon['H'][hint]['r'] || [];
      // Loaded modules.
      beacon['H'][hint]['L'] = beacon['H'][hint]['L'] || [];
      // Set requested modules to a copy of the loaded modules.
      beacon['H'][hint]['r'] = beacon['H'][hint]['L'].concat();
      // Clear pending callbacks.
      if (beacon['CP']) {
        for (var i = 0; i < beacon['CP'].length; i++) {
          // Remove all failed pending callbacks.
          beacon['CP'][i] = null;
        }
      }
    }
  }
};


/**
 * Returns whether the current device is a mobile device. Mobile browsers and
 * React-Native environments are considered mobile devices.
 * @param {?string=} opt_userAgent The optional navigator user agent.
 * @param {?fireauth.util.Env=} opt_env The optional environment.
 * @return {boolean} Whether the current device is a mobile device or not.
 */
fireauth.util.isMobileDevice = function(opt_userAgent, opt_env) {
  // Get user agent.
  var ua = opt_userAgent || fireauth.util.getUserAgentString();
  // Get environment.
  var environment = opt_env || fireauth.util.getEnvironment();
  return fireauth.util.isMobileBrowser(ua) ||
      environment === fireauth.util.Env.REACT_NATIVE;
};


/**
 * @param {?Object=} opt_navigator The optional navigator object typically used
 *     for testing.
 * @return {boolean} Whether the app is currently online. If offline, false is
 *     returned. If this cannot be determined, true is returned.
 */
fireauth.util.isOnline = function(opt_navigator) {
  var navigator = opt_navigator || goog.global['navigator'];
  if (navigator &&
      typeof navigator['onLine'] === 'boolean' &&
      // Apply only for traditional web apps and Chrome extensions.
      // This is especially true for Cordova apps which have unreliable
      // navigator.onLine behavior unless cordova-plugin-network-information is
      // installed which overwrites the native navigator.onLine value and
      // defines navigator.connection.
      (fireauth.util.isHttpOrHttps() ||
       fireauth.util.isChromeExtension() ||
       typeof navigator['connection'] !== 'undefined')) {
    return navigator['onLine'];
  }
  // If we can't determine the state, assume it is online.
  return true;
};


/**
 * @param {?Object=} opt_navigator The object with navigator data, defaulting
 *     to window.navigator if unspecified.
 * @return {?string} The user's preferred language. Returns null if
 */
fireauth.util.getUserLanguage = function(opt_navigator) {
  var navigator = opt_navigator || goog.global['navigator'];
  if (!navigator) {
    return null;
  }
  return (
      // Most reliable, but only supported in Chrome/Firefox.
      navigator['languages'] && navigator['languages'][0] ||
      // Supported in most browsers, but returns the language of the browser
      // UI, not the language set in browser settings.
      navigator['language'] ||
      // IE <= 10.
      navigator['userLanguage'] ||
      // Couldn't determine language.
      null
  );
};


/**
 * A structure to help pick between a range of long and short delay durations
 * depending on the current environment. In general, the long delay is used for
 * mobile environments whereas short delays are used for desktop environments.
 * @param {number} shortDelay The short delay duration.
 * @param {number} longDelay The long delay duration.
 * @param {?string=} opt_userAgent The optional navigator user agent.
 * @param {?fireauth.util.Env=} opt_env The optional environment.
 * @constructor
 */
fireauth.util.Delay = function(shortDelay, longDelay, opt_userAgent, opt_env) {
  // Internal error when improperly initialized.
  if (shortDelay > longDelay) {
    throw new Error('Short delay should be less than long delay!');
  }
  /**
   * @private @const {number} The short duration delay used for desktop
   *     environments.
   */
  this.shortDelay_ = shortDelay;
  /**
   * @private @const {number} The long duration delay used for mobile
   *     environments.
   */
  this.longDelay_ = longDelay;
  /** @private @const {boolean} Whether the environment is a mobile one. */
  this.isMobile_ = fireauth.util.isMobileDevice(opt_userAgent, opt_env);
};


/**
 * The default value for the offline delay timeout in ms.
 * @const {number}
 * @private
 */
fireauth.util.Delay.OFFLINE_DELAY_MS_ = 5000;


/**
 * @return {number} The delay that matches with the current environment.
 */
fireauth.util.Delay.prototype.get = function() {
  // navigator.onLine is unreliable in some cases.
  // Failing hard in those cases may make it impossible to recover for end user.
  // Waiting for the regular full duration when there is no network can result
  // in a bad experience.
  // Instead return a short timeout duration. If there is no network connection,
  // the user would wait 5 seconds to detect that. If there is a connection
  // (false alert case), the user still has the ability to try to send the
  // request. If it fails (timeout too short), they can still retry.
  if (!fireauth.util.isOnline()) {
    // Pick the shorter timeout.
    return Math.min(fireauth.util.Delay.OFFLINE_DELAY_MS_, this.shortDelay_);
  }
  // If running in a mobile environment, return the long delay, otherwise
  // return the short delay.
  // This could be improved in the future to dynamically change based on other
  // variables instead of just reading the current environment.
  return this.isMobile_ ? this.longDelay_ : this.shortDelay_;
};


/**
 * @return {boolean} Whether the app is visible in the foreground. This uses
 *     document.visibilityState. For browsers that do not support it, this is
 *     always true.
 */
fireauth.util.isAppVisible = function() {
  // https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState
  var doc = goog.global.document;
  // Check if supported.
  if (doc && typeof doc['visibilityState'] !== 'undefined') {
    // Check if visible.
    return doc['visibilityState'] == 'visible';
  }
  // API not supported in current browser, default to true.
  return true;
};


/**
 * @return {!goog.Promise} A promise that resolves when the app is visible in
 *     the foreground.
 */
fireauth.util.onAppVisible = function() {
  var doc = goog.global.document;
  // Visibility change listener reference.
  var onVisibilityChange = null;
  if (fireauth.util.isAppVisible() || !doc) {
    // Visible or non browser environment.
    return goog.Promise.resolve();
  } else {
    // Invisible and in browser environment.
    return new goog.Promise(function(resolve, reject) {
      // On visibility change listener.
      onVisibilityChange = function(event) {
        // App is visible.
        if (fireauth.util.isAppVisible()) {
          // Unregister event listener.
          doc.removeEventListener(
              'visibilitychange', onVisibilityChange, false);
          // Resolve promise.
          resolve();
        }
      };
      // Listen to visibility change.
      doc.addEventListener('visibilitychange', onVisibilityChange, false);
    }).thenCatch(function(error) {
      // In case this promise was cancelled, make sure it unlistens to
      // visibilitychange event.
      doc.removeEventListener('visibilitychange', onVisibilityChange, false);
      // Rethrow the same error.
      throw error;
    });
  }
};


/**
 * Logs a warning message to the console, if the console is available.
 * @param {string} message
 */
fireauth.util.consoleWarn = function(message) {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(message);
  }
};


/**
 * Parses a UTC time stamp string or number and returns the corresponding UTC
 * date string if valid. Otherwise, returns null.
 * @param {?string|number} utcTimestamp The UTC timestamp number or string.
 * @return {?string} The corresponding UTC date string. Null if invalid.
 */
fireauth.util.utcTimestampToDateString = function(utcTimestamp) {
  try {
    // Convert to date object.
    var date = new Date(parseInt(utcTimestamp, 10));
    // Test date is valid.
    if (!isNaN(date.getTime()) &&
        // Confirm that utcTimestamp is numeric.
        goog.string.isNumeric(utcTimestamp)) {
      // Convert to UTC date string.
      return date.toUTCString();
    }
  } catch (e) {
    // Do nothing. null will be returned.
  }
  return null;
};


/** @return {boolean} Whether indexedDB is available. */
fireauth.util.isIndexedDBAvailable = function() {
  return !!goog.global['indexedDB'];
};


/** @return {boolean} Whether current mode is Auth handler or iframe. */
fireauth.util.isAuthHandlerOrIframe = function() {
  return !!(fireauth.util.getObjectRef('fireauth.oauthhelper', goog.global) ||
            fireauth.util.getObjectRef('fireauth.iframe', goog.global));
};


/** @return {boolean} Whether indexedDB is used to persist storage. */
fireauth.util.persistsStorageWithIndexedDB = function() {
  // This will cover:
  // IE11, Edge when indexedDB is available (this is unavailable in InPrivate
  // mode). (SDK, OAuth handler and iframe)
  // Any environment where indexedDB is available (SDK only).
  
  // In a browser environment, when an iframe and a popup web storage are not
  // synchronized, use the indexedDB fireauth.storage.Storage implementation.
  return (fireauth.util.isLocalStorageNotSynchronized() ||
          !fireauth.util.isAuthHandlerOrIframe()) &&
         fireauth.util.isIndexedDBAvailable();
};


/** Sets the no-referrer meta tag in the document head if applicable. */
fireauth.util.setNoReferrer = function() {
  var doc = goog.global.document;
  if (doc) {
    try {
      var meta = goog.dom.createDom(goog.dom.TagName.META, {
        'name': 'referrer',
        'content': 'no-referrer'
      });
      var headCollection = goog.dom.getElementsByTagName(goog.dom.TagName.HEAD);
      // Append meta tag to head.
      if (headCollection.length) {
        headCollection[0].appendChild(meta);
      }
    } catch (e) {
      // Best effort approach.
    }
  }
};
