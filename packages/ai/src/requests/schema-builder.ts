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

import { AIError } from '../errors';
import { AIErrorCode } from '../types';
import {
  SchemaInterface,
  SchemaType,
  SchemaParams,
  SchemaRequest
} from '../types/schema';

/**
 * Parent class encompassing all Schema types, with static methods that
 * allow building specific Schema types. This class can be converted with
 * `JSON.stringify()` into a JSON string accepted by Vertex AI REST endpoints.
 * (This string conversion is automatically done when calling SDK methods.)
 * @public
 */
export abstract class Schema implements SchemaInterface {
  /**
   * Optional. The type of the property.
   * This can only be undefined when using `anyOf` schemas, which do not have an
   * explicit type in the {@link https://swagger.io/docs/specification/v3_0/data-models/data-types/#any-type | OpenAPI specification}.
   */
  type?: SchemaType;
  /** Optional. The format of the property.
   * Supported formats:<br/>
   * <ul>
   *  <li>for NUMBER type: "float", "double"</li>
   *  <li>for INTEGER type: "int32", "int64"</li>
   *  <li>for STRING type: "email", "byte", etc</li>
   * </ul>
   */
  format?: string;
  /** Optional. The description of the property. */
  description?: string;
  /** Optional. The items of the property. */
  items?: SchemaInterface;
  /** The minimum number of items (elements) in a schema of {@link (SchemaType:type)} `array`. */
  minItems?: number;
  /** The maximum number of items (elements) in a schema of {@link (SchemaType:type)} `array`. */
  maxItems?: number;
  /** Optional. Whether the property is nullable. Defaults to false. */
  nullable: boolean;
  /** Optional. The example of the property. */
  example?: unknown;
  /**
   * Allows user to add other schema properties that have not yet
   * been officially added to the SDK.
   */
  [key: string]: unknown;

  constructor(schemaParams: SchemaInterface) {
    // TODO(dlarocque): Enforce this with union types
    if (!schemaParams.type && !schemaParams.anyOf) {
      throw new AIError(
        AIErrorCode.INVALID_SCHEMA,
        "A schema must have either a 'type' or an 'anyOf' array of sub-schemas."
      );
    }
    // eslint-disable-next-line guard-for-in
    for (const paramKey in schemaParams) {
      this[paramKey] = schemaParams[paramKey];
    }
    // Ensure these are explicitly set to avoid TS errors.
    this.type = schemaParams.type;
    this.format = schemaParams.hasOwnProperty('format')
      ? schemaParams.format
      : undefined;
    this.nullable = schemaParams.hasOwnProperty('nullable')
      ? !!schemaParams.nullable
      : false;
  }

  /**
   * Defines how this Schema should be serialized as JSON.
   * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior
   * @internal
   */
  toJSON(): SchemaRequest {
    const obj: { type?: SchemaType; [key: string]: unknown } = {
      type: this.type
    };
    for (const prop in this) {
      if (this.hasOwnProperty(prop) && this[prop] !== undefined) {
        if (prop !== 'required' || this.type === SchemaType.OBJECT) {
          obj[prop] = this[prop];
        }
      }
    }
    return obj as SchemaRequest;
  }

  static array(arrayParams: SchemaParams & { items: Schema }): ArraySchema {
    return new ArraySchema(arrayParams, arrayParams.items);
  }

  static object(
    objectParams: SchemaParams & {
      properties: {
        [k: string]: Schema;
      };
      optionalProperties?: string[];
    }
  ): ObjectSchema {
    return new ObjectSchema(
      objectParams,
      objectParams.properties,
      objectParams.optionalProperties
    );
  }

  // eslint-disable-next-line id-blacklist
  static string(stringParams?: SchemaParams): StringSchema {
    return new StringSchema(stringParams);
  }

  static enumString(
    stringParams: SchemaParams & { enum: string[] }
  ): StringSchema {
    return new StringSchema(stringParams, stringParams.enum);
  }

  static integer(integerParams?: SchemaParams): IntegerSchema {
    return new IntegerSchema(integerParams);
  }

  // eslint-disable-next-line id-blacklist
  static number(numberParams?: SchemaParams): NumberSchema {
    return new NumberSchema(numberParams);
  }

  // eslint-disable-next-line id-blacklist
  static boolean(booleanParams?: SchemaParams): BooleanSchema {
    return new BooleanSchema(booleanParams);
  }

  static anyOf(
    anyOfParams: SchemaParams & { anyOf: TypedSchema[] }
  ): AnyOfSchema {
    return new AnyOfSchema(anyOfParams);
  }
}

/**
 * A type that includes all specific Schema types.
 * @public
 */
export type TypedSchema =
  | IntegerSchema
  | NumberSchema
  | StringSchema
  | BooleanSchema
  | ObjectSchema
  | ArraySchema
  | AnyOfSchema;

/**
 * Schema class for "integer" types.
 * @public
 */
export class IntegerSchema extends Schema {
  constructor(schemaParams?: SchemaParams) {
    super({
      type: SchemaType.INTEGER,
      ...schemaParams
    });
  }
}

/**
 * Schema class for "number" types.
 * @public
 */
export class NumberSchema extends Schema {
  constructor(schemaParams?: SchemaParams) {
    super({
      type: SchemaType.NUMBER,
      ...schemaParams
    });
  }
}

/**
 * Schema class for "boolean" types.
 * @public
 */
export class BooleanSchema extends Schema {
  constructor(schemaParams?: SchemaParams) {
    super({
      type: SchemaType.BOOLEAN,
      ...schemaParams
    });
  }
}

/**
 * Schema class for "string" types. Can be used with or without
 * enum values.
 * @public
 */
export class StringSchema extends Schema {
  enum?: string[];
  constructor(schemaParams?: SchemaParams, enumValues?: string[]) {
    super({
      type: SchemaType.STRING,
      ...schemaParams
    });
    this.enum = enumValues;
  }

  /**
   * @internal
   */
  toJSON(): SchemaRequest {
    const obj = super.toJSON();
    if (this.enum) {
      obj['enum'] = this.enum;
    }
    return obj as SchemaRequest;
  }
}

/**
 * Schema class for "array" types.
 * The `items` param should refer to the type of item that can be a member
 * of the array.
 * @public
 */
export class ArraySchema extends Schema {
  constructor(schemaParams: SchemaParams, public items: TypedSchema) {
    super({
      type: SchemaType.ARRAY,
      ...schemaParams
    });
  }

  /**
   * @internal
   */
  toJSON(): SchemaRequest {
    const obj = super.toJSON();
    obj.items = this.items.toJSON();
    return obj;
  }
}

/**
 * Schema class for "object" types.
 * The `properties` param must be a map of `Schema` objects.
 * @public
 */
export class ObjectSchema extends Schema {
  constructor(
    schemaParams: SchemaParams,
    public properties: {
      [k: string]: TypedSchema;
    },
    public optionalProperties: string[] = []
  ) {
    super({
      type: SchemaType.OBJECT,
      ...schemaParams
    });
  }

  /**
   * @internal
   */
  toJSON(): SchemaRequest {
    const obj = super.toJSON();
    obj.properties = { ...this.properties };
    const required = [];
    if (this.optionalProperties) {
      for (const propertyKey of this.optionalProperties) {
        if (!this.properties.hasOwnProperty(propertyKey)) {
          throw new AIError(
            AIErrorCode.INVALID_SCHEMA,
            `Property "${propertyKey}" specified in "optionalProperties" does not exist.`
          );
        }
      }
    }
    for (const propertyKey in this.properties) {
      if (this.properties.hasOwnProperty(propertyKey)) {
        obj.properties[propertyKey] = this.properties[
          propertyKey
        ].toJSON() as SchemaRequest;
        if (!this.optionalProperties.includes(propertyKey)) {
          required.push(propertyKey);
        }
      }
    }
    if (required.length > 0) {
      obj.required = required;
    }
    delete obj.optionalProperties;
    return obj as SchemaRequest;
  }
}

/**
 * Schema class representing a value that can conform to any of the provided sub-schemas. This is
 * useful when a field can accept multiple distinct types or structures.
 * @public
 */
export class AnyOfSchema extends Schema {
  anyOf: TypedSchema[]; // Re-define field to narrow to required type
  constructor(schemaParams: SchemaParams & { anyOf: TypedSchema[] }) {
    if (schemaParams.anyOf.length === 0) {
      throw new AIError(
        AIErrorCode.INVALID_SCHEMA,
        "The 'anyOf' array must not be empty."
      );
    }
    super({
      ...schemaParams,
      type: undefined // anyOf schemas do not have an explicit type
    });
    this.anyOf = schemaParams.anyOf;
  }

  /**
   * @internal
   */
  toJSON(): SchemaRequest {
    const obj = super.toJSON();
    // Ensure the 'anyOf' property contains serialized SchemaRequest objects.
    if (this.anyOf && Array.isArray(this.anyOf)) {
      obj.anyOf = (this.anyOf as TypedSchema[]).map(s => s.toJSON());
    }
    return obj;
  }
}
