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

import { Auth } from '..';
import {
  JsonError,
  SERVER_ERROR_MAP,
  ServerErrorMap,
  ServerError
} from './errors';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../core/errors';
import { FirebaseError } from '@firebase/util';

// TODO: pass this in for emulator
export const PRODUCTION_URL = 'https://identitytoolkit.googleapis.com';

export enum HttpMethod {
  POST = 'POST',
  GET = 'GET'
}

export enum Endpoint {
  CREATE_AUTH_URI = '/v1/accounts:createAuthUri',
  DELETE_ACCOUNT = '/v1/accounts:delete',
  RESET_PASSWORD = '/v1/accounts:resetPassword',
  SIGN_UP = '/v1/accounts:signUp',
  SIGN_IN_WITH_EMAIL_LINK = '/v1/accounts:signInWithEmailLink',
  SIGN_IN_WITH_IDP = '/v1/accounts:signInWithIdp',
  SIGN_IN_WITH_PASSWORD = '/v1/accounts:signInWithPassword',
  SIGN_IN_WITH_PHONE_NUMBER = '/v1/accounts:signInWithPhoneNumber',
  SEND_VERIFICATION_CODE = '/v1/accounts:sendVerificationCode',
  SEND_OOB_CODE = '/v1/accounts:sendOobCode',
  SET_ACCOUNT_INFO = '/v1/accounts:update',
  GET_ACCOUNT_INFO = '/v1/accounts:lookup',
  GET_RECAPTCHA_PARAM = '/v1/recaptchaParams'
}

export async function performApiRequest<T, V>(
  auth: Auth,
  method: HttpMethod,
  path: Endpoint,
  request?: T,
  customErrorMap: Partial<ServerErrorMap<ServerError>> = {}
): Promise<V> {
  const errorMap = { ...SERVER_ERROR_MAP, ...customErrorMap };
  try {
    const body = request
      ? {
          body: JSON.stringify(request)
        }
      : {};
    const response = await fetch(
      `${PRODUCTION_URL}${path}?key=${auth.config.apiKey}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        referrerPolicy: 'no-referrer',
        ...body
      }
    );
    if (response.ok) {
      return response.json();
    } else {
      const json: JsonError = await response.json();
      const authError = errorMap[json.error.message];
      if (authError) {
        throw AUTH_ERROR_FACTORY.create(authError, { appName: auth.name });
      } else {
        // TODO probably should handle improperly formatted errors as well
        // If you see this, add an entry to SERVER_ERROR_MAP for the corresponding error
        throw new Error(`Unexpected API error: ${json.error.message}`);
      }
    }
  } catch (e) {
    if (e instanceof FirebaseError) {
      throw e;
    }
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.NETWORK_REQUEST_FAILED, {
      appName: auth.name
    });
  }
}
