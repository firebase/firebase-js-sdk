import {
  SchemaInterface,
  SchemaType,
  SchemaParams,
  _SchemaRequest
} from '../types/schema';

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
  /** Optional. Defaults to true. */
  required: boolean;
  /** Optional. The example of the property. */
  example?: unknown;

  constructor(schemaParams: SchemaInterface) {
    this.type = schemaParams.type;
    this.format = schemaParams?.format;
    this.description = schemaParams?.description;
    this.example = schemaParams?.example;
    this.nullable = schemaParams.hasOwnProperty('nullable')
      ? !!schemaParams.nullable
      : false;
    this.required = schemaParams.hasOwnProperty('required')
      ? !!schemaParams.required
      : true;
  }

  /** Converts class to a plain JSON object (not a string). */
  toJSON(): _SchemaRequest {
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

  static array(arrayParams: SchemaParams & { items: Schema }): ArraySchema {
    return new ArraySchema(arrayParams, arrayParams.items);
  }

  static object(
    objectParams: SchemaParams & {
      properties: {
        [k: string]: Schema;
      };
    }
  ): ObjectSchema {
    return new ObjectSchema(objectParams, objectParams.properties);
  }

  static functionDeclaration(
    objectParams: SchemaParams & {
      properties: {
        [k: string]: Schema;
      };
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

export type TypedSchema =
  | IntegerSchema
  | NumberSchema
  | StringSchema
  | BooleanSchema
  | ObjectSchema
  | ArraySchema;

export class IntegerSchema extends Schema {
  constructor(schemaParams?: SchemaParams) {
    super({
      type: SchemaType.INTEGER,
      ...schemaParams
    });
  }
}
export class NumberSchema extends Schema {
  constructor(schemaParams?: SchemaParams) {
    super({
      type: SchemaType.NUMBER,
      ...schemaParams
    });
  }
}
export class BooleanSchema extends Schema {
  constructor(schemaParams?: SchemaParams) {
    super({
      type: SchemaType.BOOLEAN,
      ...schemaParams
    });
  }
}

export class StringSchema extends Schema {
  enum?: string[];
  constructor(schemaParams?: SchemaParams, enumValues?: string[]) {
    super({
      type: SchemaType.STRING,
      ...schemaParams
    });
    this.enum = enumValues;
  }

  toJSON(): _SchemaRequest {
    const obj = super.toJSON();
    if (this.enum) {
      obj['enum'] = this.enum;
    }
    return obj as _SchemaRequest;
  }
}

export class ArraySchema extends Schema {
  constructor(schemaParams: SchemaParams, public items: TypedSchema) {
    super({
      type: SchemaType.ARRAY,
      ...schemaParams
    });
  }

  toJSON(): _SchemaRequest {
    const obj = super.toJSON();
    obj.items = this.items.toJSON();
    return obj;
  }
}

export class ObjectSchema extends Schema {
  constructor(
    schemaParams: SchemaParams,
    public properties: {
      [k: string]: TypedSchema;
    }
  ) {
    super({
      type: SchemaType.OBJECT,
      ...schemaParams
    });
  }

  toJSON(): _SchemaRequest {
    const obj = super.toJSON();
    const properties: Record<string, _SchemaRequest> = {};
    const required = [];
    for (const propertyKey in this.properties) {
      if (this.properties.hasOwnProperty(propertyKey)) {
        properties[propertyKey] = this.properties[
          propertyKey
        ].toJSON() as _SchemaRequest;
        if (this.properties[propertyKey].required) {
          required.push(propertyKey);
        }
      }
    }
    obj.properties = properties;
    if (required.length > 0) {
      obj.required = required;
    }
    return obj as _SchemaRequest;
  }
}
