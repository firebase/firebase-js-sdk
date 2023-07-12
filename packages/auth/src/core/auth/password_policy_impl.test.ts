/**
 * @license
 * Copyright 2023 Google LLC
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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { PasswordPolicy } from '../../model/public_types';
import { PasswordPolicyImpl } from './password_policy_impl';
import { GetPasswordPolicyResponse } from '../../api/password_policy/get_password_policy';

use(sinonChai);
use(chaiAsPromised);

describe('core/auth/password_policy_impl', () => {
  const TEST_MIN_PASSWORD_LENGTH = 6;
  const TEST_MAX_PASSWORD_LENGTH = 30;
  const TEST_CONTAINS_LOWERCASE = true;
  const TEST_CONTAINS_UPPERCASE = true;
  const TEST_CONTAINS_NUMERIC = true;
  const TEST_CONTAINS_NON_ALPHANUMERIC = true;
  const TEST_ALLOWED_NON_ALPHANUMERIC_CHARS = ['!', '(', ')'];
  const TEST_SCHEMA_VERSION = 1;
  const passwordPolicyResponseRequireAll: GetPasswordPolicyResponse = {
    customStrengthOptions: {
      minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
      maxPasswordLength: TEST_MAX_PASSWORD_LENGTH,
      containsLowercaseCharacter: TEST_CONTAINS_LOWERCASE,
      containsUppercaseCharacter: TEST_CONTAINS_UPPERCASE,
      containsNumericCharacter: TEST_CONTAINS_NUMERIC,
      containsNonAlphanumericCharacter: TEST_CONTAINS_NON_ALPHANUMERIC
    },
    allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_CHARS,
    schemaVersion: TEST_SCHEMA_VERSION
  };
  const passwordPolicyResponseRequireLength: GetPasswordPolicyResponse = {
    customStrengthOptions: {
      minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
      maxPasswordLength: TEST_MAX_PASSWORD_LENGTH
    },
    schemaVersion: TEST_SCHEMA_VERSION
  };
  const passwordPolicyRequireAll: PasswordPolicy = {
    customStrengthOptions: {
      minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
      maxPasswordLength: TEST_MAX_PASSWORD_LENGTH,
      containsLowercaseLetter: TEST_CONTAINS_LOWERCASE,
      containsUppercaseLetter: TEST_CONTAINS_UPPERCASE,
      containsNumericCharacter: TEST_CONTAINS_NUMERIC,
      containsNonAlphanumericCharacter: TEST_CONTAINS_UPPERCASE
    },
    allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_CHARS
  };
  const passwordPolicyRequireLength: PasswordPolicy = {
    customStrengthOptions: {
      minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
      maxPasswordLength: TEST_MAX_PASSWORD_LENGTH
    }
  };

  context('#PasswordPolicyImpl', () => {
    it('can construct the password policy from the backend response', () => {
      const policy: PasswordPolicy = new PasswordPolicyImpl(
        passwordPolicyResponseRequireAll
      );
      // The password policy contains the schema version internally, but the public typing does not.
      // Only check the fields that are publicly exposed.
      expect(policy.customStrengthOptions).to.eql(
        passwordPolicyRequireAll.customStrengthOptions
      );
      expect(policy.allowedNonAlphanumericCharacters).to.eql(
        passwordPolicyRequireAll.allowedNonAlphanumericCharacters
      );
    });

    it('only includes requirements defined in the response', () => {
      const policy: PasswordPolicy = new PasswordPolicyImpl(
        passwordPolicyResponseRequireLength
      );
      expect(policy.customStrengthOptions).to.eql(
        passwordPolicyRequireLength.customStrengthOptions
      );
      expect(policy.allowedNonAlphanumericCharacters).to.eql(
        passwordPolicyRequireLength.allowedNonAlphanumericCharacters
      );
    });
  });
});
