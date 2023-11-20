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

import { MessagePayload } from '../interfaces/public-types';
import { MessagePayloadInternal } from '../interfaces/internal-message-payload';
import { expect } from 'chai';
import { externalizePayload } from './externalizePayload';

describe('externalizePayload', () => {
  it('externalizes internalMessage with only notification payload', () => {
    const internalPayload: MessagePayloadInternal = {
      notification: {
        title: 'title',
        body: 'body',
        image: 'image',
        icon: 'icon',
        // eslint-disable-next-line camelcase
        click_action: 'https://www.self_orgin.com'
      },
      from: 'from',
      // eslint-disable-next-line camelcase
      collapse_key: 'collapse',
      // eslint-disable-next-line camelcase
      fcmMessageId: 'mid',
      // eslint-disable-next-line camelcase
      productId: 123
    };

    const payload: MessagePayload = {
      notification: {
        title: 'title',
        body: 'body',
        image: 'image',
        icon: 'icon'
      },
      from: 'from',
      collapseKey: 'collapse',
      messageId: 'mid',
      fcmOptions: {
        link: 'https://www.self_orgin.com'
      }
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
      collapse_key: 'collapse',
      // eslint-disable-next-line camelcase
      fcmMessageId: 'mid',
      // eslint-disable-next-line camelcase
      productId: 123
    };

    const payload: MessagePayload = {
      data: { foo: 'foo', bar: 'bar', baz: 'baz' },
      from: 'from',
      collapseKey: 'collapse',
      messageId: 'mid'
    };
    expect(externalizePayload(internalPayload)).to.deep.equal(payload);
  });

  it('externalizes internalMessage with all three payloads', () => {
    const internalPayload: MessagePayloadInternal = {
      notification: {
        title: 'title',
        body: 'body',
        image: 'image',
        icon: 'icon'
      },
      data: {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz'
      },
      fcmOptions: {
        link: 'https://www.self_orgin.com',
        // eslint-disable-next-line camelcase
        analytics_label: 'label'
      },
      from: 'from',
      // eslint-disable-next-line camelcase
      collapse_key: 'collapse',
      // eslint-disable-next-line camelcase
      fcmMessageId: 'mid',
      // eslint-disable-next-line camelcase
      productId: 123
    };

    const payload: MessagePayload = {
      notification: {
        title: 'title',
        body: 'body',
        image: 'image',
        icon: 'icon'
      },
      data: {
        foo: 'foo',
        bar: 'bar',
        baz: 'baz'
      },
      fcmOptions: {
        link: 'https://www.self_orgin.com',
        analyticsLabel: 'label'
      },
      from: 'from',
      collapseKey: 'collapse',
      messageId: 'mid'
    };
    expect(externalizePayload(internalPayload)).to.deep.equal(payload);
  });
});
