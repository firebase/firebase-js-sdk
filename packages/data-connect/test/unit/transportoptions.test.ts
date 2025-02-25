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

import { queryRef } from '../../src';
import {
  TransportOptions,
  areTransportOptionsEqual,
  connectDataConnectEmulator,
  getDataConnect
} from '../../src/api/DataConnect';
import { app } from '../util';
describe('Transport Options', () => {
  it('should return false if transport options are not equal', () => {
    const transportOptions1: TransportOptions = {
      host: 'h',
      port: 1,
      sslEnabled: false
    };
    const transportOptions2: TransportOptions = {
      host: 'h2',
      port: 2,
      sslEnabled: false
    };
    expect(
      areTransportOptionsEqual(transportOptions1, transportOptions2)
    ).to.eq(false);
  });
  it('should return true if transport options are equal', () => {
    const transportOptions1: TransportOptions = {
      host: 'h',
      port: 1,
      sslEnabled: false
    };
    const transportOptions2: TransportOptions = {
      port: 1,
      host: 'h',
      sslEnabled: false
    };
    expect(
      areTransportOptionsEqual(transportOptions1, transportOptions2)
    ).to.eq(true);
  });
  it('should throw if emulator is connected to with new transport options', () => {
    const dc = getDataConnect(app, {
      connector: 'c',
      location: 'l',
      service: 's'
    });
    expect(() => connectDataConnectEmulator(dc, 'h', 80, false)).to.not.throw();
    queryRef(dc, 'query');
    expect(() => connectDataConnectEmulator(dc, 'h2', 80, false)).to.throw(
      'DataConnect instance already initialized!'
    );
  });
  it('should not throw if emulator is connected to with the same transport options', () => {
    const dc = getDataConnect(app, {
      connector: 'c',
      location: 'l',
      service: 's'
    });
    expect(() => connectDataConnectEmulator(dc, 'h', 80, false)).to.not.throw();
    queryRef(dc, 'query');
    expect(() => connectDataConnectEmulator(dc, 'h', 80, false)).to.not.throw();
  });
});
