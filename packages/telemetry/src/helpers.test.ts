/**
 * @license
 * Copyright 2025 Google LLC
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

import { expect } from 'chai';
import { encodeInstanceIdentifier, decodeInstanceIdentifier } from './helpers';
import { TelemetryOptions } from './public-types';

describe('Identifier encoding/decoding', () => {
  it('encodes/decodes empty options', () => {
    const encoded = encodeInstanceIdentifier({});
    const decoded = decodeInstanceIdentifier(encoded);
    expect(decoded).to.deep.equal({});
  });

  it('encodes/decodes full options', () => {
    const options: TelemetryOptions = {
      endpointUrl: 'http://myendpoint'
    };
    const encoded = encodeInstanceIdentifier(options);
    const decoded = decodeInstanceIdentifier(encoded);
    expect(decoded).to.deep.equal(options);
  });
});
