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

import { FirebaseError, querystring } from '@firebase/util';

import { AuthErrorCode, NamedErrorParams } from '../core/errors';
import { _createError, _fail } from '../core/util/assert';
import { Delay } from '../core/util/delay';
import { _emulatorUrl } from '../core/util/emulator';
import { FetchProvider } from '../core/util/fetch_provider';
import { Auth } from '@firebase/auth-types-exp';
import { Auth as AuthInternal } from '../model/auth';
import { IdTokenResponse, TaggedWithTokenResponse } from '../model/id_token';
import { IdTokenMfaResponse } from './authentication/mfa';
import { SERVER_ERROR_MAP, ServerError, ServerErrorMap } from './errors';

export const enum HttpMethod {
  POST = 'POST',
  GET = 'GET'
}

export const enum HttpHeader {
  CONTENT_TYPE = 'Content-Type',
  X_FIREBASE_LOCALE = 'X-Firebase-Locale',
  X_CLIENT_VERSION = 'X-Client-Version'
}

export const enum Endpoint {
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
  WITHDRAW_MFA = '/v2/accounts/mfaEnrollment:withdraw',
  GET_PROJECT_CONFIG = '/v1/projects'
}

export const DEFAULT_API_TIMEOUT_MS = new Delay(30_000, 60_000);

export async function _performApiRequest<T, V>(
  auth: Auth,
  method: HttpMethod,
  path: Endpoint,
  request?: T,
  customErrorMap: Partial<ServerErrorMap<ServerError>> = {}
): Promise<V> {
  return _performFetchWithErrorHandling(auth, customErrorMap, () => {
    let body = {};
    let params = {};
    if (request) {
      if (method === HttpMethod.GET) {
        params = request;
      } else {
        body = {
          body: JSON.stringify(request)
        };
      }
    }

    const query = querystring({
      key: auth.config.apiKey,
      ...params
    }).slice(1);

    const headers = new (FetchProvider.headers())();
    headers.set(HttpHeader.CONTENT_TYPE, 'application/json');
    headers.set(HttpHeader.X_CLIENT_VERSION, auth.config.sdkClientVersion);

    if (auth.languageCode) {
      headers.set(HttpHeader.X_FIREBASE_LOCALE, auth.languageCode);
    }

    return FetchProvider.fetch()(
      _getFinalTarget(auth, auth.config.apiHost, path, query),
      {
        method,
        headers,
        referrerPolicy: 'no-referrer',
        ...body
      }
    );
  });
}

export async function _performFetchWithErrorHandling<V>(
  auth: Auth,
  customErrorMap: Partial<ServerErrorMap<ServerError>>,
  fetchFn: () => Promise<Response>
): Promise<V> {
  (auth as AuthInternal)._canInitEmulator = false;
  const errorMap = { ...SERVER_ERROR_MAP, ...customErrorMap };
  try {
    const networkTimeout = new NetworkTimeout<Response>(auth);
    const response: Response = await Promise.race<Promise<Response>>([
      fetchFn(),
      networkTimeout.promise
    ]);

    // If we've reached this point, the fetch succeeded and the networkTimeout
    // didn't throw; clear the network timeout delay so that Node won't hang
    networkTimeout.clearNetworkTimeout();

    const json = await response.json();
    if ('needConfirmation' in json) {
      throw makeTaggedError(auth, AuthErrorCode.NEED_CONFIRMATION, json);
    }

    if (response.ok) {
      return json;
    } else {
      const serverErrorCode = json.error.message.split(' : ')[0] as ServerError;
      if (serverErrorCode === ServerError.FEDERATED_USER_ID_ALREADY_LINKED) {
        throw makeTaggedError(
          auth,
          AuthErrorCode.CREDENTIAL_ALREADY_IN_USE,
          json
        );
      } else if (serverErrorCode === ServerError.EMAIL_EXISTS) {
        throw makeTaggedError(auth, AuthErrorCode.EMAIL_EXISTS, json);
      }
      const authError =
        errorMap[serverErrorCode] ||
        ((serverErrorCode
          .toLowerCase()
          .replace(/[_\s]+/g, '-') as unknown) as AuthErrorCode);
      _fail(auth, authError);
    }
  } catch (e) {
    if (e instanceof FirebaseError) {
      throw e;
    }
    _fail(auth, AuthErrorCode.NETWORK_REQUEST_FAILED);
  }
}

export async function _performSignInRequest<T, V extends IdTokenResponse>(
  auth: Auth,
  method: HttpMethod,
  path: Endpoint,
  request?: T,
  customErrorMap: Partial<ServerErrorMap<ServerError>> = {}
): Promise<V> {
  const serverResponse = (await _performApiRequest<T, V | IdTokenMfaResponse>(
    auth,
    method,
    path,
    request,
    customErrorMap
  )) as V;
  if ('mfaPendingCredential' in serverResponse) {
    _fail(auth, AuthErrorCode.MFA_REQUIRED, {
      serverResponse
    });
  }

  return serverResponse;
}

export function _getFinalTarget(
  auth: Auth,
  host: string,
  path: string,
  query: string
): string {
  const base = `${host}${path}?${query}`;

  if (!(auth as AuthInternal).config.emulator) {
    return `${auth.config.apiScheme}://${base}`;
  }

  return _emulatorUrl(auth.config, base);
}

class NetworkTimeout<T> {
  // Node timers and browser timers are fundamentally incompatible, but we
  // don't care about the value here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private timer: any | null = null;
  readonly promise = new Promise<T>((_, reject) => {
    this.timer = setTimeout(() => {
      return reject(_createError(this.auth, AuthErrorCode.TIMEOUT));
    }, DEFAULT_API_TIMEOUT_MS.get());
  });

  clearNetworkTimeout(): void {
    clearTimeout(this.timer);
  }

  constructor(private readonly auth: Auth) {}
}

interface PotentialResponse extends IdTokenResponse {
  email?: string;
  phoneNumber?: string;
}

function makeTaggedError(
  auth: Auth,
  code: AuthErrorCode,
  response: PotentialResponse
): FirebaseError {
  const errorParams: NamedErrorParams = {
    appName: auth.name
  };

  if (response.email) {
    errorParams.email = response.email;
  }
  if (response.phoneNumber) {
    errorParams.phoneNumber = response.phoneNumber;
  }

  const error = _createError(auth, code, errorParams);

  // We know customData is defined on error because errorParams is defined
  (error.customData! as TaggedWithTokenResponse)._tokenResponse = response;
  return error;
}
