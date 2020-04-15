/**
 * @license
 * Copyright 2020 Google LLC
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

import { FirebaseError } from '@firebase/util';
import { AuthErrorCode, AUTH_ERROR_FACTORY } from '../core/errors';
import { Auth } from '../model/auth';
import { IdTokenResponse } from '../model/id_token';
import {
  JsonError,
  ServerError,
  ServerErrorMap,
  SERVER_ERROR_MAP
} from './errors';

export enum HttpMethod {
  POST = 'POST',
  GET = 'GET'
}

export enum Endpoint {
  CREATE_AUTH_URI = '/v1/accounts:createAuthUri',
  DELETE_ACCOUNT = '/v1/accounts:delete',
  RESET_PASSWORD = '/v1/accounts:resetPassword',
  SIGN_UP = '/v1/accounts:signUp',
  SIGN_IN_WITH_CUSTOM_TOKEN = '/v1/accounts:signInWithCustomToken',
  SIGN_IN_WITH_EMAIL_LINK = '/v1/accounts:signInWithEmailLink',
  SIGN_IN_WITH_IDP = '/v1/accounts:signInWithIdp',
  SIGN_IN_WITH_PASSWORD = '/v1/accounts:signInWithPassword',
  SIGN_IN_WITH_PHONE_NUMBER = '/v1/accounts:signInWithPhoneNumber',
  SEND_VERIFICATION_CODE = '/v1/accounts:sendVerificationCode',
  SEND_OOB_CODE = '/v1/accounts:sendOobCode',
  SET_ACCOUNT_INFO = '/v1/accounts:update',
  GET_ACCOUNT_INFO = '/v1/accounts:lookup',
  GET_RECAPTCHA_PARAM = '/v1/recaptchaParams',
  START_PHONE_MFA_ENROLLMENT = '/v2/accounts/mfaEnrollment:start',
  FINALIZE_PHONE_MFA_ENROLLMENT = '/v2/accounts/mfaEnrollment:finalize',
  START_PHONE_MFA_SIGN_IN = '/v2/accounts/mfaSignIn:start',
  FINALIZE_PHONE_MFA_SIGN_IN = '/v2/accounts/mfaSignIn:finalize',
  WITHDRAW_MFA = '/v2/accounts/mfaEnrollment:withdraw'
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
    let body = {};
    const params: { [key: string]: string } = {
      key: auth.config.apiKey
    };
    if (request) {
      if (method === HttpMethod.GET) {
        Object.assign(params, request);
      } else {
        body = {
          body: JSON.stringify(request)
        };
      }
    }

    const queryString = Object.keys(params)
      .map(key => {
        return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
      })
      .join('&');

    const response = await fetch(
      `${auth.config.apiScheme}://${auth.config.apiHost}${path}?${queryString}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': auth.config.sdkClientVersion
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

export async function performSignInRequest<T, V extends IdTokenResponse>(
  auth: Auth,
  method: HttpMethod,
  path: Endpoint,
  request?: T,
  customErrorMap: Partial<ServerErrorMap<ServerError>> = {}
): Promise<V> {
  const serverResponse = await performApiRequest<T, V>(
    auth,
    method,
    path,
    request,
    customErrorMap
  );
  if (serverResponse.mfaPendingCredential) {
    throw AUTH_ERROR_FACTORY.create(AuthErrorCode.MFA_REQUIRED, {
      appName: auth.name,
      serverResponse
    });
  }

  return serverResponse;
}
