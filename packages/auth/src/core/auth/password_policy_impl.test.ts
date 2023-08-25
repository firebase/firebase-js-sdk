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
  const TEST_ENFORCEMENT_STATE_ENFORCE = 'ENFORCE';
  const TEST_ENFORCEMENT_STATE_OFF = 'OFF';
  const TEST_REQUIRE_ALL_FORCE_UPGRADE_ON_SIGN_IN = true;
  const TEST_REQUIRE_LENGTH_FORCE_UPGRADE_ON_SIGN_IN = false;
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
    enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
    forceUpgradeOnSignin: TEST_REQUIRE_ALL_FORCE_UPGRADE_ON_SIGN_IN,
    schemaVersion: TEST_SCHEMA_VERSION
  };
  const PASSWORD_POLICY_RESPONSE_REQUIRE_LENGTH: GetPasswordPolicyResponse = {
    customStrengthOptions: {
      minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
      maxPasswordLength: TEST_MAX_PASSWORD_LENGTH
    },
    allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_CHARS,
    enforcementState: TEST_ENFORCEMENT_STATE_OFF,
    forceUpgradeOnSignin: TEST_REQUIRE_LENGTH_FORCE_UPGRADE_ON_SIGN_IN,
    schemaVersion: TEST_SCHEMA_VERSION
  };
  const PASSWORD_POLICY_RESPONSE_REQUIRE_NUMERIC: GetPasswordPolicyResponse = {
    customStrengthOptions: {
      minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
      maxPasswordLength: TEST_MAX_PASSWORD_LENGTH,
      containsNumericCharacter: TEST_CONTAINS_NUMERIC
    },
    allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_CHARS,
    enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
    schemaVersion: TEST_SCHEMA_VERSION
  };
  const PASSWORD_POLICY_RESPONSE_UNSPECIFIED_ENFORCEMENT_STATE: GetPasswordPolicyResponse =
    {
      customStrengthOptions: {
        minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
        maxPasswordLength: TEST_MAX_PASSWORD_LENGTH
      },
      allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_CHARS,
      enforcementState: 'ENFORCEMENT_STATE_UNSPECIFIED',
      schemaVersion: TEST_SCHEMA_VERSION
    };
  const PASSWORD_POLICY_RESPONSE_NO_NON_ALPHANUMERIC_CHARS: GetPasswordPolicyResponse =
    {
      customStrengthOptions: {
        minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
        maxPasswordLength: TEST_MAX_PASSWORD_LENGTH
      },
      enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
      schemaVersion: TEST_SCHEMA_VERSION
    };
  const PASSWORD_POLICY_RESPONSE_NO_MIN_LENGTH: GetPasswordPolicyResponse = {
    customStrengthOptions: {},
    enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
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
    allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_STRING,
    enforcementState: TEST_ENFORCEMENT_STATE_ENFORCE,
    forceUpgradeOnSignin: TEST_REQUIRE_ALL_FORCE_UPGRADE_ON_SIGN_IN
  };
  const PASSWORD_POLICY_REQUIRE_LENGTH: PasswordPolicy = {
    customStrengthOptions: {
      minPasswordLength: TEST_MIN_PASSWORD_LENGTH,
      maxPasswordLength: TEST_MAX_PASSWORD_LENGTH
    },
    allowedNonAlphanumericCharacters: TEST_ALLOWED_NON_ALPHANUMERIC_STRING,
    enforcementState: TEST_ENFORCEMENT_STATE_OFF,
    forceUpgradeOnSignin: TEST_REQUIRE_LENGTH_FORCE_UPGRADE_ON_SIGN_IN
  };
  const TEST_EMPTY_PASSWORD = '';

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
      expect(policy.enforcementState).to.eql(
        PASSWORD_POLICY_REQUIRE_ALL.enforcementState
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
      expect(policy.enforcementState).to.eql(
        PASSWORD_POLICY_REQUIRE_LENGTH.enforcementState
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

    it("assigns 'OFF' as the enforcement state when it is unspecified", () => {
      const policy: PasswordPolicyInternal = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_UNSPECIFIED_ENFORCEMENT_STATE
      );
      expect(policy.enforcementState).to.eql(TEST_ENFORCEMENT_STATE_OFF);
    });

    it('assigns false to forceUpgradeOnSignin when it is undefined in the response', () => {
      const policy: PasswordPolicyInternal = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_REQUIRE_NUMERIC
      );
      expect(policy.forceUpgradeOnSignin).to.be.false;
    });

    it('assigns an empty string as the allowed non-alphanumeric characters when they are undefined in the response', () => {
      const policy: PasswordPolicyInternal = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_NO_NON_ALPHANUMERIC_CHARS
      );
      expect(policy.allowedNonAlphanumericCharacters).to.eql('');
    });

    it('assigns a default minimum length if it is undefined in the response', () => {
      const policy: PasswordPolicyInternal = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_NO_MIN_LENGTH
      );
      expect(policy.customStrengthOptions.minPasswordLength).to.eql(6);
    });

    context('#validatePassword', () => {
      const PASSWORD_POLICY_IMPL_REQUIRE_ALL = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_REQUIRE_ALL
      );
      const PASSWORD_POLICY_IMPL_REQUIRE_LENGTH = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_REQUIRE_LENGTH
      );
      const PASSWORD_POLICY_IMPL_REQUIRE_NUMERIC = new PasswordPolicyImpl(
        PASSWORD_POLICY_RESPONSE_REQUIRE_NUMERIC
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

      it('should include statuses for requirements included in the policy when the password is an empty string', async () => {
        let policy = PASSWORD_POLICY_IMPL_REQUIRE_ALL;
        let expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: false,
          meetsMaxPasswordLength: true,
          containsLowercaseLetter: false,
          containsUppercaseLetter: false,
          containsNumericCharacter: false,
          containsNonAlphanumericCharacter: false,
          passwordPolicy: policy
        };

        let status = policy.validatePassword(TEST_EMPTY_PASSWORD);
        expect(status).to.eql(expectedValidationStatus);

        policy = PASSWORD_POLICY_IMPL_REQUIRE_NUMERIC;
        expectedValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: false,
          meetsMaxPasswordLength: true,
          containsNumericCharacter: false,
          passwordPolicy: policy
        };

        status = policy.validatePassword(TEST_EMPTY_PASSWORD);
        expect(status).to.eql(expectedValidationStatus);
        expect(status.containsLowercaseLetter).to.be.undefined;
        expect(status.containsUppercaseLetter).to.be.undefined;
        expect(status.containsNonAlphanumericCharacter).to.be.undefined;
      });

      it("should consider a password invalid if it does not meet all requirements even if the enforcement state is 'OFF'", async () => {
        const policy = PASSWORD_POLICY_IMPL_REQUIRE_NUMERIC;
        const expectedValidationStatus: PasswordValidationStatus = {
          isValid: false,
          meetsMinPasswordLength: false,
          meetsMaxPasswordLength: true,
          containsNumericCharacter: true,
          passwordPolicy: policy
        };

        const status = policy.validatePassword('p4ss');
        expect(status).to.eql(expectedValidationStatus);
      });
    });
  });
});
