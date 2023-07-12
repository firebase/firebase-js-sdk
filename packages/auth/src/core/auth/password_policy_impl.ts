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
  PasswordPolicyCustomStrengthOptions,
  PasswordPolicyInternal,
  PasswordValidationStatusInternal
} from '../../model/password_policy';
import { PasswordValidationStatus } from '../../model/public_types';

/**
 * Stores password policy requirements and provides password validation against the policy.
 *
 * @internal
 */
export class PasswordPolicyImpl implements PasswordPolicyInternal {
  readonly customStrengthOptions: PasswordPolicyCustomStrengthOptions;
  readonly allowedNonAlphanumericCharacters?: string[];
  readonly schemaVersion: number;

  constructor(response: GetPasswordPolicyResponse) {
    // Only include custom strength options defined in the response.
    const responseOptions = response.customStrengthOptions;
    this.customStrengthOptions = {};
    if (responseOptions.minPasswordLength) {
      this.customStrengthOptions.minPasswordLength =
        responseOptions.minPasswordLength;
    }
    if (responseOptions.maxPasswordLength) {
      this.customStrengthOptions.maxPasswordLength =
        responseOptions.maxPasswordLength;
    }
    if (responseOptions.containsLowercaseCharacter) {
      this.customStrengthOptions.containsLowercaseLetter =
        responseOptions.containsLowercaseCharacter;
    }
    if (responseOptions.containsUppercaseCharacter) {
      this.customStrengthOptions.containsUppercaseLetter =
        responseOptions.containsUppercaseCharacter;
    }
    if (responseOptions.containsNumericCharacter) {
      this.customStrengthOptions.containsNumericCharacter =
        responseOptions.containsNumericCharacter;
    }
    if (responseOptions.containsNonAlphanumericCharacter) {
      this.customStrengthOptions.containsNonAlphanumericCharacter =
        responseOptions.containsNonAlphanumericCharacter;
    }

    if (response.allowedNonAlphanumericCharacters) {
      this.allowedNonAlphanumericCharacters =
        response.allowedNonAlphanumericCharacters;
    }
    this.schemaVersion = response.schemaVersion;
  }

  validatePassword(password: string): PasswordValidationStatus {
    const status: PasswordValidationStatusInternal = {
      isValid: false,
      passwordPolicy: this
    };

    // TODO: Implement _checkLengthOptions and _checkCharacterOptions as helper methods.
    // Call these here to populate the status object.
    if (password) {
      status.isValid = true;
    }

    return status;
  }
}
