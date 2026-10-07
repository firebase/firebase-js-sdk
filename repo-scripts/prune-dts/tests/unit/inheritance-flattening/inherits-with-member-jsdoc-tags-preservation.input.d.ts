class Base {
  /**
   * Does work.
   * @param a - arg
   * @returns result
   * @deprecated Use other()
   */
  work(a: string): string;
}
export class Child extends Base {}
