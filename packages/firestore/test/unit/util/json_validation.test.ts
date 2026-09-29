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

import { property, validateJSON } from '../../../src/util/json_validation';

describe('JSON Validation', () => {
  it('validates property constructor helper correctly', () => {
    const prop = property('string', 'hello');
    expect(prop.typeString).to.equal('string');
    expect(prop.value).to.equal('hello');
    expect(prop.optional).to.be.undefined;
  });

  it('validates standard required fields schema', () => {
    const schema = {
      requiredStr: property('string'),
      requiredNum: property('number'),
      requiredBool: property('boolean')
    };

    const validObj = {
      requiredStr: 'text',
      requiredNum: 42,
      requiredBool: true
    };
    expect(validateJSON(validObj, schema)).to.be.true;

    // Missing string property
    expect(() => {
      validateJSON(
        {
          requiredNum: 42,
          requiredBool: true
        },
        schema
      );
    }).to.throw("JSON missing required field: 'requiredStr'");

    // Wrong type for number property
    expect(() => {
      validateJSON(
        {
          requiredStr: 'text',
          requiredNum: 'not a number',
          requiredBool: true
        },
        schema
      );
    }).to.throw("JSON field 'requiredNum' must be a number.");
  });

  it('validates exact property values', () => {
    const schema = {
      exactVersion: property('string', 'v1.0')
    };

    expect(validateJSON({ exactVersion: 'v1.0' }, schema)).to.be.true;

    expect(() => {
      validateJSON({ exactVersion: 'v2.0' }, schema);
    }).to.throw("Expected 'exactVersion' field to equal 'v1.0'");
  });

  it('validates optional fields in schema', () => {
    const schema = {
      requiredField: property('string'),
      optionalField: { ...property('number'), optional: true }
    };

    // Both provided
    expect(
      validateJSON(
        {
          requiredField: 'value',
          optionalField: 123
        },
        schema
      )
    ).to.be.true;

    // Optional omitted
    expect(
      validateJSON(
        {
          requiredField: 'value'
        },
        schema
      )
    ).to.be.true;

    // Optional provided but incorrect type
    expect(() => {
      validateJSON(
        {
          requiredField: 'value',
          optionalField: 'not a number'
        },
        schema
      );
    }).to.throw("JSON field 'optionalField' must be a number.");
  });
});
