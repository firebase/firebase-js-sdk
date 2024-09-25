import { DocumentData } from './reference';
import { QueryDocumentSnapshot } from './snapshot';
import { VectorQuery } from './vector_query';

export class VectorQuerySnapshot<
  AppModelType = DocumentData,
  DbModelType extends DocumentData = DocumentData
> {
  /**
   * The query on which you called {@link getDocs} in order to get this
   * `VectorQuerySnapshot`.
   */
  readonly query: VectorQuery<AppModelType, DbModelType>;

  /** @hideconstructor */
  constructor(
    _query: VectorQuery<AppModelType, DbModelType>,
    readonly _docs: Array<QueryDocumentSnapshot<AppModelType, DbModelType>>
  ) {
    this.query = _query;
  }

  /** An array of all the documents in the `VectorQuerySnapshot`. */
  get docs(): Array<QueryDocumentSnapshot<AppModelType, DbModelType>> {
    return [...this._docs];
  }

  /** The number of documents in the `VectorQuerySnapshot`. */
  get size(): number {
    return this.docs.length;
  }

  /** True if there are no documents in the `VectorQuerySnapshot`. */
  get empty(): boolean {
    return this.docs.length === 0;
  }

  /**
   * Enumerates all of the documents in the `VectorQuerySnapshot`.
   *
   * @param callback - A callback to be called with a `QueryDocumentSnapshot` for
   * each document in the snapshot.
   * @param thisArg - The `this` binding for the callback.
   */
  forEach(
    callback: (
      result: QueryDocumentSnapshot<AppModelType, DbModelType>
    ) => void,
    thisArg?: unknown
  ): void {
    this._docs.forEach(callback, thisArg);
  }
}
