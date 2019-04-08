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

import {
  INSTALLATIONS_API_URL,
  INTERNAL_AUTH_VERSION,
  PACKAGE_VERSION
} from './constants';
import { ERROR_FACTORY, ErrorCode } from './errors';
import {
  CreateInstallationResponse,
  GenerateAuthTokenResponse
} from './interfaces/api-response';
import { AppConfig } from './interfaces/app-config';
import {
  CompletedAuthToken,
  InProgressInstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus
} from './interfaces/installation-entry';

export async function createInstallation(
  appConfig: AppConfig,
  installationEntry: InProgressInstallationEntry
): Promise<RegisteredInstallationEntry> {
  const endpoint = getCreateInstallationEndpoint(appConfig.projectId);

  const body = {
    fid: installationEntry.fid,
    authVersion: INTERNAL_AUTH_VERSION,
    appId: appConfig.appId,
    sdkVersion: PACKAGE_VERSION
  };

  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-goog-api-key': appConfig.apiKey
  });

  const request: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  };

  const response = await fetch(endpoint, request);
  if (response.ok) {
    const responseValue: CreateInstallationResponse = await response.json();
    const registeredInstallationEntry: RegisteredInstallationEntry = {
      fid: installationEntry.fid,
      registrationStatus: RequestStatus.COMPLETED,
      refreshToken: responseValue.refreshToken,
      authToken: extractAuthTokenInfoFromResponse(responseValue.authToken)
    };
    return registeredInstallationEntry;
  } else {
    const errorData = await getErrorFromResponse(response);
    throw ERROR_FACTORY.create(ErrorCode.CREATE_INSTALLATION_REQUEST_FAILED, {
      serverCode: errorData.code,
      serverMessage: errorData.message,
      serverStatus: errorData.status
    });
  }
}

export async function generateAuthToken(
  appConfig: AppConfig,
  installationEntry: RegisteredInstallationEntry
): Promise<CompletedAuthToken> {
  const endpoint = getGenerateAuthTokenEndpoint(
    appConfig.projectId,
    installationEntry.fid
  );

  const body = {
    installation: {
      sdkVersion: PACKAGE_VERSION
    }
  };

  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: getAuthorizationHeader(installationEntry.refreshToken),
    'x-goog-api-key': appConfig.apiKey
  });

  const request: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  };

  const response = await fetch(endpoint, request);
  if (response.ok) {
    const responseValue: GenerateAuthTokenResponse = await response.json();
    const completedAuthToken: CompletedAuthToken = extractAuthTokenInfoFromResponse(
      responseValue
    );
    return completedAuthToken;
  } else {
    const errorData = await getErrorFromResponse(response);
    throw ERROR_FACTORY.create(ErrorCode.GENERATE_TOKEN_REQUEST_FAILED, {
      serverCode: errorData.code,
      serverMessage: errorData.message,
      serverStatus: errorData.status
    });
  }
}

function getCreateInstallationEndpoint(projectId: string): string {
  return `${INSTALLATIONS_API_URL}/projects/${projectId}/installations`;
}

function getGenerateAuthTokenEndpoint(projectId: string, fid: string): string {
  return `${getCreateInstallationEndpoint(
    projectId
  )}/${fid}/authTokens:generate`;
}

function getAuthorizationHeader(refreshToken: string): string {
  return `${INTERNAL_AUTH_VERSION} ${refreshToken}`;
}

function getExpiresInFromResponseExpiresIn(responseExpiresIn: string): number {
  // This works because the server will never respond with fractions of a second.
  return Number(responseExpiresIn.replace('s', '000'));
}

function extractAuthTokenInfoFromResponse(
  response: GenerateAuthTokenResponse
): CompletedAuthToken {
  return {
    token: response.token,
    requestStatus: RequestStatus.COMPLETED,
    expiresIn: getExpiresInFromResponseExpiresIn(response.expiresIn),
    creationTime: Date.now()
  };
}

interface ErrorData {
  code: number;
  message: string;
  status: string;
}

async function getErrorFromResponse(response: Response): Promise<ErrorData> {
  const responseJson = await response.json();
  return responseJson.error;
}
