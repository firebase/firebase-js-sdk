/**
 * @license
 * Copyright 2017 Google LLC
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
 * @fileoverview Provides function argument validation for third-party calls
 * that cannot be validated with Closure compiler.
 */

goog.provide('fireauth.args');
goog.provide('fireauth.args.Argument');

goog.require('fireauth.Auth');
goog.require('fireauth.AuthError');
goog.require('fireauth.AuthUser');
goog.require('fireauth.MultiFactorSession');
goog.require('fireauth.authenum.Error');


/**
 * Represents an argument to a function. Fields:
 * <ul>
 * <li> name: A label for the argument. For example, the names of the arguments
 *      to a signIn() function might be "email" and "password".
 * <li> typeLabel: A label for the expected type of the argument, starting with
 *      an article, for example, "an object" or "a valid credential".
 * <li> optional: Whether or not this argument is optional. Optional arguments
 *      cannot come after non-optional arguments in the input to validate().
 * <li> validator: A function that takes the passed value of this argument
 *      and returns whether the value is valid or not.
 * </ul>
 * @typedef {{
 *   name: string,
 *   typeLabel: string,
 *   optional: boolean,
 *   validator: function (*) : boolean,
 * }}
 */
fireauth.args.Argument;


/**
 * Validates the arguments to a method call and throws an error if invalid. This
 * can be used to validate external calls where the Closure compiler cannot
 * detect errors.
 *
 * Example usage:
 * function greet(recipient, opt_useFormalLanguage) {
 *   fireauth.args.validate('greet', [
 *     fireauth.args.string('recipient'),
 *     fireauth.args.bool('opt_useFormalLanguage', true)
 *   ], arguments);
 *   if (opt_useFormalLanguage) {
 *     console.log('Good day, ' + recipient + '.');
 *   } else {
 *     console.log('Wassup, ' + recipient + '?');
 *   }
 * }
 * greet('Mr. Manager', true); // Prints 'Good day, Mr. Manager.'
 * greet('Billy Bob'); // Prints 'Wassup, Billy Bob?'
 * greet(133); // Throws 'greet failed: First argument "recipient" must be a
 *             // valid string.'
 * greet(); // Throws 'greet failed: Expected 1-2 arguments but got 0.'
 * greet('Mr. Manager', true, 'ohno'); // Throws 'greet failed: Expected 1-2
 *                                     // arguments but got 3.'
 *
 * This can also be used to validate setters by passing an additional true
 * argument to fireauth.args.validate. This modifies the error message to be
 * relevant for that setter.
 *
 * @param {string} apiName The name of the method being called, to display in
 *     the error message for debugging purposes.
 * @param {!Array<!fireauth.args.Argument>} expected The expected arguments.
 * @param {!IArrayLike} actual The arguments object of the function whose
 *     parameters we want to validate.
 * @param {boolean=} opt_isSetter Whether the function is a setter which takes
 *     a single argument.
 */
fireauth.args.validate = function(apiName, expected, actual, opt_isSetter) {
  // Convert the arguments object into a real array.
  var actualAsArray = Array.prototype.slice.call(actual);
  var errorMessage = fireauth.args.validateAndGetMessage_(
      expected, actualAsArray, opt_isSetter);
  if (errorMessage) {
    throw new fireauth.AuthError(fireauth.authenum.Error.ARGUMENT_ERROR,
        apiName + ' failed: ' + errorMessage);
  }
};


/**
 * @param {!Array<!fireauth.args.Argument>} expected
 * @param {!Array<*>} actual
 * @param {boolean=} opt_isSetter Whether the function is a setter which takes
 *     a single argument.
 * @return {?string} The error message if there is an error, or otherwise
 *     null.
 * @private
 */
fireauth.args.validateAndGetMessage_ =
    function(expected, actual, opt_isSetter) {
  var minNumArgs = fireauth.args.calcNumRequiredArgs_(expected);
  var maxNumArgs = expected.length;
  if (actual.length < minNumArgs || maxNumArgs < actual.length) {
    return fireauth.args.makeLengthError_(minNumArgs, maxNumArgs,
        actual.length);
  }

  for (var i = 0; i < actual.length; i++) {
    // Argument is optional and undefined is explicitly passed.
    var optionalUndefined = expected[i].optional && actual[i] === undefined;
    // Check if invalid argument and the argument is not optional with undefined
    // passed.
    if (!expected[i].validator(actual[i]) && !optionalUndefined) {
      return fireauth.args.makeErrorAtPosition_(i, expected[i], opt_isSetter);
    }
  }

  return null;
};


/**
 * @param {!Array<!fireauth.args.Argument>} expected
 * @return {number} The number of required arguments.
 * @private
 */
fireauth.args.calcNumRequiredArgs_ = function(expected) {
  var numRequiredArgs = 0;
  var isOptionalSection = false;
  for (var i = 0; i < expected.length; i++) {
    if (expected[i].optional) {
      isOptionalSection = true;
    } else {
      if (isOptionalSection) {
        throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR,
            'Argument validator encountered a required argument after an ' +
            'optional argument.');
      }
      numRequiredArgs++;
    }
  }
  return numRequiredArgs;
};


/**
 * @param {number} min The minimum number of arguments to the function,
 *     inclusive.
 * @param {number} max The maximum number of arguments to the function,
 *     inclusive.
 * @param {number} actual The actual number of arguments received.
 * @return {string} The error message.
 * @private
 */
fireauth.args.makeLengthError_ = function(min, max, actual) {
  var numExpectedString;
  if (min == max) {
    if (min == 1) {
      numExpectedString = '1 argument';
    } else {
      numExpectedString = min + ' arguments';
    }
  } else {
    numExpectedString = min + '-' + max + ' arguments';
  }
  return 'Expected ' + numExpectedString + ' but got ' + actual + '.';
};


/**
 * @param {number} position The position at which there was an error.
 * @param {!fireauth.args.Argument} expectedType The expected type of the
 *     argument, which was violated.
 * @param {boolean=} opt_isSetter Whether the function is a setter which takes
 *     a single argument.
 * @return {string} The error message.
 * @private
 */
fireauth.args.makeErrorAtPosition_ =
    function(position, expectedType, opt_isSetter) {
  var ordinal = fireauth.args.makeOrdinal_(position);
  var argName = expectedType.name ?
      fireauth.args.quoteString_(expectedType.name) + ' ' : '';
  // Add support to setters for readable/writable properties which take a
  // required single argument.
  var errorPrefix = !!opt_isSetter ? '' : ordinal + ' argument ';
  return errorPrefix + argName + 'must be ' +
      expectedType.typeLabel + '.';
};


/** @private {!Array<string>} The first few ordinal numbers. */
fireauth.args.ORDINAL_NUMBERS_ = ['First', 'Second', 'Third', 'Fourth',
  'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth'];


/**
 * @param {number} cardinal An integer.
 * @return {string} The integer converted to an ordinal number, starting at
 *     "First". That is, makeOrdinal_(0) returns "First" and makeOrdinal_(1)
 *     returns "Second", etc.
 * @private
 */
fireauth.args.makeOrdinal_ = function(cardinal) {
  // We only support the first few ordinal numbers. We could provide a more
  // robust solution, but it is unlikely that a function would need more than
  // nine arguments.
  if (cardinal < 0 || cardinal >= fireauth.args.ORDINAL_NUMBERS_.length) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR,
        'Argument validator received an unsupported number of arguments.');
  }
  return fireauth.args.ORDINAL_NUMBERS_[cardinal];
};


/**
 * Specifies a string argument.
 * @param {?string=} opt_name The name of the argument.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.string = function(opt_name, opt_optional) {
  return {
    name: opt_name || '',
    typeLabel: 'a valid string',
    optional: !!opt_optional,
    validator: x => typeof x === 'string'
  };
};


/**
 * Specifies a boolean argument.
 * @param {?string=} opt_name The name of the argument.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.bool = function(opt_name, opt_optional) {
  return {
    name: opt_name || '',
    typeLabel: 'a boolean',
    optional: !!opt_optional,
    validator: x => typeof x === 'boolean'
  };
};


/**
 * Specifies a number argument.
 * @param {?string=} opt_name The name of the argument.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.number = function(opt_name, opt_optional) {
  return {
    name: opt_name || '',
    typeLabel: 'a valid number',
    optional: !!opt_optional,
    validator: x => typeof x === 'number'
  };
};


/**
 * Specifies an object argument.
 * @param {?string=} opt_name The name of the argument.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.object = function(opt_name, opt_optional) {
  return {
    name: opt_name || '',
    typeLabel: 'a valid object',
    optional: !!opt_optional,
    validator: goog.isObject
  };
};


/**
 * Specifies a function argument.
 * @param {?string=} opt_name The name of the argument.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.func = function(opt_name, opt_optional) {
  return {
    name: opt_name || '',
    typeLabel: 'a function',
    optional: !!opt_optional,
    validator: x => typeof x === 'function'
  };
};


/**
 * Specifies a null argument.
 * @param {?string=} opt_name The name of the argument.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.null = function(opt_name, opt_optional) {
  return {
    name: opt_name || '',
    typeLabel: 'null',
    optional: !!opt_optional,
    validator: x => x === null
  };
};


/**
 * Specifies an HTML element argument.
 * @param {?string=} opt_name The name of the argument.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.element = function(opt_name, opt_optional) {
   return /** @type {!fireauth.args.Argument} */ ({
    name: opt_name || '',
    typeLabel: 'an HTML element',
    optional: !!opt_optional,
    validator: /** @type {function(!Element) : boolean} */ (
        function(element) {
          return !!(element && element instanceof Element);
        })
  });
};


/**
 * Specifies an instance of Firebase Auth.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.firebaseAuth = function(opt_optional) {
  return /** @type {!fireauth.args.Argument} */ ({
    name: 'auth',
    typeLabel: 'an instance of Firebase Auth',
    optional: !!opt_optional,
    validator: /** @type {function(!fireauth.Auth) : boolean} */ (
        function(auth) {
          return !!(auth && auth instanceof fireauth.Auth);
        })
  });
};


/**
 * Specifies an instance of Firebase User.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.firebaseUser = function(opt_optional) {
  return /** @type {!fireauth.args.Argument} */ ({
    name: 'user',
    typeLabel: 'an instance of Firebase User',
    optional: !!opt_optional,
    validator: /** @type {function(!fireauth.AuthUser) : boolean} */ (
        function(user) {
          return !!(user && user instanceof fireauth.AuthUser);
        })
  });
};


/**
 * Specifies an instance of Firebase App.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.firebaseApp = function(opt_optional) {
  return /** @type {!fireauth.args.Argument} */ ({
    name: 'app',
    typeLabel: 'an instance of Firebase App',
    optional: !!opt_optional,
    validator: /** @type {function(!firebase.app.App) : boolean} */ (
        function(app) {
          return !!(app && app instanceof firebase.app.App);
        })
  });
};


/**
 * Specifies an argument that implements the fireauth.AuthCredential interface.
 * @param {?fireauth.idp.ProviderId=} opt_requiredProviderId The required type
 *     of provider.
 * @param {?string=} opt_name The name of the argument.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.authCredential =
    function(opt_requiredProviderId, opt_name, opt_optional) {
  var name = opt_name ||
      (opt_requiredProviderId ?
       opt_requiredProviderId + 'Credential' :
       'credential');
  var typeLabel = opt_requiredProviderId ?
      'a valid ' + opt_requiredProviderId + ' credential' :
      'a valid credential';
  return /** @type {!fireauth.args.Argument} */ ({
    name: name,
    typeLabel: typeLabel,
    optional: !!opt_optional,
    validator: /** @type {function(!fireauth.AuthCredential) : boolean} */ (
        function(credential) {
          if (!credential) {
            return false;
          }
          // If opt_requiredProviderId is set, make sure it matches the
          // credential's providerId.
          var matchesRequiredProvider = !opt_requiredProviderId ||
              (credential['providerId'] === opt_requiredProviderId);
          return !!(credential.getIdTokenProvider && matchesRequiredProvider);
        })
  });
};


/**
 * Specifies an argument that implements the fireauth.MultiFactorAssertion
 * interface.
 * @param {?string=} requiredFactorId The required type of second factor.
 * @param {?string=} optionalName The name of the argument.
 * @param {?boolean=} optionalArg Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.multiFactorAssertion =
    function(requiredFactorId, optionalName, optionalArg) {
  var name = optionalName ||
      (requiredFactorId ?
       requiredFactorId + 'MultiFactorAssertion' : 'multiFactorAssertion');
  var typeLabel = requiredFactorId ?
      'a valid ' + requiredFactorId + ' multiFactorAssertion' :
      'a valid multiFactorAssertion';
  return /** @type {!fireauth.args.Argument} */ ({
    name: name,
    typeLabel: typeLabel,
    optional: !!optionalArg,
    validator:
        /** @type {function(!fireauth.MultiFactorAssertion) : boolean} */ (
            function(assertion) {
              if (!assertion) {
                return false;
              }
              // If requiredFactorId is set, make sure it matches the
              // assertion's factorId.
              var matchesRequiredFactor = !requiredFactorId ||
                  (assertion['factorId'] === requiredFactorId);
              return !!(assertion.process && matchesRequiredFactor);
            })
  });
};


/**
 * Specifies an argument that implements the fireauth.AuthProvider interface.
 * @param {?string=} opt_name The name of the argument.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.authProvider = function(opt_name, opt_optional) {
  return /** @type {!fireauth.args.Argument} */ ({
    name: opt_name || 'authProvider',
    typeLabel: 'a valid Auth provider',
    optional: !!opt_optional,
    validator: /** @type {function(!fireauth.AuthProvider) : boolean} */ (
        function(provider) {
          return !!(provider &&
                    provider['providerId'] &&
                    provider.hasOwnProperty &&
                    provider.hasOwnProperty('isOAuthProvider'));
        })
  });
};


/**
 * Specifies a phone info options argument.
 * @param {?string=} name The name of the argument.
 * @param {?boolean=} optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.phoneInfoOptions = function(name, optional) {
  return /** @type {!fireauth.args.Argument} */ ({
    name: name || 'phoneInfoOptions',
    typeLabel: 'valid phone info options',
    optional: !!optional,
    validator: /** @type {function(!Object) : boolean} */ (
        function(phoneInfoOptions) {
          if (!phoneInfoOptions) {
            return false;
          }
          // For multi-factor enrollment, phone number and MFA session should
          // be provided.
          if (phoneInfoOptions['session'] &&
              phoneInfoOptions['phoneNumber']) {
            return fireauth.args.validateMultiFactorSession_(
                       phoneInfoOptions['session'],
                       fireauth.MultiFactorSession.Type.ENROLL) &&
                   typeof phoneInfoOptions['phoneNumber'] === 'string';
          // For multi-factor sign-in, phone multi-factor hint and MFA session
          // are provided.
          } else if (phoneInfoOptions['session'] &&
                     phoneInfoOptions['multiFactorHint']) {
            return fireauth.args.validateMultiFactorSession_(
                       phoneInfoOptions['session'],
                       fireauth.MultiFactorSession.Type.SIGN_IN) &&
                   fireauth.args.validateMultiFactorInfo_(
                       phoneInfoOptions['multiFactorHint']);
          // For multi-factor sign-in, phone multi-factor UID and MFA session
          // are provided.
          } else if (phoneInfoOptions['session'] &&
                     phoneInfoOptions['multiFactorUid']) {
            return fireauth.args.validateMultiFactorSession_(
                       phoneInfoOptions['session'],
                       fireauth.MultiFactorSession.Type.SIGN_IN) &&
                   typeof phoneInfoOptions['multiFactorUid'] === 'string';
          // For single-factor sign-in, only phone number needs to be provided.
          } else if (phoneInfoOptions['phoneNumber']) {
            return typeof phoneInfoOptions['phoneNumber'] === 'string';
          }
          return false;
        })
  });
};


/**
 * @param {*} session The multi-factor session object.
 * @param {!fireauth.MultiFactorSession.Type} type The session type.
 * @return {boolean} Whether the seesion is a valid multi-factor session.
 * @private
 */
fireauth.args.validateMultiFactorSession_ = function(session, type) {
  return goog.isObject(session) && typeof session.type === 'string' &&
      session.type === type &&
      typeof session.getRawSession === 'function';
};


/**
 * @param {*} info The multi-factor info object.
 * @return {boolean} Whether the info is a valid multi-factor info.
 * @private
 */
fireauth.args.validateMultiFactorInfo_ = function(info) {
  return goog.isObject(info) && typeof info['uid'] === 'string';
};


/**
 * Specifies an argument that implements the fireauth.MultiFactorInfo
 * interface.
 * @param {?string=} name The name of the argument.
 * @param {?boolean=} optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.multiFactorInfo = function(name, optional) {
  return /** @type {!fireauth.args.Argument} */ ({
    name: name || 'multiFactorInfo',
    typeLabel: 'a valid multiFactorInfo',
    optional: !!optional,
    validator: fireauth.args.validateMultiFactorInfo_
  });
};


/**
 * Specifies an argument that implements the firebase.auth.ApplicationVerifier
 * interface.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.applicationVerifier = function(opt_optional) {
  return /** @type {!fireauth.args.Argument} */ ({
    name: 'applicationVerifier',
    typeLabel: 'an implementation of firebase.auth.ApplicationVerifier',
    optional: !!opt_optional,
    validator:
        /** @type {function(!firebase.auth.ApplicationVerifier) : boolean} */ (
        function(applicationVerifier) {
          return !!(applicationVerifier &&
                    typeof applicationVerifier.type === 'string' &&
                    typeof applicationVerifier.verify === 'function');
        })
  });
};


/**
 * Specifies an argument that can be either of two argument types.
 * @param {!fireauth.args.Argument} optionA
 * @param {!fireauth.args.Argument} optionB
 * @param {?string=} opt_name The name of the argument.
 * @param {?boolean=} opt_optional Whether or not this argument is optional.
 *     Defaults to false.
 * @return {!fireauth.args.Argument}
 */
fireauth.args.or = function(optionA, optionB, opt_name, opt_optional) {
  return {
    name: opt_name || '',
    typeLabel: optionA.typeLabel + ' or ' + optionB.typeLabel,
    optional: !!opt_optional,
    validator: function(value) {
      return optionA.validator(value) || optionB.validator(value);
    }
  };
};


/**
 * @param {string} str
 * @return {string} The string surrounded with quotes.
 * @private
 */
fireauth.args.quoteString_ = function(str) {
  return '"' + str + '"';
};
