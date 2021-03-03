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

// eslint-disable-next-line import/no-extraneous-dependencies
import { Auth } from '@firebase/auth-exp';
import { getApps } from '@firebase/app-exp';

interface VerificationSession {
  code: string;
  phoneNumber: string;
  sessionInfo: string;
}

interface VerificationCodesResponse {
  verificationCodes: VerificationSession[];
}

export async function getPhoneVerificationCodes(
  auth: Auth
): Promise<Record<string, VerificationSession>> {
  assertEmulator(auth);
  const url = getEmulatorUrl(auth, 'verificationCodes');
  const response: VerificationCodesResponse = await (await fetch(url)).json();

  return response.verificationCodes.reduce((accum, session) => {
    accum[session.sessionInfo] = session;
    return accum;
  }, {} as Record<string, VerificationSession>);
}

function getEmulatorUrl(auth: Auth, endpoint: string): string {
  const { host, port, protocol } = auth.emulatorConfig!;
  const projectId = getProjectId(auth);
  return `${protocol}://${host}:${port}/emulator/v1/projects/${projectId}/${endpoint}`;
}

function getProjectId(auth: Auth): string {
  return getApps().find(app => app.name === auth.name)!.options.projectId!;
}

function assertEmulator(auth: Auth): void {
  if (!auth.emulatorConfig) {
    throw new Error("Can't fetch OOB codes against prod API");
  }
}
