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

import * as fetchImpl from 'node-fetch';
import { API_KEY, getAppConfig, getEmulatorUrl } from './settings';

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

export async function getPhoneVerificationCodes(tenantId?: string): Promise<
  Record<string, VerificationSession>
> {
  const url = buildEmulatorUrlForPath('verificationCodes', tenantId);
  const response: VerificationCodesResponse = await (await doFetch(url)).json();

  return response.verificationCodes.reduce((accum, session) => {
    accum[session.sessionInfo] = session;
    return accum;
  }, {} as Record<string, VerificationSession>);
}

export async function getOobCodes(tenantId?: string): Promise<OobCodeSession[]> {
  const url = buildEmulatorUrlForPath('oobCodes', tenantId);
  const response: OobCodesResponse = await (await doFetch(url)).json();
  return response.oobCodes;
}

export async function resetEmulator(): Promise<void> {
  const url = buildEmulatorUrlForPath('accounts');
  await doFetch(url, { method: 'DELETE' });
}

export async function createAnonAccount(): Promise<{
  localId: string;
  idToken: string;
  refreshToken: string;
}> {
  const url = `${getEmulatorUrl()}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`;
  const response = await (
    await doFetch(url, {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Type': 'application/json' }
    })
  ).json();
  return response;
}

export async function createNewTenant(): Promise<string> {
  const projectId = getAppConfig().projectId;
  const url = `${getEmulatorUrl()}/identitytoolkit.googleapis.com/v2/projects/${projectId}/tenants?key=${API_KEY}`;
  const request = {
    name: 'tenant',
    allowPasswordSignup: true,
    enableEmailLinkSignin: true,
    disableAuth: false,
    enableAnonymousUser: true,
  };
  const response = await (
    await doFetch(url, {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer owner'}
    })
  ).json();
  return response.tenantId;
}

function buildEmulatorUrlForPath(endpoint: string, tenantId?: string): string {
  const emulatorBaseUrl = getEmulatorUrl();
  const projectId = getAppConfig().projectId;
  const tenantScope = tenantId ? `/tenants/${tenantId}` : '';
  return `${emulatorBaseUrl}/emulator/v1/projects/${projectId}${tenantScope}/${endpoint}`;
}

function doFetch(url: string, request?: RequestInit): ReturnType<typeof fetch> {
  if (typeof document !== 'undefined') {
    return fetch(url, request);
  }

  return (fetchImpl.default(
    url,
    request as fetchImpl.RequestInit
  ) as unknown) as ReturnType<typeof fetch>;
}
