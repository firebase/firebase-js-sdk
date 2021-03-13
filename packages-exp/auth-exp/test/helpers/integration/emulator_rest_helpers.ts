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

import { FetchProvider } from '../../../src/core/util/fetch_provider';
import * as fetchImpl from 'node-fetch';
import { getAppConfig, getEmulatorUrl } from './settings';

if (typeof document !== 'undefined') {
  FetchProvider.initialize(fetch);
} else {
  FetchProvider.initialize(
    (fetchImpl.default as unknown) as typeof fetch,
    (fetchImpl.Headers as unknown) as typeof Headers,
    (fetchImpl.Response as unknown) as typeof Response
  );
}

export interface VerificationSession {
  code: string;
  phoneNumber: string;
  sessionInfo: string;
}

interface VerificationCodesResponse {
  verificationCodes: VerificationSession[];
}

export interface OobCodeSession {
  email: string;
  requestType: string;
  oobCode: string;
  oobLink: string;
}

interface OobCodesResponse {
  oobCodes: OobCodeSession[];
}

export async function getPhoneVerificationCodes(): Promise<
  Record<string, VerificationSession>
> {
  const url = buildEmulatorUrlForPath('verificationCodes');
  const response: VerificationCodesResponse = await (
    await FetchProvider.fetch()(url)
  ).json();

  return response.verificationCodes.reduce((accum, session) => {
    accum[session.sessionInfo] = session;
    return accum;
  }, {} as Record<string, VerificationSession>);
}

export async function getOobCodes(): Promise<OobCodeSession[]> {
  const url = buildEmulatorUrlForPath('oobCodes');
  const response: OobCodesResponse = await (
    await FetchProvider.fetch()(url)
  ).json();
  return response.oobCodes;
}

export async function resetEmulator(): Promise<void> {
  const url = buildEmulatorUrlForPath('accounts');
  await FetchProvider.fetch()(url, { method: 'DELETE' });
}

export async function createAnonAccount(): Promise<{
  localId: string;
  idToken: string;
  refreshToken: string;
}> {
  const url = `${getEmulatorUrl()}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`;
  const response = await (
    await FetchProvider.fetch()(url, {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Type': 'application/json' }
    })
  ).json();
  return response;
}

function buildEmulatorUrlForPath(endpoint: string): string {
  const emulatorBaseUrl = getEmulatorUrl();
  const projectId = getAppConfig().projectId;
  return `${emulatorBaseUrl}/emulator/v1/projects/${projectId}/${endpoint}`;
}
