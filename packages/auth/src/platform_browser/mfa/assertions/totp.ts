/**
 * @license
 * Copyright 2022 Google LLC
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
 * Stores the shared secret key and other parameters to generate time-based OTPs.
 * Implements methods to retrieve the shared secret key, generate a QRCode URL.
 * @public
 */
export class TotpSecret {
  /**
   * Constructor for TotpSecret.
   * @param secretKey - Shared secret key/seed used for enrolling in TOTP MFA and generating otps.
   * @param hashingAlgorithm - Hashing algorithm used.
   * @param codeLength - Length of the one-time passwords to be generated.
   * @param codeIntervalSeconds - The interval (in seconds) when the OTP codes should change.
   */
  constructor(
    readonly secretKey: string,
    readonly hashingAlgorithm: string,
    readonly codeLength: number,
    readonly codeIntervalSeconds: number
  ) {}
  /**
   * Returns a QRCode URL as described in
   * https://github.com/google/google-authenticator/wiki/Key-Uri-Format
   * This can be displayed to the user as a QRCode to be scanned into a TOTP App like Google Authenticator.
   * If the optional parameters are unspecified, an accountName of "<firebaseAppName>:<userEmail> and issuer of <firebaseAppName> are used.
   *
   * @param accountName the name of the account/app along with a user identifier.
   * @param issuer issuer of the TOTP(likely the app name).
   * @returns A QRCode URL string.
   */
  generateQrCodeUrl(_accountName?: string, _issuer?: string): string {
    throw new Error('Unimplemented');
  }
}
