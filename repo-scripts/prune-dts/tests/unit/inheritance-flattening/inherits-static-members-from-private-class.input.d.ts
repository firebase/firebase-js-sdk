class Base {
  static create(): Base;
  static version: string;
  instanceProp: number;
}
export class Child extends Base {}
