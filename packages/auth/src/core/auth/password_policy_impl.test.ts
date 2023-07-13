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
import {
  PasswordPolicy,
  PasswordValidationStatus
} from '../../model/public_types';
import { PasswordPolicyImpl } from './password_policy_impl';
import { GetPasswordPolicyResponse } from '../../api/password_policy/get_password_policy';
import { PasswordPolicyInternal } from '../../model/password_policy';

use(sinonChai);
use(chaiAsPromised);

describe('core/auth/password_policy_impl', () => {
  const TEST_MIN_PASSWORD_LENGTH = 6;
  const TEST_MAX_PASSWORD_LENGTH = 12;
  const TEST_CONTAINS_LOWERCASE = true;
  const TEST_CONTAINS_UPPERCASE = true;
  const TEST_CONTAINS_NUMERIC = true;
  const TEST_CONTAINS_NON_ALPHANUMERIC = true;
  const TEST_ALLOWED_NON_ALPHANUMERIC_CHARS = ['!', '(', ')', '@'];
  const TEST_ALLOWED_NON_ALPHANUMERIC_STRING =
    TEST_ALLOWED_NON_ALPHANUMERIC_CHARS.join('');
  const TEST_SCHEMA_VERSION = 1;
  const PASSWORD_POLICY_RESPONSE_REQUIRE_ALL: GetPasswordPolicyResponse = {
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
  const PASSWORD_POLICY_RESPONSE_REQUIRE_LENGTH: GetPasswordPolicyResponse = {
    customStrengthOptions: {
      minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
      maxPasswordLength: TEST_MAX_PASSWORD_LENGTH
    },
    allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_CHARS,
    schemaVersion: TEST_SCHEMA_VERSION
  };
  const PASSWORD_POLICY_REQUIRE_ALL: PasswordPolicy = {
    customStrengthOptions: {
      minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
      maxPasswordLength: TEST_MAX_PASSWORD_LENGTH,
      containsLowercaseLetter: TEST_CONTAINS_LOWERCASE,
      containsUppercaseLetter: TEST_CONTAINS_UPPERCASE,
      containsNumericCharacter: TEST_CONTAINS_NUMERIC,
      containsNonAlphanumericCharacter: TEST_CONTAINS_UPPERCASE
    },
    allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_STRING
  };
  const PASSWORD_POLICY_REQUIRE_LENGTH: PasswordPolicy = {
    customStrengthOptions: {
      minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
      maxPasswordLength: TEST_MAX_PASSWORD_LENGTH
    },
    allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_STRING
  };

  context('#PasswordPolicyImpl', () => {
    it('can construct the password policy from the backend response', () => {
      const policy: PasswordPolicyInternal = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_REQUIRE_ALL
      );
      expect(policy.customStrengthOptions).to.eql(
        PASSWORD_POLICY_REQUIRE_ALL.customStrengthOptions
      );
      expect(policy.allowedNonAlphanumericCharacters).to.eql(
        PASSWORD_POLICY_REQUIRE_ALL.allowedNonAlphanumericCharacters
      );
      expect(policy.schemaVersion).to.eql(
        PASSWORD_POLICY_RESPONSE_REQUIRE_ALL.schemaVersion
      );
    });

    it('only includes requirements defined in the response', () => {
      const policy: PasswordPolicyInternal = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_REQUIRE_LENGTH
      );
      expect(policy.customStrengthOptions).to.eql(
        PASSWORD_POLICY_REQUIRE_LENGTH.customStrengthOptions
      );
      expect(policy.allowedNonAlphanumericCharacters).to.eql(
        PASSWORD_POLICY_REQUIRE_LENGTH.allowedNonAlphanumericCharacters
      );
      expect(policy.schemaVersion).to.eql(
        PASSWORD_POLICY_RESPONSE_REQUIRE_LENGTH.schemaVersion
      );
      // Requirements that are not in the response should be undefined.
      expect(policy.customStrengthOptions.containsLowercaseLetter).to.be
        .undefined;
      expect(policy.customStrengthOptions.containsUppercaseLetter).to.be
        .undefined;
      expect(policy.customStrengthOptions.containsNumericCharacter).to.be
        .undefined;
      expect(policy.customStrengthOptions.containsNonAlphanumericCharacter).to
        .be.undefined;
    });

    context('#validatePassword', () => {
      const PASSWORD_POLICY_IMPL_REQUIRE_ALL = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_REQUIRE_ALL
      );
      const PASSWORD_POLICY_IMPL_REQUIRE_LENGTH = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_REQUIRE_LENGTH
      );

      it('password that is too short is considered invalid', async () => {
        const policy = PASSWORD_POLICY_IMPL_REQUIRE_ALL;
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: false,
          meetsMaxPasswordLength: true,
          containsLowercaseLetter: true,
          containsUppercaseLetter: true,
          containsNumericCharacter: true,
          containsNonAlphanumericCharacter: true,
          passwordPolicy: policy
        };

        const status = policy.validatePassword('P4ss!');
        expect(status).to.eql(expectedValidationStatus);
      });

      it('password that is too long is considered invalid', async () => {
        const policy = PASSWORD_POLICY_IMPL_REQUIRE_ALL;
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: true,
          meetsMaxPasswordLength: false,
          containsLowercaseLetter: true,
          containsUppercaseLetter: true,
          containsNumericCharacter: true,
          containsNonAlphanumericCharacter: true,
          passwordPolicy: policy
        };

        const status = policy.validatePassword('Password01234!');
        expect(status).to.eql(expectedValidationStatus);
      });

      it('password that does not contain a lowercase character is considered invalid', async () => {
        const policy = PASSWORD_POLICY_IMPL_REQUIRE_ALL;
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: true,
          meetsMaxPasswordLength: true,
          containsLowercaseLetter: false,
          containsUppercaseLetter: true,
          containsNumericCharacter: true,
          containsNonAlphanumericCharacter: true,
          passwordPolicy: policy
        };

        const status = policy.validatePassword('P4SSWORD!');
        expect(status).to.eql(expectedValidationStatus);
      });

      it('password that does not contain an uppercase character is considered invalid', async () => {
        const policy = PASSWORD_POLICY_IMPL_REQUIRE_ALL;
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: true,
          meetsMaxPasswordLength: true,
          containsLowercaseLetter: true,
          containsUppercaseLetter: false,
          containsNumericCharacter: true,
          containsNonAlphanumericCharacter: true,
          passwordPolicy: policy
        };

        const status = policy.validatePassword('p4ssword!');
        expect(status).to.eql(expectedValidationStatus);
      });

      it('password that does not contain a numeric character is considered invalid', async () => {
        const policy = PASSWORD_POLICY_IMPL_REQUIRE_ALL;
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: true,
          meetsMaxPasswordLength: true,
          containsLowercaseLetter: true,
          containsUppercaseLetter: true,
          containsNumericCharacter: false,
          containsNonAlphanumericCharacter: true,
          passwordPolicy: policy
        };

        const status = policy.validatePassword('Password!');
        expect(status).to.eql(expectedValidationStatus);
      });

      it('password that does not contain a non-alphanumeric character is considered invalid', async () => {
        const policy = PASSWORD_POLICY_IMPL_REQUIRE_ALL;
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: true,
          meetsMaxPasswordLength: true,
          containsLowercaseLetter: true,
          containsUppercaseLetter: true,
          containsNumericCharacter: true,
          containsNonAlphanumericCharacter: false,
          passwordPolicy: policy
        };

        let status = policy.validatePassword('P4ssword');
        expect(status).to.eql(expectedValidationStatus);

        // Characters not in allowedNonAlphanumericCharacters should not be considered valid.
        status = policy.validatePassword('P4sswo*d');
        expect(status).to.eql(expectedValidationStatus);
      });

      it('passwords that only partially meet requirements are considered invalid', async () => {
        const policy = PASSWORD_POLICY_IMPL_REQUIRE_ALL;
        let expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: true,
          meetsMaxPasswordLength: false,
          containsLowercaseLetter: true,
          containsUppercaseLetter: false,
          containsNumericCharacter: true,
          containsNonAlphanumericCharacter: false,
          passwordPolicy: policy
        };

        let status = policy.validatePassword('password01234');
        expect(status).to.eql(expectedValidationStatus);

        expectedValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: false,
          meetsMaxPasswordLength: true,
          containsLowercaseLetter: false,
          containsUppercaseLetter: true,
          containsNumericCharacter: false,
          containsNonAlphanumericCharacter: true,
          passwordPolicy: policy
        };

        status = policy.validatePassword('P@SS');
        expect(status).to.eql(expectedValidationStatus);
      });

      it('should only include statuses for requirements included in the policy', async () => {
        const policy = PASSWORD_POLICY_IMPL_REQUIRE_LENGTH;
        let expectedValidationStatus: PasswordValidationStatus = {
          isValid: true,
          meetsMinPasswordLength: true,
          meetsMaxPasswordLength: true,
          passwordPolicy: policy
        };

        let status = policy.validatePassword('password');
        expect(status).to.eql(expectedValidationStatus);
        expect(status.containsLowercaseLetter).to.be.undefined;
        expect(status.containsUppercaseLetter).to.be.undefined;
        expect(status.containsNumericCharacter).to.be.undefined;
        expect(status.containsNonAlphanumericCharacter).to.be.undefined;

        expectedValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: false,
          meetsMaxPasswordLength: true,
          passwordPolicy: PASSWORD_POLICY_IMPL_REQUIRE_LENGTH
        };

        status = policy.validatePassword('pass');
        expect(status).to.eql(expectedValidationStatus);
        expect(status.containsLowercaseLetter).to.be.undefined;
        expect(status.containsUppercaseLetter).to.be.undefined;
        expect(status.containsNumericCharacter).to.be.undefined;
        expect(status.containsNonAlphanumericCharacter).to.be.undefined;
      });
    });
  });
});
