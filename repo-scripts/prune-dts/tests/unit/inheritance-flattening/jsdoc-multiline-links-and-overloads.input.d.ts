class PrivateBase {
  /**
   * Fetches reference. See {@link
   * DocumentReference} for details.
   * @param id - The target ID.
   */
  fetch(id: string): void;
  /** Overload for number ID. */
  fetch(id: number): void;
}
export class PublicChild extends PrivateBase {}
