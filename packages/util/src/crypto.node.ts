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

import { createPublicKey, KeyObject, createVerify } from 'crypto';

export function importJwk(jwk: {
  [key: string]: string;
  kid: string;
}): Promise<KeyObject> {
  return Promise.resolve(createPublicKey({ key: jwk, format: 'jwk' }));
}

export function verifyJWTSignature(
  content: string,
  publicKey: KeyObject,
  signature: string
): Promise<boolean> {
  return Promise.resolve(
    createVerify('RSA-SHA256')
      .end(content)
      .verify(publicKey, signature, 'base64url')
  );
}
