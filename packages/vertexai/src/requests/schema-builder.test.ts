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
import { Schema } from './schema-builder';

use(sinonChai);

describe.only('Schema builder', () => {
  it('builds integer schema', () => {
    const schema = Schema.integer();
    expect(schema.toJSON()).to.eql({
      type: 'integer',
      nullable: false
    });
  });
  it('builds number schema', () => {
    const schema = Schema.number();
    expect(schema.toJSON()).to.eql({
      type: 'number',
      nullable: false
    });
  });
  it('builds boolean schema', () => {
    const schema = Schema.boolean();
    expect(schema.toJSON()).to.eql({
      type: 'boolean',
      nullable: false
    });
  });
  it('builds string schema', () => {
    const schema = Schema.string({ description: 'hey' });
    expect(schema.toJSON()).to.eql({
      type: 'string',
      description: 'hey',
      nullable: false
    });
  });
  it('builds enumString schema', () => {
    const schema = Schema.enumString({
      example: 'east',
      enum: ['east', 'west']
    });
    expect(schema.toJSON()).to.eql({
      type: 'string',
      example: 'east',
      enum: ['east', 'west'],
      nullable: false
    });
  });
  it('builds functionDeclaration schema', () => {
    const schema = Schema.functionDeclaration({
      properties: {
        'someInput': Schema.string()
      }
    });
    expect(schema.toJSON()).to.eql({
      type: 'object',
      nullable: false,
      properties: {
        'someInput': {
          type: 'string',
          nullable: false
        }
      },
      required: ['someInput']
    });
  });
  it('builds layered schema', () => {
    const schema = Schema.array({
      items: Schema.object({
        properties: {
          country: Schema.string({
            description: 'some country',
            required: true
          }),
          population: Schema.integer(),
          coordinates: Schema.object({
            properties: {
              latitude: Schema.number({ format: 'float' }),
              longitude: Schema.number({ format: 'double' })
            }
          }),
          hemisphere: Schema.object({
            properties: {
              latitudinal: Schema.enumString({ enum: ['N', 'S'] }),
              longitudinal: Schema.enumString({ enum: ['E', 'W'] })
            }
          }),
          isCapital: Schema.boolean()
        }
      })
    });

    expect(schema.toJSON()).to.eql(layeredSchemaOutput);
  });
  it('can override the "required" and "nullable" properties', () => {
    const schema = Schema.object({
      properties: {
        country: Schema.string(),
        elevation: Schema.number({ required: false }),
        population: Schema.integer({ nullable: true })
      }
    });
    expect(schema.toJSON()).to.eql({
      'type': 'object',
      'nullable': false,
      'properties': {
        'country': {
          'type': 'string',
          'nullable': false
        },
        'elevation': {
          'type': 'number',
          'nullable': false
        },
        'population': {
          'type': 'integer',
          'nullable': true
        }
      },
      'required': ['country', 'population']
    });
  });
});

const layeredSchemaOutput = {
  'type': 'array',
  'nullable': false,
  'items': {
    'type': 'object',
    'nullable': false,
    'properties': {
      'country': {
        'type': 'string',
        'description': 'some country',
        'nullable': false
      },
      'population': {
        'type': 'integer',
        'nullable': false
      },
      'coordinates': {
        'type': 'object',
        'nullable': false,
        'properties': {
          'latitude': {
            'type': 'number',
            'format': 'float',
            'nullable': false
          },
          'longitude': {
            'type': 'number',
            'format': 'double',
            'nullable': false
          }
        },
        'required': ['latitude', 'longitude']
      },
      'hemisphere': {
        'type': 'object',
        'nullable': false,
        'properties': {
          'latitudinal': {
            'type': 'string',
            'nullable': false,
            'enum': ['N', 'S']
          },
          'longitudinal': {
            'type': 'string',
            'nullable': false,
            'enum': ['E', 'W']
          }
        },
        'required': ['latitudinal', 'longitudinal']
      },
      'isCapital': {
        'type': 'boolean',
        'nullable': false
      }
    },
    'required': [
      'country',
      'population',
      'coordinates',
      'hemisphere',
      'isCapital'
    ]
  }
};
