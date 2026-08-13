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
import * as sinon from 'sinon';
import { ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { AttributesStore } from '../attributes-store';
import { FirebaseLogProcessor } from './firebase-log-processor';

describe('FirebaseLogProcessor', () => {
  let attributesStoreStub: sinon.SinonStubbedInstance<AttributesStore>;
  let processor: FirebaseLogProcessor;

  beforeEach(() => {
    attributesStoreStub = sinon.createStubInstance(AttributesStore);
    processor = new FirebaseLogProcessor(
      attributesStoreStub as unknown as AttributesStore
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should assign log attributes from AttributesStore onto the log record', () => {
    const logRecord = {
      attributes: {}
    } as unknown as ReadableLogRecord;

    const mockAttributes = {
      'custom.key': 'custom.value'
    };

    attributesStoreStub.getLogAttributes.returns(mockAttributes);

    processor.onEmit(logRecord);

    expect(logRecord.attributes).to.deep.equal({
      'custom.key': 'custom.value'
    });
  });
});
