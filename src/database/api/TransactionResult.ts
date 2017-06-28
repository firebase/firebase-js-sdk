export class TransactionResult {
  /**
   * A type for the resolve value of Firebase.transaction.
   * @constructor
   * @dict
   * @param {boolean} committed
   * @param {fb.api.DataSnapshot} snapshot
   */
  constructor(public committed, public snapshot) {}
}