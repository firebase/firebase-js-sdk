
/**
 * Contains the list of OpenAPI data types
 * as defined by https://swagger.io/docs/specification/data-models/data-types/
 * @public
 */
export enum SchemaType {
  /** String type. */
  STRING = "string",
  /** Number type. */
  NUMBER = "number",
  /** Integer type. */
  INTEGER = "integer",
  /** Boolean type. */
  BOOLEAN = "boolean",
  /** Array type. */
  ARRAY = "array",
  /** Object type. */
  OBJECT = "object",
}

interface SchemaShared<T> {
  /** Optional. The format of the property. */
  format?: string;
  /** Optional. The description of the property. */
  description?: string;
  /** Optional. The items of the property. */
  items?: T;
  /** Optional. Map of Schemas. */
  properties?: {
    [k: string]: T;
  };
  /** Optional. The enum of the property. */
  enum?: string[];
  /** Optional. The example of the property. */
  example?: unknown;
  /** Optional. Whether the property is nullable. */
  nullable?: boolean;
}

/**
 * User-facing params passed to specific Schema static methods.
 */
export interface SchemaParams extends SchemaShared<SchemaInterface> {
  /** Optional. Array of required property. */
  required?: boolean;
}

/**
 * Final format for Schema params passed to backend requests.
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface _SchemaRequest extends SchemaShared<_SchemaRequest> {
  /**
   * The type of the property. {@link
   * SchemaType}.
   */
  type: SchemaType;
  /** Optional. Array of required property. */
  required?: string[];
}

/**
 * Interface for Schema class.
 */
export interface SchemaInterface extends SchemaParams {
  /**
   * The type of the property. {@link
   * SchemaType}.
   */
  type: SchemaType;
}

export interface ObjectSchemaInterface extends SchemaInterface {
  type: SchemaType.OBJECT;
}
