/**
 * @license
 * Copyright 2019 Google Inc.
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
 * @fileoverview Defines the MultiFactorGenerators used to generate
 * MultiFactorAssertions. This currently covers only PhoneMultiFactorGenerator.
 */

goog.provide('fireauth.PhoneMultiFactorGenerator');

goog.require('fireauth.PhoneMultiFactorAssertion');
goog.require('fireauth.constants');
goog.require('fireauth.object');


/**
 * Defines the multi-factor generator for PhoneMultiFactorAssertions.
 * This class acts only as a namespace and defines some static methods and
 * properties.
 * @constructor @struct @final
 */
fireauth.PhoneMultiFactorGenerator = function() {};
fireauth.object.setReadonlyProperty(fireauth.PhoneMultiFactorGenerator,
    'FACTOR_ID', fireauth.constants.SecondFactorType.PHONE);


/**
 * Initializes a `PhoneMultiFactorAssertion` given a `PhoneAuthCredential`.
 * @param {!fireauth.PhoneAuthCredential} phoneAuthCredential
 * @return {!fireauth.PhoneMultiFactorAssertion} The `MultiFactorAssertion`
 *     corresponding to the provided `PhoneAuthCredential`.
 */
fireauth.PhoneMultiFactorGenerator.assertion = function(phoneAuthCredential) {
  return new fireauth.PhoneMultiFactorAssertion(phoneAuthCredential);
};
