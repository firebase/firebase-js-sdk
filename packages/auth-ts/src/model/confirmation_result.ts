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

import { UserCredential } from './user_credential';
import { PhoneAuthProvider, PhoneAuthCredential } from '../core/providers/phone';

export interface OnConfirmationCallback {
  (credential: PhoneAuthCredential): Promise<UserCredential>;
}

export class ConfirmationResult {
  constructor(
      readonly verificationId: string,
      private readonly onConfirmation: OnConfirmationCallback) {}
  
  async confirm(verificationCode: string): Promise<UserCredential> {
    const authCredential =
        PhoneAuthProvider.credential(this.verificationId, verificationCode);
    return this.onConfirmation(authCredential);
  }
}