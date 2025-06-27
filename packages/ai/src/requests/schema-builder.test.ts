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
import { AIErrorCode } from '../types';

use(sinonChai);

describe('Schema builder', () => {
  it('builds integer schema', () => {
    const schema = Schema.integer();
    expect(schema.toJSON()).to.eql({
      type: 'integer',
      nullable: false
    });
  });
  it('builds integer schema with options and overrides', () => {
    const schema = Schema.integer({
      nullable: true,
      format: 'int32',
      title: 'Age',
      minimum: 0,
      maximum: 120
    });
    expect(schema.toJSON()).to.eql({
      type: 'integer',
      format: 'int32',
      nullable: true,
      title: 'Age',
      minimum: 0,
      maximum: 120
    });
  });
  it('builds number schema', () => {
    const schema = Schema.number();
    expect(schema.toJSON()).to.eql({
      type: 'number',
      nullable: false
    });
  });
  it('builds number schema with options and unknown options', () => {
    const schema = Schema.number({
      format: 'float',
      futureOption: 'test',
      title: 'Price',
      minimum: 0.01,
      maximum: 1000.99
    });
    expect(schema.toJSON()).to.eql({
      type: 'number',
      format: 'float',
      futureOption: 'test',
      nullable: false,
      title: 'Price',
      minimum: 0.01,
      maximum: 1000.99
    });
  });
  it('builds boolean schema', () => {
    const schema = Schema.boolean({ title: 'Is Active' });
    expect(schema.toJSON()).to.eql({
      type: 'boolean',
      nullable: false,
      title: 'Is Active'
    });
  });
  it('builds string schema', () => {
    const schema = Schema.string({ description: 'hey', title: 'Greeting' });
    expect(schema.toJSON()).to.eql({
      type: 'string',
      description: 'hey',
      nullable: false,
      title: 'Greeting'
    });
  });
  it('builds enumString schema', () => {
    const schema = Schema.enumString({
      example: 'east',
      enum: ['east', 'west'],
      title: 'Direction'
    });
    expect(schema.toJSON()).to.eql({
      type: 'string',
      example: 'east',
      enum: ['east', 'west'],
      nullable: false,
      title: 'Direction'
    });
  });
  describe('Schema.array', () => {
    it('builds an array schema with basic items', () => {
      const schema = Schema.array({
        items: Schema.string()
      });
      expect(schema.toJSON()).to.eql({
        type: 'array',
        nullable: false,
        items: {
          type: 'string',
          nullable: false
        }
      });
    });

    it('builds an array schema with items and minItems', () => {
      const schema = Schema.array({
        items: Schema.number(),
        minItems: 1
      });
      expect(schema.toJSON()).to.eql({
        type: 'array',
        nullable: false,
        items: {
          type: 'number',
          nullable: false
        },
        minItems: 1
      });
    });

    it('builds an array schema with items and maxItems', () => {
      const schema = Schema.array({
        items: Schema.boolean(),
        maxItems: 10
      });
      expect(schema.toJSON()).to.eql({
        type: 'array',
        nullable: false,
        items: {
          type: 'boolean',
          nullable: false
        },
        maxItems: 10
      });
    });

    it('builds an array schema with items, minItems, and maxItems', () => {
      const schema = Schema.array({
        items: Schema.integer(),
        minItems: 0,
        maxItems: 5
      });
      expect(schema.toJSON()).to.eql({
        type: 'array',
        nullable: false,
        items: {
          type: 'integer',
          nullable: false
        },
        minItems: 0,
        maxItems: 5
      });
    });

    it('builds an array schema with items, minItems, maxItems, and other options', () => {
      const schema = Schema.array({
        items: Schema.string({ description: 'A list of names' }),
        minItems: 1,
        maxItems: 3,
        nullable: true,
        description: 'An array of strings'
      });
      expect(schema.toJSON()).to.eql({
        type: 'array',
        nullable: true,
        description: 'An array of strings',
        items: {
          type: 'string',
          description: 'A list of names',
          nullable: false
        },
        minItems: 1,
        maxItems: 3
      });
    });
  });
  it('builds an object schema', () => {
    const schema = Schema.object({
      properties: {
        'someInput': Schema.string()
      },
      title: 'Input Object'
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
      required: ['someInput'],
      title: 'Input Object'
    });
  });
  it('builds an object schema with optional properties and propertyOrdering', () => {
    const schema = Schema.object({
      properties: {
        'someInput': Schema.string(),
        'someBool': Schema.boolean(),
        'anotherInput': Schema.integer()
      },
      optionalProperties: ['someBool'],
      propertyOrdering: ['someInput', 'anotherInput', 'someBool'],
      title: 'Ordered Object'
    });
    expect(schema.toJSON()).to.eql({
      type: 'object',
      nullable: false,
      properties: {
        'someInput': {
          type: 'string',
          nullable: false
        },
        'someBool': {
          type: 'boolean',
          nullable: false
        },
        'anotherInput': {
          type: 'integer',
          nullable: false
        }
      },
      required: ['someInput', 'anotherInput'],
      propertyOrdering: ['someInput', 'anotherInput', 'someBool'],
      title: 'Ordered Object'
    });
  });
  it('builds layered schema - partially filled out', () => {
    const schema = Schema.array({
      items: Schema.object({
        properties: {
          country: Schema.string({
            description: 'A country name',
            title: 'Country Name'
          }),
          population: Schema.integer({ title: 'Population Count', minimum: 0 }),
          coordinates: Schema.object({
            title: 'Geographical Coordinates',
            properties: {
              latitude: Schema.number({ format: 'float', title: 'Latitude' }),
              longitude: Schema.number({ format: 'double', title: 'Longitude' })
            }
          }),
          hemisphere: Schema.object({
            title: 'Hemisphere Information',
            properties: {
              latitudinal: Schema.enumString({
                enum: ['N', 'S'],
                title: 'Latitudinal Hemisphere'
              }),
              longitudinal: Schema.enumString({
                enum: ['E', 'W'],
                title: 'Longitudinal Hemisphere'
              })
            }
          }),
          isCapital: Schema.boolean({ title: 'Is Capital City' })
        }
      }),
      title: 'List of Countries'
    });
    const jsonSchema = schema.toJSON();
    expect(jsonSchema.title).to.equal('List of Countries');
    expect(jsonSchema.items?.properties?.country.title).to.equal(
      'Country Name'
    );
    expect(jsonSchema.items?.properties?.population.title).to.equal(
      'Population Count'
    );
    expect(jsonSchema.items?.properties?.population.minimum).to.equal(0);
    expect(jsonSchema.items?.properties?.coordinates.title).to.equal(
      'Geographical Coordinates'
    );
    expect(jsonSchema.items?.properties?.hemisphere.title).to.equal(
      'Hemisphere Information'
    );
    expect(jsonSchema.items?.properties?.isCapital.title).to.equal(
      'Is Capital City'
    );
  });
  it('builds layered schema - fully filled out with new properties', () => {
    const schema = Schema.array({
      title: 'Detailed Country Profiles',
      items: Schema.object({
        description: 'A country profile',
        nullable: false,
        title: 'Country Profile',
        propertyOrdering: [
          'country',
          'population',
          'isCapital',
          'elevation',
          'coordinates',
          'hemisphere'
        ],
        properties: {
          country: Schema.string({
            nullable: false,
            description: 'Country name',
            format: undefined,
            title: 'Official Country Name'
          }),
          population: Schema.integer({
            nullable: false,
            description: 'Number of people in country',
            format: 'int64',
            title: 'Total Population',
            minimum: 1
          }),
          coordinates: Schema.object({
            nullable: false,
            description: 'Latitude and longitude',
            title: 'Capital Coordinates',
            properties: {
              latitude: Schema.number({
                nullable: false,
                description: 'Latitude of capital',
                format: 'float',
                title: 'Latitude Value',
                minimum: -90,
                maximum: 90
              }),
              longitude: Schema.number({
                nullable: false,
                description: 'Longitude of capital',
                format: 'double',
                title: 'Longitude Value',
                minimum: -180,
                maximum: 180
              })
            }
          }),
          hemisphere: Schema.object({
            nullable: false,
            description: 'Hemisphere(s) country is in',
            title: 'Geographical Hemispheres',
            properties: {
              latitudinal: Schema.enumString({
                enum: ['N', 'S'],
                title: 'Latitudinal'
              }),
              longitudinal: Schema.enumString({
                enum: ['E', 'W'],
                title: 'Longitudinal'
              })
            }
          }),
          isCapital: Schema.boolean({
            nullable: false,
            description: "This doesn't make a lot of sense but it's a demo",
            title: 'Is it a capital?'
          }),
          elevation: Schema.integer({
            nullable: false,
            description: 'Average elevation in meters',
            format: 'int32',
            title: 'Average Elevation (m)',
            minimum: -500,
            maximum: 9000
          })
        },
        optionalProperties: []
      })
    });

    const jsonResult = schema.toJSON();
    expect(jsonResult.title).to.equal('Detailed Country Profiles');
    expect(jsonResult.items?.title).to.equal('Country Profile');
    expect(jsonResult.items?.propertyOrdering).to.deep.equal([
      'country',
      'population',
      'isCapital',
      'elevation',
      'coordinates',
      'hemisphere'
    ]);
    expect(jsonResult.items?.properties?.population.title).to.equal(
      'Total Population'
    );
    expect(jsonResult.items?.properties?.population.minimum).to.equal(1);
    expect(
      jsonResult.items?.properties?.coordinates.properties?.latitude.maximum
    ).to.equal(90);
    expect(jsonResult.items?.properties?.elevation.title).to.equal(
      'Average Elevation (m)'
    );
    expect(jsonResult.items?.properties?.elevation.minimum).to.equal(-500);
    expect(jsonResult.items?.properties?.elevation.maximum).to.equal(9000);
  });
  it('can override "nullable" and set optional properties', () => {
    const schema = Schema.object({
      properties: {
        country: Schema.string(),
        elevation: Schema.number(),
        population: Schema.integer({ nullable: true })
      },
      optionalProperties: ['elevation']
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
  it('throws if an optionalProperties item does not exist', () => {
    const schema = Schema.object({
      properties: {
        country: Schema.string(),
        elevation: Schema.number(),
        population: Schema.integer({ nullable: true })
      },
      optionalProperties: ['cat']
    });
    expect(() => schema.toJSON()).to.throw(AIErrorCode.INVALID_SCHEMA);
  });
  it('builds schema with minimum and maximum for integer', () => {
    const schema = Schema.integer({ minimum: 5, maximum: 10, title: 'Rating' });
    expect(schema.toJSON()).to.eql({
      type: 'integer',
      nullable: false,
      minimum: 5,
      maximum: 10,
      title: 'Rating'
    });
  });

  it('builds schema with minimum and maximum for number', () => {
    const schema = Schema.number({
      minimum: 1.5,
      maximum: 9.9,
      title: 'Measurement'
    });
    expect(schema.toJSON()).to.eql({
      type: 'number',
      nullable: false,
      minimum: 1.5,
      maximum: 9.9,
      title: 'Measurement'
    });
  });

  it('builds object schema with propertyOrdering', () => {
    const schema = Schema.object({
      title: 'User Data',
      properties: {
        name: Schema.string(),
        age: Schema.integer(),
        email: Schema.string()
      },
      propertyOrdering: ['name', 'email', 'age']
    });
    expect(schema.toJSON()).to.eql({
      type: 'object',
      nullable: false,
      title: 'User Data',
      properties: {
        name: { type: 'string', nullable: false },
        age: { type: 'integer', nullable: false },
        email: { type: 'string', nullable: false }
      },
      required: ['name', 'age', 'email'],
      propertyOrdering: ['name', 'email', 'age']
    });
  });
});
