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

import { expect } from 'chai';

import { getDataConnect } from '../../src';
import { validateArgs } from '../../src/util/validateArgs';
describe('Utils', () => {
  it('[Vars required: true] should throw if no arguments are provided', () => {
    const connectorConfig = { connector: 'c', location: 'l', service: 's' };
    expect(() =>
      validateArgs(connectorConfig, undefined, false, true)
    ).to.throw('Variables required');
  });
  it('[vars required: false, vars provided: false] should return data connect instance and no variables', () => {
    const connectorConfig = { connector: 'c', location: 'l', service: 's' };
    const dc = getDataConnect(connectorConfig);
    expect(validateArgs(connectorConfig)).to.deep.eq({ dc, vars: undefined });
  });
  it('[vars required: false, vars provided: false, data connect provided: true] should return data connect instance and no variables', () => {
    const connectorConfig = { connector: 'c', location: 'l', service: 's' };
    const dc = getDataConnect(connectorConfig);
    expect(validateArgs(connectorConfig, dc)).to.deep.eq({
      dc,
      vars: undefined
    });
  });
  it('[vars required: true, vars provided: true, data connect provided: true] should return data connect instance and variables', () => {
    const connectorConfig = { connector: 'c', location: 'l', service: 's' };
    const dc = getDataConnect(connectorConfig);
    const vars = { a: 1 };
    expect(validateArgs(connectorConfig, dc, vars)).to.deep.eq({ dc, vars });
  });
});
