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

goog.provide('fireauth.argsTest');

goog.require('fireauth.Auth');
goog.require('fireauth.AuthUser');
goog.require('fireauth.EmailAuthProvider');
goog.require('fireauth.GoogleAuthProvider');
goog.require('fireauth.MultiFactorInfo');
goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.PhoneMultiFactorGenerator');
goog.require('fireauth.args');
goog.require('goog.Promise');
goog.require('goog.dom');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.argsTest');


var app = firebase.initializeApp({
  apiKey: 'myApiKey'
});
var auth = new fireauth.Auth(app);
var tokenResponse = {
  'idToken': 'accessToken',
  'refreshToken': 'refreshToken',
  'expiresIn': 3600
};
var user = new fireauth.AuthUser(
    {
      apiKey: 'myApiKey',
      appName: 'appId'
    },
    tokenResponse);


function testValidate_valid_noArgs() {
  fireauth.args.validate('myFunc', [], []);
}


function testValidate_valid_oneArg() {
  fireauth.args.validate('myFunc', [fireauth.args.string('foo')], ['bar']);
}


function testValidate_valid_multipleArgs() {
  var expectedArgs = [
    fireauth.args.string('email'),
    fireauth.args.bool('emailVerified')
  ];
  var args = ['foo@bar.com', false];
  fireauth.args.validate('myFunc', expectedArgs, args);
}


function testValidate_valid_optionalArgs_absent() {
  var expectedArgs = [
    fireauth.args.string('email'),
    fireauth.args.bool('emailVerified', true)
  ];
  var args = ['foo@bar.com'];
  fireauth.args.validate('myFunc', expectedArgs, args);
}


function testValidate_valid_optionalArgs_present() {
  var expectedArgs = [
    fireauth.args.string('email'),
    fireauth.args.bool('emailVerified', true)
  ];
  var args = ['foo@bar.com', true];
  fireauth.args.validate('myFunc', expectedArgs, args);
}


function testValidate_invalid_type() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [fireauth.args.string('name')], [13]);
  });
  assertEquals('auth/argument-error', error.code);
  assertEquals('myFunc failed: First argument "name" must be a valid ' +
      'string.', error.message);
}


function testValidate_invalid_isSetter() {
  var error = assertThrows(function() {
    fireauth.args.validate(
        'name', [fireauth.args.string('name')], [13], true);
  });
  assertEquals('auth/argument-error', error.code);
  assertEquals('name failed: "name" must be a valid string.', error.message);
}


function testValidate_invalid_onlyOneValid() {
  var error = assertThrows(function() {
    var expectedArgs = [
      fireauth.args.string('email'),
      fireauth.args.string('password')
    ];
    var args = ['foo@bar.com', 13];
    fireauth.args.validate('yourFunc', expectedArgs, args);
  });
  assertEquals('yourFunc failed: Second argument "password" must be a valid ' +
      'string.', error.message);
}


function testValidate_invalid_noname() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [fireauth.args.string()], [13]);
  });
  assertEquals('auth/argument-error', error.code);
  assertEquals('myFunc failed: First argument must be a valid ' +
      'string.', error.message);
}


function testValidate_argNumber_tooFew() {
  var error = assertThrows(function() {
    var expectedArgs = [
      fireauth.args.string('email'),
      fireauth.args.string('password')
    ];
    var args = ['foo@bar.com'];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: Expected 2 arguments but got 1.',
      error.message);
}


function testValidate_argNumber_tooMany() {
  var error = assertThrows(function() {
    var expectedArgs = [
      fireauth.args.string('email'),
      fireauth.args.string('password')
    ];
    var args = ['foo@bar.com', 'hunter2', 'whatamidoinghere'];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: Expected 2 arguments but got 3.',
      error.message);
}


function testValidate_argNumber_oneValid() {
  var error = assertThrows(function() {
    var expectedArgs = [
      fireauth.args.string('email')
    ];
    var args = ['foo@bar.com', 'whatamidoinghere'];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: Expected 1 argument but got 2.',
      error.message);
}


function testValidate_argNumber_validRange() {
  var error = assertThrows(function() {
    var expectedArgs = [
      fireauth.args.string('email'),
      fireauth.args.string('password', true)
    ];
    var args = ['foo@bar.com', 'hunter2', 'whatamidoinghere'];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: Expected 1-2 arguments but got 3.',
      error.message);
}


function testValidate_authCredential_valid() {
  var expectedArgs = [fireauth.args.authCredential()];
  var args = [fireauth.GoogleAuthProvider.credential('foo')];
  fireauth.args.validate('myFunc', expectedArgs, args);
}


function testValidate_authCredential_invalid() {
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.authCredential()];
    var args = ['foo'];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: First argument "credential" must be a valid ' +
      'credential.', error.message);
}


function testValidate_authCredential_null() {
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.authCredential()];
    var args = [null];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: First argument "credential" must be a valid ' +
      'credential.', error.message);
}


function testValidate_authCredential_withType_valid() {
  var expectedArgs = [fireauth.args.authCredential('phone')];
  var args = [fireauth.PhoneAuthProvider.credential('id', 'code')];
  fireauth.args.validate('myFunc', expectedArgs, args);
}


function testValidate_authCredential_withType_invalid() {
  var expectedMessage = 'myFunc failed: First argument "phoneCredential" ' +
      'must be a valid phone credential.';
  var expectedArgs = [fireauth.args.authCredential('phone')];
  var error = assertThrows(function() {
    var args = [fireauth.GoogleAuthProvider.credential('foo')];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals(expectedMessage, error.message);

  error = assertThrows(function() {
    var args = [
      fireauth.EmailAuthProvider.credential('me@example.com', '123123')
    ];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals(expectedMessage, error.message);

  error = assertThrows(function() {
    var args = ['I am the wrong type'];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals(expectedMessage, error.message);
}


function testValidate_authCredential_withTypeAndName_invalid() {
  var expectedMessage = 'myFunc failed: First argument "myArgName" ' +
      'must be a valid google credential.';
  var expectedArgs = [fireauth.args.authCredential('google', 'myArgName')];
  var error = assertThrows(function() {
    var args = [fireauth.GoogleAuthProvider.credential('foo')];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals(expectedMessage, error.message);
}


function testValidate_authProvider_valid() {
  var expectedArgs = [fireauth.args.authProvider()];
  var args = [new fireauth.GoogleAuthProvider()];
  fireauth.args.validate('myFunc', expectedArgs, args);
  // Test with email and password Auth provider.
  args = [new fireauth.EmailAuthProvider()];
  fireauth.args.validate('myFunc', expectedArgs, args);
}


function testValidate_authProvider_invalid() {
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.authProvider()];
    var args = [fireauth.GoogleAuthProvider.credential('thisisntaprovider')];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: First argument "authProvider" must be a valid ' +
      'Auth provider.', error.message);
}


function testValidate_multiFactorInfo_valid() {
  var expectedArgs = [fireauth.args.multiFactorInfo()];
  // Test with a valid MulfiFactorInfo object.
  var args = [fireauth.MultiFactorInfo.fromPlainObject({
    'uid': 'ENROLLMENT_ID',
    'displayName': 'My Phone',
    'enrollmentTime': 'Thu, 18 Apr 2019 18:38:12 GMT',
    'phoneNumber': '+16505551234'
  })];
  assertNotThrows(function() {
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
}


function testValidate_multiFactorInfo_invalid() {
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.multiFactorInfo()];
    var args = [fireauth.MultiFactorInfo.fromPlainObject({
      'uid': null,
      'displayName': 'My Phone',
      'enrollmentTime': 'Thu, 18 Apr 2019 18:38:12 GMT',
      'phoneNumber': '+16505551234'
    })];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: First argument "multiFactorInfo" must be a ' +
      'valid multiFactorInfo.', error.message);
}


function testValidate_phoneInfoOptions_valid() {
  // Test phoneInfoOptions for single-factor sign-in.
  var expectedArgs = [fireauth.args.phoneInfoOptions()];
  var args = [{'phoneNumber': '+16505551234'}];
  assertNotThrows(function() {
    fireauth.args.validate('myFunc', expectedArgs, args);
  });

  // Test phoneInfoOptions for multi-factor enrollment.
  args = [{
    'phoneNumber': '+16505551234',
    'session': {
      'type': 'enroll',
      'getRawSession': function() {
        return goog.Promise.resolve('SESSION');
      }
    }
  }];
  assertNotThrows(function() {
    fireauth.args.validate('myFunc', expectedArgs, args);
  });

  // Test phoneInfoOptions for multi-factor sign-in with multi-factor hint.
  args = [{
    'multiFactorHint': {
      'uid': 'ENROLLMENT_ID'
    },
    'session': {
      'type': 'signin',
      'getRawSession': function() {
        return goog.Promise.resolve('SESSION');
      }
    }
  }];
  assertNotThrows(function() {
    fireauth.args.validate('myFunc', expectedArgs, args);
  });

  // Test phoneInfoOptions for multi-factor sign-in with multi-factor UID.
  args = [{
    'multiFactorUid': 'ENROLLMENT_ID',
    'session': {
      'type': 'signin',
      'getRawSession': function() {
        return goog.Promise.resolve('SESSION');
      }
    }
  }];
  assertNotThrows(function() {
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
}


function testValidate_phoneInfoOptions_enrollWithPhoneHint() {
  // Test that session is for enrollment but multi-factor hint is provided.
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.phoneInfoOptions()];
    var args = [{
      'multiFactorHint': {'uid': 'ENROLLMENT_ID'},
      'session': {
        'type': 'enroll',
        'getRawSession': function() {
          return goog.Promise.resolve('SESSION');
        }
      }
    }];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: First argument "phoneInfoOptions" must be ' +
               'valid phone info options.', error.message);
}


function testValidate_phoneInfoOptions_signInWithPhoneNumber() {
  // Test that session is for sign-in but phone number is provided.
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.phoneInfoOptions()];
    var args = [{
      'phoneNumber': '+16505551234',
      'session': {
        'type': 'signin',
        'getRawSession': function() {
          return goog.Promise.resolve('SESSION');
        }
      }
    }];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: First argument "phoneInfoOptions" must be ' +
               'valid phone info options.', error.message);
}


function testValidate_phoneInfoOptions_missingSession() {
  // Test that session is missing for multi-factor sign-in.
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.phoneInfoOptions()];
    var args = [{
      'multiFactorHint': {'uid': 'ENROLLMENT_ID'}
    }];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: First argument "phoneInfoOptions" must be ' +
               'valid phone info options.', error.message);
}


function testValidate_phoneInfoOptions_invalidSession() {
  // Test with invalid multi-factor session.
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.phoneInfoOptions()];
    var args = [{
      'phoneNumber': '+16505551234',
      // Missing getRawSession.
      'session': {
        'type': 'enroll'
      }
    }];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: First argument "phoneInfoOptions" must be ' +
               'valid phone info options.', error.message);
}


function testValidate_phoneInfoOptions_invalidHint() {
  // Test with invalid multi-factor hint.
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.phoneInfoOptions()];
    var args = [{
      // Missing uid.
      'multiFactorHint': {
      },
      'session': {
        'type': 'signin',
        'getRawSession': function() {
          return goog.Promise.resolve('SESSION');
        }
      }
    }];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: First argument "phoneInfoOptions" must be ' +
               'valid phone info options.', error.message);
}


function testValidate_phoneInfoOptions_invalidUid() {
  // Test with invalid multi-factor UID.
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.phoneInfoOptions()];
    var args = [{
      // Invalid UID.
      'multiFactorUid': 1234567890,
      'session': {
        'type': 'signin',
        'getRawSession': function() {
          return goog.Promise.resolve('SESSION');
        }
      }
    }];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('myFunc failed: First argument "phoneInfoOptions" must be ' +
               'valid phone info options.', error.message);
}


function testValidate_or_valid_first() {
  fireauth.args.validate('myFunc', [
    fireauth.args.or(fireauth.args.string(), fireauth.args.bool())
  ], ['foo']);
}


function testValidate_or_valid_second() {
  fireauth.args.validate('myFunc', [
    fireauth.args.or(fireauth.args.string(), fireauth.args.bool())
  ], [true]);
}


function testValidate_or_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.or(fireauth.args.string(), fireauth.args.bool(),
          'strOrBool')
    ], [13]);
  });
  assertEquals('auth/argument-error', error.code);
  assertEquals('myFunc failed: First argument "strOrBool" must be a valid ' +
      'string or a boolean.', error.message);
}


function testValidate_or_nested_valid() {
  fireauth.args.validate('myFunc', [
    fireauth.args.or(
      fireauth.args.or(fireauth.args.string(), fireauth.args.null()),
      fireauth.args.bool(),
      'strOrBoolOrNull')
  ], [true]);
}


function testValidate_or_nested_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.or(
        fireauth.args.or(fireauth.args.string(), fireauth.args.bool()),
        fireauth.args.null(),
        'strOrBoolOrNull')
    ], [5]);
  });
  assertEquals('myFunc failed: First argument "strOrBoolOrNull" must be a ' +
      'valid string or a boolean or null.', error.message);
}


function testValidate_or_nested_invalid_secondArgNested() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.or(
        fireauth.args.string(),
        fireauth.args.or(fireauth.args.bool(), fireauth.args.null()),
        'strOrBoolOrNull')
    ], [5]);
  });
  assertEquals('myFunc failed: First argument "strOrBoolOrNull" must be a ' +
      'valid string or a boolean or null.', error.message);
}


function testValidate_number_valid() {
  fireauth.args.validate('myFunc', [
    fireauth.args.number('myNumber')
  ], [-12.4]);
}


function testValidate_number_valid_optional() {
  fireauth.args.validate('myFunc', [
    fireauth.args.number('myNumber', true)
  ], []);
}


function testValidate_number_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.number('myNumber')
    ], ['13']);
  });
  assertEquals('myFunc failed: First argument "myNumber" must be a valid ' +
      'number.', error.message);
}


function testValidate_object_valid() {
  fireauth.args.validate('myFunc', [
    fireauth.args.object('myObject')
  ], [{'foo': 1}]);
}


function testValidate_object_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.object('myObject')
    ], [13]);
  });
  assertEquals('myFunc failed: First argument "myObject" must be a valid ' +
      'object.', error.message);
}


function testValidate_function_valid() {
  fireauth.args.validate('myFunc', [
    fireauth.args.func('myCallback')
  ], [function() {}]);
}


function testValidate_function_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.func('myCallback')
    ], [{}]);
  });
  assertEquals('myFunc failed: First argument "myCallback" must be a ' +
      'function.', error.message);
}


function testValidate_null_valid() {
  fireauth.args.validate('myFunc', [
    fireauth.args.null()
  ], [null]);
}


function testValidate_null_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.null('noArg')
    ], ['something']);
  });
  assertEquals('myFunc failed: First argument "noArg" must be null.',
      error.message);
}


function testValidate_firebaseAuth_valid() {
  fireauth.args.validate('myFunc', [
    fireauth.args.firebaseAuth()
  ], [auth]);
}


function testValidate_firebaseAuth_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.firebaseAuth()
    ], [{'some': 'thing'}]);
  });
  assertEquals('myFunc failed: First argument "auth" must be an instance of ' +
      'Firebase Auth.', error.message);
}


function testValidate_firebaseUser_valid() {
  fireauth.args.validate('myFunc', [
    fireauth.args.firebaseUser()
  ], [user]);
}


function testValidate_firebaseUser_valid_optional() {
  fireauth.args.validate('myFunc', [
    fireauth.args.firebaseUser(true)
  ], []);
}


function testValidate_firebaseUser_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.firebaseUser()
    ], [{'some': 'thing'}]);
  });
  assertEquals('myFunc failed: First argument "user" must be an instance of ' +
      'Firebase User.', error.message);
}


function testValidate_element_valid() {
  fireauth.args.validate('myFunc', [
    fireauth.args.element('myElement')
  ], [goog.dom.createDom(goog.dom.TagName.DIV)]);
}


function testValidate_element_valid_optional() {
  fireauth.args.validate('myFunc', [
    fireauth.args.element('myElement', true)
  ], []);
}


function testValidate_element_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.element('myElement')
    ], [13]);
  });
  assertEquals('myFunc failed: First argument "myElement" must be an HTML ' +
      'element.', error.message);
}


function testValidate_firebaseApp_valid() {
  fireauth.args.validate('myFunc', [
    fireauth.args.firebaseApp()
  ], [app]);
}


function testValidate_firebaseApp_valid_optional() {
  fireauth.args.validate('myFunc', [
    fireauth.args.firebaseApp(true)
  ], []);
}


function testValidate_firebaseApp_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.firebaseApp()
    ], [{'some': 'thing'}]);
  });
  assertEquals('myFunc failed: First argument "app" must be an instance of ' +
      'Firebase App.', error.message);
}


function testValidate_appVerifier_valid() {
  var appVerifier = {
    'type': 'recaptcha',
    'verify': function() {
      return goog.Promise.resolve('assertion');
    }
  };
  fireauth.args.validate('myFunc', [
    fireauth.args.applicationVerifier()
  ], [appVerifier]);
}


function testValidate_appVerifier_invalid() {
  var error = assertThrows(function() {
    fireauth.args.validate('myFunc', [
      fireauth.args.applicationVerifier()
    ], [{'some': 'thing'}]);
  });
  assertEquals('myFunc failed: First argument "applicationVerifier" must be ' +
      'an implementation of firebase.auth.ApplicationVerifier.', error.message);
}


function testValidate_requiredArgAfterOptional() {
  var error = assertThrows(function() {
    var expectedArgs = [
      fireauth.args.string('email', true),
      fireauth.args.string('password'),
      fireauth.args.string('emailVerified', true)
    ];
    var args = ['foo@bar.com', 'hunter2', false];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('auth/internal-error', error.code);
}


function testValidate_optionalUndefined_single() {
  var expectedArgs = [
    fireauth.args.string('email'),
    fireauth.args.string('password'),
    fireauth.args.bool('emailVerified', true)
  ];
  // Optional valid parameter explicitly passed.
  var args = ['foo@bar.com', 'hunter2', false];
  fireauth.args.validate('myFunc', expectedArgs, args);
  // Optional valid parameter not passed.
  args = ['foo@bar.com', 'hunter2'];
  fireauth.args.validate('myFunc', expectedArgs, args);
  // Optional valid parameter passed as undefined.
  args = ['foo@bar.com', 'hunter2', undefined];
  fireauth.args.validate('myFunc', expectedArgs, args);
  // Optional parameter passed as invalid.
  var error = assertThrows(function() {
    args = ['foo@bar.com', 'hunter2', 'invalid'];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('auth/argument-error', error.code);
}


function testValidate_optionalUndefined_multiple() {
  var expectedArgs = [
    fireauth.args.string('email'),
    fireauth.args.string('password'),
    fireauth.args.bool('emailVerified', true),
    fireauth.args.bool('anonymous', true)
  ];
  // Optional valid parameters explicitly passed.
  var args = ['foo@bar.com', 'hunter2', false, true];
  fireauth.args.validate('myFunc', expectedArgs, args);
  // Optional valid parameter not passed.
  args = ['foo@bar.com', 'hunter2'];
  fireauth.args.validate('myFunc', expectedArgs, args);
  // Optional valid parameters passed as undefined.
  args = ['foo@bar.com', 'hunter2', undefined, undefined];
  fireauth.args.validate('myFunc', expectedArgs, args);
  // Optional valid parameter passed as undefined and then a valid parameter
  // passed.
  args = ['foo@bar.com', 'hunter2', undefined, false];
  fireauth.args.validate('myFunc', expectedArgs, args);
  // Optional parameter passed as invalid. In this case null is invalid.
  var error = assertThrows(function() {
    args = ['foo@bar.com', 'hunter2', undefined, null];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals('auth/argument-error', error.code);
}


function testValidate_argumentsObj() {
  function fooFunc() {
    var expectedArgs = [
      fireauth.args.string('email'),
      fireauth.args.string('password')
    ];
    fireauth.args.validate('myFunc', expectedArgs, arguments);
  }
  fooFunc('me@site.com', 'myPassword');
}


function testValidate_argumentsObj_invalid() {
  var error = assertThrows(function() {
    function fooFunc() {
      fireauth.args.validate('fooFunc', [fireauth.args.string('name')],
          arguments);
    }
    fooFunc(13);
  });
  assertEquals('fooFunc failed: First argument "name" must be a valid ' +
      'string.', error.message);
}


function testValidate_multiFactorAssertion_valid() {
  var expectedArgs = [fireauth.args.multiFactorAssertion()];
  var cred = fireauth.PhoneAuthProvider.credential('verificationId', 'code');
  var args = [fireauth.PhoneMultiFactorGenerator.assertion(cred)];
  assertNotThrows(function() {
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
}


function testValidate_multiFactorAssertion_invalid() {
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.multiFactorAssertion()];
    var args = ['foo'];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals(
      'myFunc failed: First argument "multiFactorAssertion" must be a valid ' +
      'multiFactorAssertion.',
      error.message);
}


function testValidate_multiFactorAssertion_null() {
  var error = assertThrows(function() {
    var expectedArgs = [fireauth.args.multiFactorAssertion()];
    var args = [null];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals(
      'myFunc failed: First argument "multiFactorAssertion" must be a valid ' +
      'multiFactorAssertion.',
      error.message);
}


function testValidate_multiFactorAssertion_withType_valid() {
  var expectedArgs = [fireauth.args.multiFactorAssertion('phone')];
  var cred = fireauth.PhoneAuthProvider.credential('verificationId', 'code');
  var args = [fireauth.PhoneMultiFactorGenerator.assertion(cred)];
  fireauth.args.validate('myFunc', expectedArgs, args);
}


function testValidate_multiFactorAssertion_withType_invalid() {
  var expectedMessage =
      'myFunc failed: First argument "otherMultiFactorAssertion" ' +
      'must be a valid other multiFactorAssertion.';
  var expectedArgs = [fireauth.args.multiFactorAssertion('other')];
  var error = assertThrows(function() {
    var cred = fireauth.PhoneAuthProvider.credential('verificationId', 'code');
    var args = [fireauth.PhoneMultiFactorGenerator.assertion(cred)];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals(expectedMessage, error.message);

  error = assertThrows(function() {
    var args = ['I am the wrong type'];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals(expectedMessage, error.message);
}


function testValidate_multiFactorAssertion_withTypeAndName_invalid() {
  var expectedMessage = 'myFunc failed: First argument "myArgName" ' +
      'must be a valid other multiFactorAssertion.';
  var expectedArgs =
      [fireauth.args.multiFactorAssertion('other', 'myArgName')];
  var error = assertThrows(function() {
    var cred = fireauth.PhoneAuthProvider.credential('verificationId', 'code');
    var args = [fireauth.PhoneMultiFactorGenerator.assertion(cred)];
    fireauth.args.validate('myFunc', expectedArgs, args);
  });
  assertEquals(expectedMessage, error.message);
}
