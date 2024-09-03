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

import { expect, use } from 'chai';
import sinonChai from 'sinon-chai';
import { ObjectSchema, Schema } from './schema-builder';

use(sinonChai);

describe.only('request formatting methods', () => {
  it('builds string schema', () => {
    const schema = Schema.createString({ description: 'hey' });
    expect(schema.toJSON().type).to.equal('string');
    expect(schema.toJSON().description).to.equal('hey');
  });
  it('builds layered schema', () => {
    const schema = Schema.createArray({
      items: Schema.createObject({
        properties: {
          name: Schema.createString({})
        }
      })
    });
    expect(schema.toJSON().type).to.equal('array');
    expect((schema.toJSON().items as Schema).type).to.equal('object');
    expect(
      ((schema.toJSON().items as ObjectSchema).properties.name as Schema).type
    ).to.equal('string');
  });
});
