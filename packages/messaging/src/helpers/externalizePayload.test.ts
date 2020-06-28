/* eslint-disable camelcase */
/**
 * @license
 * Copyright 2017 Google LLC
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

import {
  MessagePayload,
  MessagePayloadInternal
} from '../interfaces/message-payload';

import { expect } from 'chai';
import { externalizePayload } from './externalizePayload';

describe('externalizePayload', () => {
  it('externalizes internalMessage with only notification payload', () => {
    const internalPayload: MessagePayloadInternal = {
      notification: {
        title: 'title',
        body: 'body',
        image: 'image'
      }
    };

    const payload: MessagePayload = {
      notification: { title: 'title', body: 'body', image: 'image' }
    };
    expect(externalizePayload(internalPayload)).to.deep.equal(payload);
  });

  it('externalizes internalMessage with only data payload', () => {
    const internalPayload: MessagePayloadInternal = {
      data: {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz'
      }
    };

    const payload: MessagePayload = {
      data: { foo: 'foo', bar: 'bar', baz: 'baz' }
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
        analytics_label: 'label'
      }
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
      }
    };
    expect(externalizePayload(internalPayload)).to.deep.equal(payload);
  });
});
