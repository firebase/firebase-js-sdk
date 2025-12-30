/**
 * @license
 * Copyright 2024 Google LLC
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

import { isCloudWorkstation } from '@firebase/util';

import {
  Code,
  DataConnectError,
  DataConnectOperationError,
  DataConnectOperationFailureResponse
} from '../core/error';
import { SDK_VERSION } from '../core/version';
import { logError } from '../logger';

import {
  CallerSdkType,
  CallerSdkTypeEnum,
  DataConnectExtensions,
  DataConnectResponse
} from './transport';

let connectFetch: typeof fetch | null = globalThis.fetch;
export function initializeFetch(fetchImpl: typeof fetch): void {
  connectFetch = fetchImpl;
}
function getGoogApiClientValue(
  _isUsingGen: boolean,
  _callerSdkType: CallerSdkType
): string {
  let str = 'gl-js/ fire/' + SDK_VERSION;
  if (
    _callerSdkType !== CallerSdkTypeEnum.Base &&
    _callerSdkType !== CallerSdkTypeEnum.Generated
  ) {
    str += ' js/' + _callerSdkType.toLowerCase();
  } else if (_isUsingGen || _callerSdkType === CallerSdkTypeEnum.Generated) {
    str += ' js/gen';
  }
  return str;
}
export interface DataConnectFetchBody<T> {
  name: string;
  operationName: string;
  variables: T;
}
export async function dcFetch<T, U>(
  url: string,
  body: DataConnectFetchBody<U>,
  { signal }: AbortController,
  appId: string | null | undefined,
  accessToken: string | null,
  appCheckToken: string | null | undefined,
  _isUsingGen: boolean,
  _callerSdkType: CallerSdkType,
  _isUsingEmulator: boolean
): Promise<DataConnectResponse<T>> {
  if (!connectFetch) {
    throw new DataConnectError(Code.OTHER, 'No Fetch Implementation detected!');
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Client': getGoogApiClientValue(_isUsingGen, _callerSdkType)
  };
  if (accessToken) {
    headers['X-Firebase-Auth-Token'] = accessToken;
  }
  if (appId) {
    headers['x-firebase-gmpid'] = appId;
  }
  if (appCheckToken) {
    headers['X-Firebase-AppCheck'] = appCheckToken;
  }
  const bodyStr = JSON.stringify(body);
  const fetchOptions: RequestInit = {
    body: bodyStr,
    method: 'POST',
    headers,
    signal
  };
  if (isCloudWorkstation(url) && _isUsingEmulator) {
    fetchOptions.credentials = 'include';
  }

  let response: Response;
  try {
    response = await connectFetch(url, fetchOptions);
  } catch (err) {
    throw new DataConnectError(
      Code.OTHER,
      'Failed to fetch: ' + JSON.stringify(err)
    );
  }
  let jsonResponse: JsonResponse<T>;
  try {
    jsonResponse = await response.json();
  } catch (e) {
    throw new DataConnectError(Code.OTHER, JSON.stringify(e));
  }
  const message = getErrorMessage(jsonResponse);
  if (response.status >= 400) {
    logError('Error while performing request: ' + JSON.stringify(jsonResponse));
    if (response.status === 401) {
      throw new DataConnectError(Code.UNAUTHORIZED, message);
    }
    throw new DataConnectError(Code.OTHER, message);
  }
  if (jsonResponse.errors && jsonResponse.errors.length) {
    const stringified = JSON.stringify(jsonResponse.errors);
    const failureResponse: DataConnectOperationFailureResponse = {
      errors: jsonResponse.errors,
      data: jsonResponse.data as Record<string, unknown>
    };
    throw new DataConnectOperationError(
      'DataConnect error while performing request: ' + stringified,
      failureResponse
    );
  }
  return jsonResponse as DataConnectResponse<T>;
}
interface JsonResponse<T> {
  message?: string;
  errors: [];
  data: Record<string, unknown> | T | null;
  extensions: DataConnectExtensions;
}
function getErrorMessage(obj: JsonResponse<unknown>): string {
  if ('message' in obj && obj.message) {
    return obj.message;
  }
  return JSON.stringify(obj);
}
