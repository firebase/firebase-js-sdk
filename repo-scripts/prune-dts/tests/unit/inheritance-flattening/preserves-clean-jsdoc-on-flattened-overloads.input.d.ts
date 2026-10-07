class PrivateBase {
  /**
   * Executes the calculation.
   * @param x - Number argument.
   */
  calc(x: number): PrivateBase;
  /**
   * Executes the calculation.
   * @param x - String argument.
   */
  calc(x: string): PrivateBase;
}

export class PublicChild extends PrivateBase {}
