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
  readonly allowedNonAlphanumericCharacters: string;
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
    if (responseOptions.containsLowercaseCharacter !== undefined) {
      this.customStrengthOptions.containsLowercaseLetter =
        responseOptions.containsLowercaseCharacter;
    }
    if (responseOptions.containsUppercaseCharacter !== undefined) {
      this.customStrengthOptions.containsUppercaseLetter =
        responseOptions.containsUppercaseCharacter;
    }
    if (responseOptions.containsNumericCharacter !== undefined) {
      this.customStrengthOptions.containsNumericCharacter =
        responseOptions.containsNumericCharacter;
    }
    if (responseOptions.containsNonAlphanumericCharacter !== undefined) {
      this.customStrengthOptions.containsNonAlphanumericCharacter =
        responseOptions.containsNonAlphanumericCharacter;
    }

    this.allowedNonAlphanumericCharacters =
      response.allowedNonAlphanumericCharacters.join('');
    this.schemaVersion = response.schemaVersion;
  }

  validatePassword(password: string): PasswordValidationStatus {
    const status: PasswordValidationStatusInternal = {
      isValid: true,
      passwordPolicy: this
    };

    // Check the password length and character options.
    this.validatePasswordLengthOptions(password, status);
    this.validatePasswordCharacterOptions(password, status);

    // Combine the status into single isValid property.
    status.isValid &&= status.meetsMinPasswordLength ?? true;
    status.isValid &&= status.meetsMaxPasswordLength ?? true;
    status.isValid &&= status.containsLowercaseLetter ?? true;
    status.isValid &&= status.containsUppercaseLetter ?? true;
    status.isValid &&= status.containsNumericCharacter ?? true;
    status.isValid &&= status.containsNonAlphanumericCharacter ?? true;

    return status;
  }

  /**
   * Validates that the password meets the length options for the policy.
   *
   * @param password Password to validate.
   * @param status Validation status.
   */
  private validatePasswordLengthOptions(
    password: string,
    status: PasswordValidationStatusInternal
  ): void {
    const minPasswordLength = this.customStrengthOptions.minPasswordLength;
    const maxPasswordLength = this.customStrengthOptions.maxPasswordLength;
    if (minPasswordLength) {
      status.meetsMinPasswordLength = password.length >= minPasswordLength;
    }
    if (maxPasswordLength) {
      status.meetsMaxPasswordLength = password.length <= maxPasswordLength;
    }
  }

  /**
   * Validates that the password meets the character options for the policy.
   *
   * @param password Password to validate.
   * @param status Validation status.
   */
  private validatePasswordCharacterOptions(
    password: string,
    status: PasswordValidationStatusInternal
  ): void {
    let passwordChar;
    for (let i = 0; i < password.length; i++) {
      passwordChar = password.charAt(i);
      if (this.customStrengthOptions.containsLowercaseLetter) {
        status.containsLowercaseLetter ||=
          passwordChar >= 'a' && passwordChar <= 'z';
      }
      if (this.customStrengthOptions.containsUppercaseLetter) {
        status.containsUppercaseLetter ||=
          passwordChar >= 'A' && passwordChar <= 'Z';
      }
      if (this.customStrengthOptions.containsNumericCharacter) {
        status.containsNumericCharacter ||=
          passwordChar >= '0' && passwordChar <= '9';
      }
      if (this.customStrengthOptions.containsNonAlphanumericCharacter) {
        status.containsNonAlphanumericCharacter ||=
          this.allowedNonAlphanumericCharacters.includes(passwordChar);
      }
    }
  }
}
