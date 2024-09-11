import { VertexAIError } from '../errors';
import { VertexAIErrorCode } from '../types';
import {
  SchemaInterface,
  SchemaType,
  SchemaParams,
  _SchemaRequest,
  ObjectSchemaInterface
} from '../types/schema';

/**
 * Parent class encompassing all Schema types, with static methods that
 * allow building specific Schema types. This class can be converted with
 * JSON.stringify() into a JSON string accepted by Vertex REST endpoints.
 * (This string conversion is automatically done when calling SDK methods.)
 * @public
 */
export abstract class Schema implements SchemaInterface {
  /**
   * Optional. The type of the property. {@link
   * SchemaType}.
   */
  type: SchemaType;
  /** Optional. The format of the property.
   * Supported formats:
   *  for NUMBER type: "float", "double"
   *  for INTEGER type: "int32", "int64"
   *  for STRING type: "email", "byte", etc
   */
  format?: string;
  /** Optional. The description of the property. */
  description?: string;
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
    // eslint-disable-next-line guard-for-in
    for (const paramKey in schemaParams) {
      this[paramKey] = schemaParams[paramKey];
    }
    // Ensure these are explicitly set to avoid TS errors.
    this.type = schemaParams.type;
    this.nullable = schemaParams.hasOwnProperty('nullable')
      ? !!schemaParams.nullable
      : false;
  }

  /**
   * Converts class to a plain JSON object (not a string).
   * @internal
   */
  _toRequest(): _SchemaRequest {
    const obj: { type: SchemaType; [key: string]: unknown } = {
      type: this.type
    };
    for (const prop in this) {
      if (this.hasOwnProperty(prop) && this[prop] !== undefined) {
        if (prop !== 'required' || this.type === SchemaType.OBJECT) {
          obj[prop] = this[prop];
        }
      }
    }
    return obj as _SchemaRequest;
  }

  toJSON(): string {
    return JSON.stringify(this._toRequest());
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

  static functionDeclaration(
    objectParams: SchemaParams & {
      properties: {
        [k: string]: Schema;
      };
      optionalProperties?: string[];
    }
  ): ObjectSchema {
    return this.object(objectParams);
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
  | ArraySchema;

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
  _toRequest(): _SchemaRequest {
    const obj = super._toRequest();
    if (this.enum) {
      obj['enum'] = this.enum;
    }
    return obj as _SchemaRequest;
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
  _toRequest(): _SchemaRequest {
    const obj = super._toRequest();
    obj.items = this.items._toRequest();
    return obj;
  }
}

/**
 * Schema class for "object" types.
 * The `properties` param must be a map of Schema.
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
  _toRequest(): _SchemaRequest {
    const obj = super._toRequest();
    obj.properties = this.properties;
    const required = [];
    if (this.optionalProperties) {
      for (const propertyKey of this.optionalProperties) {
        if (!this.properties.hasOwnProperty(propertyKey)) {
          throw new VertexAIError(
            VertexAIErrorCode.INVALID_SCHEMA,
            `Property "${propertyKey}" specified in "optionalProperties" does not exist.`
          );
        }
      }
    }
    for (const propertyKey in this.properties) {
      if (this.properties.hasOwnProperty(propertyKey)) {
        obj.properties[propertyKey] = this.properties[
          propertyKey
        ]._toRequest() as _SchemaRequest;
        if (!this.optionalProperties.includes(propertyKey)) {
          required.push(propertyKey);
        }
      }
    }
    if (required.length > 0) {
      obj.required = required;
    }
    delete (obj as ObjectSchemaInterface).optionalProperties;
    return obj as _SchemaRequest;
  }
}
