/**
 * @license
 * Copyright 2026 Google LLC
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
import { TelemetryMetadataStore } from './telemetry-metadata-store';

describe('TelemetryMetadataStore', () => {
  let store: TelemetryMetadataStore;

  beforeEach(() => {
    store = new TelemetryMetadataStore();
  });

  it('should return empty attributes by default', () => {
    expect(store.getTraceAttributes()).to.deep.equal({});
    expect(store.getLogAttributes()).to.deep.equal({});
  });

  it('should update and retrieve common attributes', () => {
    store.updateCommonAttributes({ foo: 'bar', count: 42 });
    expect(store.getTraceAttributes()).to.deep.equal({ foo: 'bar', count: 42 });
    expect(store.getLogAttributes()).to.deep.equal({ foo: 'bar', count: 42 });
  });

  it('should update and retrieve trace-only attributes', () => {
    store.updateTraceAttributes({ traceOnly: 'value' });
    expect(store.getTraceAttributes()).to.deep.equal({ traceOnly: 'value' });
    expect(store.getLogAttributes()).to.deep.equal({});
  });

  it('should update and retrieve log-only attributes', () => {
    store.updateLogAttributes({ logOnly: 'value' });
    expect(store.getTraceAttributes()).to.deep.equal({});
    expect(store.getLogAttributes()).to.deep.equal({ logOnly: 'value' });
  });

  it('should merge common and trace/log attributes correctly', () => {
    store.updateCommonAttributes({ commonKey: 'common' });
    store.updateTraceAttributes({ traceKey: 'trace' });
    store.updateLogAttributes({ logKey: 'log' });

    expect(store.getTraceAttributes()).to.deep.equal({
      commonKey: 'common',
      traceKey: 'trace'
    });
    expect(store.getLogAttributes()).to.deep.equal({
      commonKey: 'common',
      logKey: 'log'
    });
  });

  it('should override duplicate keys inside trace/log getters', () => {
    store.updateCommonAttributes({ duplicateKey: 'common' });
    store.updateTraceAttributes({ duplicateKey: 'trace' });
    store.updateLogAttributes({ duplicateKey: 'log' });

    expect(store.getTraceAttributes()).to.deep.equal({ duplicateKey: 'trace' });
    expect(store.getLogAttributes()).to.deep.equal({ duplicateKey: 'log' });
  });

  it('should delete attributes from different buckets', () => {
    store.updateCommonAttributes({ c1: 'c', c2: 'c' });
    store.updateTraceAttributes({ t1: 't' });
    store.updateLogAttributes({ l1: 'l' });

    store.deleteCommonAttributes(['c1']);
    store.deleteTraceAttributes(['t1']);
    store.deleteLogAttributes(['l1']);

    expect(store.getTraceAttributes()).to.deep.equal({ c2: 'c' });
    expect(store.getLogAttributes()).to.deep.equal({ c2: 'c' });
  });

  it('should return copies of attributes to prevent direct mutation', () => {
    store.updateCommonAttributes({ foo: 'bar' });
    const traceAttrs = store.getTraceAttributes();
    const logAttrs = store.getLogAttributes();

    traceAttrs.foo = 'mutated';
    logAttrs.foo = 'mutated';

    expect(store.getTraceAttributes()).to.deep.equal({ foo: 'bar' });
    expect(store.getLogAttributes()).to.deep.equal({ foo: 'bar' });
  });

  it('should clear all attributes', () => {
    store.updateCommonAttributes({ foo: 'bar' });
    store.updateTraceAttributes({ traceOnly: 'trace' });
    store.updateLogAttributes({ logOnly: 'log' });

    store.clear();

    expect(store.getTraceAttributes()).to.deep.equal({});
    expect(store.getLogAttributes()).to.deep.equal({});
  });
});
