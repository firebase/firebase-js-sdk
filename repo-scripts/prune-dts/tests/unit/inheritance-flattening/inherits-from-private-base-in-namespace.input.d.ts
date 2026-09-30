export namespace Outer {
  class Internal {
    x: number;
  }
  export class PublicChild extends Internal {}
}
