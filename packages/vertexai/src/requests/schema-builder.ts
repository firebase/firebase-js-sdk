import { SchemaInterface, SchemaType, SchemaParams } from '../types/schema';

export class Schema implements SchemaInterface {
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
  /** Optional. Whether the property is nullable. */
  nullable: boolean;
  /** Optional. Array of required property. */
  required: boolean;
  /** Optional. The example of the property. */
  example?: unknown;

  constructor(schemaParams: SchemaInterface) {
    this.type = schemaParams.type;
    this.format = schemaParams?.format;
    this.description = schemaParams?.description;
    this.example = schemaParams?.example;
    this.nullable = schemaParams?.nullable || false;
    this.required = schemaParams?.required || true;
  }

  toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const prop in this) {
      if (this.hasOwnProperty(prop) && this[prop] !== undefined) {
        obj[prop] = this[prop];
      }
    }
    return obj;
  }

  static createArray(
    arrayParams: SchemaParams & { items: Schema }
  ): ArraySchema {
    return new ArraySchema(arrayParams, arrayParams.items);
  }

  static createObject(
    objectParams: SchemaParams & {
      properties: {
        [k: string]: Schema;
      };
    }
  ): ObjectSchema {
    return new ObjectSchema(objectParams, objectParams.properties);
  }

  static createString(stringParams: SchemaParams): StringSchema {
    return new StringSchema(stringParams);
  }

  static createEnumString(
    stringParams: SchemaParams & { enumValues: string[] }
  ): StringSchema {
    return new StringSchema(stringParams, stringParams.enumValues);
  }

  static createInteger(integerParams?: SchemaParams): IntegerSchema {
    return new IntegerSchema(integerParams);
  }

  static createNumber(numberParams?: SchemaParams): NumberSchema {
    return new NumberSchema(numberParams);
  }

  static createBoolean(booleanParams?: SchemaParams): BooleanSchema {
    return new BooleanSchema(booleanParams);
  }
}

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
  constructor(schemaParams?: SchemaParams, public enumValues?: string[]) {
    super({
      type: SchemaType.STRING,
      ...schemaParams
    });
  }
}

export class ArraySchema extends Schema {
  constructor(schemaParams: SchemaParams, public items: Schema) {
    super({
      type: SchemaType.ARRAY,
      ...schemaParams
    });
  }

  toJSON(): Record<string, unknown> {
    const obj = super.toJSON();
    obj.items = this.items.toJSON();
    return obj;
  }
}

export class ObjectSchema extends Schema {
  constructor(
    schemaParams: SchemaParams,
    public properties: {
      [k: string]: Schema;
    }
  ) {
    super({
      type: SchemaType.OBJECT,
      ...schemaParams
    });
  }

  toJSON(): Record<string, unknown> {
    const obj = super.toJSON();
    const properties: Record<string, unknown> = {};
    for (const property in this.properties) {
      if (this.properties.hasOwnProperty(property)) {
        properties[property] = this.properties[property].toJSON();
      }
    }
    obj.properties = properties;
    return obj;
  }
}
