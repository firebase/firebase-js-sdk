class Base {
  [Symbol.iterator](): Iterator<string>;
  [Symbol.toStringTag]: string;
}
export class Child extends Base {}
