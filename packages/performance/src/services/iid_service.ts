/**
 * @license
 * Copyright 2019 Google LLC
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
import { SettingsService } from './settings_service';

let iid: string | undefined;
let authToken: string | undefined;

export function getIidPromise(): Promise<string> {
  const iidPromise = SettingsService.getInstance().installationsService.getId();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  iidPromise.then((iidVal: string) => {
    iid = iidVal;
  });
  return iidPromise;
}

// This method should be used after the iid is retrieved by getIidPromise method.
export function getIid(): string | undefined {
  return iid;
}

export function getAuthTokenPromise(): Promise<string> {
  const authTokenPromise = SettingsService.getInstance().installationsService.getToken();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  authTokenPromise.then((authTokenVal: string) => {
    authToken = authTokenVal;
  });
  return authTokenPromise;
}

export function getAuthenticationToken(): string | undefined {
  return authToken;
}
