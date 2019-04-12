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
 * @fileoverview Tests for actioncodesettings.js.
 */

goog.provide('fireauth.ActionCodeSettingsTest');

goog.require('fireauth.ActionCodeSettings');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.ActionCodeSettingsTest');


/**
 * Asserts that the provided settings will throw an error in action code
 * settings initialization.
 * @param {!Object} settings The settings object to test for expected errors.
 * @param {string} expectedCode The expected error code thrown.
 */
function assertActionCodeSettingsErrorThrown(settings, expectedCode) {
  var error = assertThrows(function() {
    new fireauth.ActionCodeSettings(settings);
  });
  assertEquals(expectedCode, error.code);
}


function testActionCodeSettings_success_allParameters() {
  var settings = {
    'url': 'https://www.example.com/?state=abc',
    'iOS': {
      'bundleId': 'com.example.ios'
    },
    'android': {
      'packageName': 'com.example.android',
      'installApp': true,
      'minimumVersion': '12'
    },
    'handleCodeInApp': true,
    'dynamicLinkDomain': 'example.page.link'
  };
  var expectedRequest = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'iOSBundleId': 'com.example.ios',
    'androidPackageName': 'com.example.android',
    'androidInstallApp': true,
    'androidMinimumVersion': '12',
    'canHandleCodeInApp': true,
    'dynamicLinkDomain': 'example.page.link'
  };
  var actionCodeSettings = new fireauth.ActionCodeSettings(settings);
  assertObjectEquals(expectedRequest, actionCodeSettings.buildRequest());
}


function testActionCodeSettings_success_partialParameters() {
  var settings = {
    'url': 'https://www.example.com/?state=abc',
    // Will be ignored.
    'iOS': {},
    'android': {}
  };
  var expectedRequest = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'canHandleCodeInApp': false
  };
  var actionCodeSettings = new fireauth.ActionCodeSettings(settings);
  assertObjectEquals(expectedRequest, actionCodeSettings.buildRequest());
}


function testActionCodeSettings_success_partialParameters_fdlDomain() {
  var settings = {
    'url': 'https://www.example.com/?state=abc',
    // Will be ignored.
    'iOS': {},
    'android': {},
    'dynamicLinkDomain': 'example.page.link'
  };
  var expectedRequest = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'canHandleCodeInApp': false,
    'dynamicLinkDomain': 'example.page.link'
  };
  var actionCodeSettings = new fireauth.ActionCodeSettings(settings);
  assertObjectEquals(expectedRequest, actionCodeSettings.buildRequest());
}


function testActionCodeSettings_success_partialParameters_android() {
  var settings = {
    'url': 'https://www.example.com/?state=abc',
    'android': {
      'packageName': 'com.example.android'
    }
  };
  var expectedRequest = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'androidPackageName': 'com.example.android',
    'androidInstallApp': false,
    'canHandleCodeInApp': false
  };
  var actionCodeSettings = new fireauth.ActionCodeSettings(settings);
  assertObjectEquals(expectedRequest, actionCodeSettings.buildRequest());
}


function testActionCodeSettings_success_partialParameters_android_fdlDomain() {
  var settings = {
    'url': 'https://www.example.com/?state=abc',
    'android': {
      'packageName': 'com.example.android'
    },
    'dynamicLinkDomain': 'example.page.link'
  };
  var expectedRequest = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'androidPackageName': 'com.example.android',
    'androidInstallApp': false,
    'canHandleCodeInApp': false,
    'dynamicLinkDomain': 'example.page.link'
  };
  var actionCodeSettings = new fireauth.ActionCodeSettings(settings);
  assertObjectEquals(expectedRequest, actionCodeSettings.buildRequest());
}


function testActionCodeSettings_success_partialParameters_ios() {
  var settings = {
    'url': 'https://www.example.com/?state=abc',
    'iOS': {
      'bundleId': 'com.example.ios'
    }
  };
  var expectedRequest = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'iOSBundleId': 'com.example.ios',
    'canHandleCodeInApp': false
  };
  var actionCodeSettings = new fireauth.ActionCodeSettings(settings);
  assertObjectEquals(expectedRequest, actionCodeSettings.buildRequest());
}


function testActionCodeSettings_success_partialParameters_ios_fdlDomain() {
  var settings = {
    'url': 'https://www.example.com/?state=abc',
    'iOS': {
      'bundleId': 'com.example.ios'
    },
    'dynamicLinkDomain': 'example.page.link'
  };
  var expectedRequest = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'iOSBundleId': 'com.example.ios',
    'canHandleCodeInApp': false,
    'dynamicLinkDomain': 'example.page.link'
  };
  var actionCodeSettings = new fireauth.ActionCodeSettings(settings);
  assertObjectEquals(expectedRequest, actionCodeSettings.buildRequest());
}


function testActionCodeSettings_error_continueUrl() {
  // Missing continue URL.
  assertActionCodeSettingsErrorThrown(
      {
        'android': {
          'packageName': 'com.example.android'
        }
      },
      'auth/missing-continue-uri');
  // Invalid continue URL.
  assertActionCodeSettingsErrorThrown(
      {
        'url': '',
        'android': {
          'packageName': 'com.example.android'
        }
      },
      'auth/invalid-continue-uri');
  // Invalid continue URL.
  assertActionCodeSettingsErrorThrown(
      {
        'url': ['https://www.example.com/?state=abc'],
        'android': {
          'packageName': 'com.example.android'
        }
      },
      'auth/invalid-continue-uri');
}


function testActionCodeSettings_success_urlOnly_canHandleCodeInApp() {
  var settings = {
    'url': 'https://www.example.com/?state=abc',
    'handleCodeInApp': true
  };
  var expectedRequest = {
    'continueUrl': 'https://www.example.com/?state=abc',
    'canHandleCodeInApp': true
  };
  var actionCodeSettings = new fireauth.ActionCodeSettings(settings);
  assertObjectEquals(expectedRequest, actionCodeSettings.buildRequest());
}


function testActionCodeSettings_error_canHandleCodeInApp() {
  // Non-boolean can handle code in app.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'handleCodeInApp': 'false'
      },
      'auth/argument-error');
}


function testActionCodeSettings_error_android() {
  // Invalid Android field.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'android': 'bla'
      },
      'auth/argument-error');
  // Android package name set to empty string.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'android': {
          'packageName': ''
        }
      },
      'auth/argument-error');
  // Android package missing when other Android parameters specified.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'android': {
          'installApp': true,
          'minimumVersion': '12'
        }
      },
      'auth/missing-android-pkg-name');
  // Invalid Android package name.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'android': {
          'packageName': {}
        }
      },
      'auth/argument-error');
  // Invalid installApp field.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'android': {
          'packageName': 'com.example.android',
          'installApp': 'bla'
        }
      },
      'auth/argument-error');
  // Invalid minimumVersion field.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'android': {
          'packageName': 'com.example.android',
          'minimumVersion': false
        }
      },
      'auth/argument-error');
}


function testActionCodeSettings_error_ios() {
  // Invalid iOS field.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'iOS': 'bla'
      },
      'auth/argument-error');
  // iOS bundle ID set to empty string.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'iOS': {
          'bundleId': ''
        }
      },
      'auth/argument-error');
  // Invalid iOS bundle ID.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'iOS': {
          'bundleId': {}
        }
      },
      'auth/argument-error');
}


function testActionCodeSettings_error_dynamicLinkDomain() {
  // Invalid dynamic link domain.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'dynamicLinkDomain': ['example.page.link']

      },
      'auth/argument-error');
  // Dynamic link domain set to empty string.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'dynamicLinkDomain': ''
      },
      'auth/argument-error');
  // Dynamic link domain set to null.
  assertActionCodeSettingsErrorThrown(
      {
        'url': 'https://www.example.com/?state=abc',
        'dynamicLinkDomain': null
      },
      'auth/argument-error');
}
