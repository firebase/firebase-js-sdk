import { isPrimitiveArrayEqual } from '../util/array';

/**
 * Represent a vector type in Firestore documents.
 * Create an instance with {@link FieldValue.vector}.
 *
 * @class VectorValue
 */
export class VectorValue {
  private readonly _values: number[];

  /**
   * @private
   * @internal
   */
  constructor(values: number[] | undefined) {
    // Making a copy of the parameter.
    this._values = (values || []).map(n => n);
  }

  /**
   * Returns a copy of the raw number array form of the vector.
   */
  toArray(): number[] {
    return this._values.map(n => n);
  }

  /**
   * Returns `true` if the two VectorValue has the same raw number arrays, returns `false` otherwise.
   */
  isEqual(other: VectorValue): boolean {
    return isPrimitiveArrayEqual(this._values, other._values);
  }
}
