/**
 * @license
 * Copyright 2021 Google LLC
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

import { HostAndPort } from '../public_types';
import { makeUrl } from './url';
import { fetch as undiciFetch } from 'undici';

/**
 * @private
 */
export async function loadDatabaseRules(
  hostAndPort: HostAndPort,
  databaseName: string,
  rules: string
): Promise<void> {
  const url = makeUrl(hostAndPort, '/.settings/rules.json');
  url.searchParams.append('ns', databaseName);
  const resp = await undiciFetch(url, {
    method: 'PUT',
    headers: { Authorization: 'Bearer owner' },
    body: rules
  });

  if (!resp.ok) {
    throw new Error(await resp.text());
  }
}

/**
 * @private
 */
export async function loadFirestoreRules(
  hostAndPort: HostAndPort,
  projectId: string,
  rules: string
): Promise<void> {
  const resp = await fetch(
    makeUrl(hostAndPort, `/emulator/v1/projects/${projectId}:securityRules`),
    {
      method: 'PUT',
      body: JSON.stringify({
        rules: {
          files: [{ content: rules }]
        }
      })
    }
  );

  if (!resp.ok) {
    throw new Error(await resp.text());
  }
}

/**
 * @private
 */
export async function loadStorageRules(
  hostAndPort: HostAndPort,
  rules: string
): Promise<void> {
  const resp = await fetch(makeUrl(hostAndPort, '/internal/setRules'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rules: {
        files: [{ name: 'storage.rules', content: rules }]
      }
    })
  });
  if (!resp.ok) {
    throw new Error(await resp.text());
  }
}
