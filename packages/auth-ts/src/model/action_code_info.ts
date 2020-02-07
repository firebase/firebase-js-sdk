import { ResetPasswordResponse } from '../api/account_management';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../core/errors';
import { Auth } from '..';

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

export enum Operation {
  PASSWORD_RESET = 'PASSWORD_RESET',
  RECOVER_EMAIL = 'RECOVER_EMAIL',
  EMAIL_SIGNIN = 'EMAIL_SIGNIN',
  VERIFY_EMAIL = 'VERIFY_EMAIL'
}

export interface ActionCodeInfo {
  data: {
    email?: string | null;
    fromEmail?: string | null;
  };
  operation: string;
}

export function actionCodeInfoFromResetPasswordResponse(auth: Auth, response: ResetPasswordResponse): ActionCodeInfo {
  // Original email for email change revocation.
  var email = response.email;
  var operation = response.requestType;
  // Email could be empty only if the request type is EMAIL_SIGNIN.
  if (!operation ||
      (operation != Operation.EMAIL_SIGNIN &&
      !email)) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, { appName: auth.name })
  }

  return {
    data: {
      email: email || null,
      fromEmail: response.newEmail || null,
    },
    operation
  }
}