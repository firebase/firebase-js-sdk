export class TransactionResult {
  /**
   * A type for the resolve value of Firebase.transaction.
   * @constructor
   * @dict
   * @param {boolean} committed
   * @param {fb.api.DataSnapshot} snapshot
   */
  constructor(committed, snapshot) {
    /**
    * @type {boolean}
    */
    this['committed'] = committed;
    /**
    * @type {fb.api.DataSnapshot}
    */
    this['snapshot'] = snapshot;
  }
}