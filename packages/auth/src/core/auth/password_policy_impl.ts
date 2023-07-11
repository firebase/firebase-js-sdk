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

import { GetPasswordPolicyResponse } from '../../api/password_policy/get_password_policy';
import {
  PasswordPolicyInternal,
  PasswordValidationStatusInternal
} from '../../model/password_policy';
import {
  PasswordPolicy,
  PasswordValidationStatus
} from '../../model/public_types';

/**
 * Constructs a PasswordValidationStatus from the mirrored internal typing.
 *
 * @internal
 */
export class PasswordValidationStatusImpl implements PasswordValidationStatus {
  readonly isValid: boolean;
  readonly meetsMinPasswordLength?: boolean;
  readonly meetsMaxPasswordLength?: boolean;
  readonly containsLowercaseLetter?: boolean;
  readonly containsUppercaseLetter?: boolean;
  readonly containsNumericCharacter?: boolean;
  readonly containsNonAlphanumericCharacter?: boolean;
  readonly passwordPolicy: PasswordPolicy;

  constructor(statusInternal: PasswordValidationStatusInternal) {
    this.isValid = statusInternal.isValid;
    this.passwordPolicy = statusInternal.passwordPolicy;

    // Only include requirements with defined statuses.
    if (statusInternal.meetsMinPasswordLength !== undefined) {
      this.meetsMinPasswordLength = statusInternal.meetsMinPasswordLength;
    }
    if (statusInternal.meetsMaxPasswordLength !== undefined) {
      this.meetsMaxPasswordLength = statusInternal.meetsMaxPasswordLength;
    }
    if (statusInternal.containsLowercaseLetter !== undefined) {
      this.containsLowercaseLetter = statusInternal.containsLowercaseLetter;
    }
    if (statusInternal.containsUppercaseLetter !== undefined) {
      this.containsUppercaseLetter = statusInternal.containsUppercaseLetter;
    }
    if (statusInternal.containsNumericCharacter !== undefined) {
      this.containsNumericCharacter = statusInternal.containsNumericCharacter;
    }
    if (statusInternal.containsNonAlphanumericCharacter !== undefined) {
      this.containsNonAlphanumericCharacter =
        statusInternal.containsNonAlphanumericCharacter;
    }
  }
}

/**
 * Stores password policy requirements and provides password validation against the policy.
 *
 * @internal
 */
export class PasswordPolicyImpl implements PasswordPolicyInternal {
  readonly customStrengthOptions: {
    readonly minPasswordLength?: number;
    readonly maxPasswordLength?: number;
    readonly containsLowercaseLetter?: boolean;
    readonly containsUppercaseLetter?: boolean;
    readonly containsNumericCharacter?: boolean;
    readonly containsNonAlphanumericCharacter?: boolean;
  };
  readonly allowedNonAlphanumericCharacters?: string[];
  readonly schemaVersion: number;

  constructor(response: GetPasswordPolicyResponse) {
    // Only include custom strength options defined in the response.
    const responseOptions = response.customStrengthOptions;
    this.customStrengthOptions = {
      ...(responseOptions.minPasswordLength && {
        minPasswordLength: responseOptions.minPasswordLength
      }),
      ...(responseOptions.maxPasswordLength && {
        maxPasswordLength: responseOptions.maxPasswordLength
      }),
      ...(responseOptions.containsLowercaseCharacter && {
        containsLowercaseLetter: responseOptions.containsLowercaseCharacter
      }),
      ...(responseOptions.containsUppercaseCharacter && {
        containsUppercaseLetter: responseOptions.containsUppercaseCharacter
      }),
      ...(responseOptions.containsNumericCharacter && {
        containsNumericCharacter: responseOptions.containsNumericCharacter
      }),
      ...(responseOptions.containsNonAlphanumericCharacter && {
        containsNonAlphanumericCharacter:
          responseOptions.containsNonAlphanumericCharacter
      })
    };

    if (response.allowedNonAlphanumericCharacters) {
      this.allowedNonAlphanumericCharacters =
        response.allowedNonAlphanumericCharacters;
    }
    this.schemaVersion = response.schemaVersion;
  }

  validatePassword(password: string): PasswordValidationStatus {
    const statusInternal: PasswordValidationStatusInternal = {
      isValid: false,
      passwordPolicy: this
    };

    // TODO: Implement _checkLengthOptions and _checkCharacterOptions as helper methods.
    // Call these here to populate the status object.
    if (password) {
      statusInternal.isValid = true;
    }

    return new PasswordValidationStatusImpl(statusInternal);
  }
}
