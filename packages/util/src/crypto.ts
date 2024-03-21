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

import type { KeyObject } from 'crypto';

export function importJwk(jwk: {
  [key: string]: string;
  kid: string;
}): Promise<CryptoKey | KeyObject> {
  // @ts-ignore
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['verify']
  );
}

export function verifyJWTSignature(
  content: string,
  publicKey: CryptoKey | KeyObject,
  signature: string
): Promise<boolean> {
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey as CryptoKey,
    base64ToUint8Array(signature),
    stringToUint8Array(content)
  );
}

function base64decode(base64Contents: string): string {
  base64Contents = base64Contents
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/\s/g, '');
  return atob(base64Contents);
}

function base64ToUint8Array(base64Contents: string): Uint8Array {
  return new Uint8Array(
    base64decode(base64Contents)
      .split('')
      .map(c => c.charCodeAt(0))
  );
}

function stringToUint8Array(contents: string): Uint8Array {
  const encoded = btoa(unescape(encodeURIComponent(contents)));
  return base64ToUint8Array(encoded);
}
