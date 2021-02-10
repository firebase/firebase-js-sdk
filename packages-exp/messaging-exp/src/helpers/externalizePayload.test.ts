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

import { MessagePayload } from '@firebase/messaging-types-exp';
import { MessagePayloadInternal } from '../interfaces/internal-message-payload';
import { expect } from 'chai';
import { externalizePayload } from './externalizePayload';

describe('externalizePayload', () => {
  it('externalizes internalMessage with only notification payload', () => {
    const internalPayload: MessagePayloadInternal = {
      notification: {
        title: 'title',
        body: 'body',
        image: 'image'
      },
      from: 'from',
      // eslint-disable-next-line camelcase
      collapse_key: 'collapse'
    };

    const payload: MessagePayload = {
      notification: { title: 'title', body: 'body', image: 'image' },
      from: 'from',
      collapseKey: 'collapse'
    };
    expect(externalizePayload(internalPayload)).to.deep.equal(payload);
  });

  it('externalizes internalMessage with only data payload', () => {
    const internalPayload: MessagePayloadInternal = {
      data: {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz'
      },
      from: 'from',
      // eslint-disable-next-line camelcase
      collapse_key: 'collapse'
    };

    const payload: MessagePayload = {
      data: { foo: 'foo', bar: 'bar', baz: 'baz' },
      from: 'from',
      collapseKey: 'collapse'
    };
    expect(externalizePayload(internalPayload)).to.deep.equal(payload);
  });

  it('externalizes internalMessage with all three payloads', () => {
    const internalPayload: MessagePayloadInternal = {
      notification: {
        title: 'title',
        body: 'body',
        image: 'image'
      },
      data: {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz'
      },
      fcmOptions: {
        link: 'link',
        // eslint-disable-next-line camelcase
        analytics_label: 'label'
      },
      from: 'from',
      // eslint-disable-next-line camelcase
      collapse_key: 'collapse'
    };

    const payload: MessagePayload = {
      notification: {
        title: 'title',
        body: 'body',
        image: 'image'
      },
      data: {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz'
      },
      fcmOptions: {
        link: 'link',
        analyticsLabel: 'label'
      },
      from: 'from',
      collapseKey: 'collapse'
    };
    expect(externalizePayload(internalPayload)).to.deep.equal(payload);
  });
});
