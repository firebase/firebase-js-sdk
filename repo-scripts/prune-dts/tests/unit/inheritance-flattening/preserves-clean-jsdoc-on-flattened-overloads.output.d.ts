export class PublicChild {
  /**
   * Executes the calculation.
   * @param x - Number argument.
   */
  calc(x: number): PublicChild;
  /**
   * Executes the calculation.
   * @param x - String argument.
   */
  calc(x: string): PublicChild;
}
