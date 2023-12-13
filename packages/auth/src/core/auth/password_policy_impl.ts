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

// Minimum min password length enforced by the backend, even if no minimum length is set.
const MINIMUM_MIN_PASSWORD_LENGTH = 6;

/**
 * Stores password policy requirements and provides password validation against the policy.
 *
 * @internal
 */
export class PasswordPolicyImpl implements PasswordPolicyInternal {
  readonly customStrengthOptions: PasswordPolicyCustomStrengthOptions;
  readonly allowedNonAlphanumericCharacters: string;
  readonly enforcementState: string;
  readonly forceUpgradeOnSignin: boolean;
  readonly schemaVersion: number;

  constructor(response: GetPasswordPolicyResponse) {
    // Only include custom strength options defined in the response.
    const responseOptions = response.customStrengthOptions;
    this.customStrengthOptions = {};
    // TODO: Remove once the backend is updated to include the minimum min password length instead of undefined when there is no minimum length set.
    this.customStrengthOptions.minPasswordLength =
      responseOptions.minPasswordLength ?? MINIMUM_MIN_PASSWORD_LENGTH;
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

    this.enforcementState = response.enforcementState;
    if (this.enforcementState === 'ENFORCEMENT_STATE_UNSPECIFIED') {
      this.enforcementState = 'OFF';
    }

    // Use an empty string if no non-alphanumeric characters are specified in the response.
    this.allowedNonAlphanumericCharacters =
      response.allowedNonAlphanumericCharacters?.join('') ?? '';

    this.forceUpgradeOnSignin = response.forceUpgradeOnSignin ?? false;
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
    // Assign statuses for requirements even if the password is an empty string.
    this.updatePasswordCharacterOptionsStatuses(
      status,
      /* containsLowercaseCharacter= */ false,
      /* containsUppercaseCharacter= */ false,
      /* containsNumericCharacter= */ false,
      /* containsNonAlphanumericCharacter= */ false
    );

    let passwordChar;
    for (let i = 0; i < password.length; i++) {
      passwordChar = password.charAt(i);
      this.updatePasswordCharacterOptionsStatuses(
        status,
        /* containsLowercaseCharacter= */ passwordChar >= 'a' &&
          passwordChar <= 'z',
        /* containsUppercaseCharacter= */ passwordChar >= 'A' &&
          passwordChar <= 'Z',
        /* containsNumericCharacter= */ passwordChar >= '0' &&
          passwordChar <= '9',
        /* containsNonAlphanumericCharacter= */ this.allowedNonAlphanumericCharacters.includes(
          passwordChar
        )
      );
    }
  }

  /**
   * Updates the running validation status with the statuses for the character options.
   * Expected to be called each time a character is processed to update each option status
   * based on the current character.
   *
   * @param status Validation status.
   * @param containsLowercaseCharacter Whether the character is a lowercase letter.
   * @param containsUppercaseCharacter Whether the character is an uppercase letter.
   * @param containsNumericCharacter Whether the character is a numeric character.
   * @param containsNonAlphanumericCharacter Whether the character is a non-alphanumeric character.
   */
  private updatePasswordCharacterOptionsStatuses(
    status: PasswordValidationStatusInternal,
    containsLowercaseCharacter: boolean,
    containsUppercaseCharacter: boolean,
    containsNumericCharacter: boolean,
    containsNonAlphanumericCharacter: boolean
  ): void {
    if (this.customStrengthOptions.containsLowercaseLetter) {
      status.containsLowercaseLetter ||= containsLowercaseCharacter;
    }
    if (this.customStrengthOptions.containsUppercaseLetter) {
      status.containsUppercaseLetter ||= containsUppercaseCharacter;
    }
    if (this.customStrengthOptions.containsNumericCharacter) {
      status.containsNumericCharacter ||= containsNumericCharacter;
    }
    if (this.customStrengthOptions.containsNonAlphanumericCharacter) {
      status.containsNonAlphanumericCharacter ||=
        containsNonAlphanumericCharacter;
    }
  }
}
