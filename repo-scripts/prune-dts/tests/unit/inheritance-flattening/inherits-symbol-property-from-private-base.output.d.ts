export class Child {
  [Symbol.iterator](): Iterator<string>;
  [Symbol.toStringTag]: string;
}
