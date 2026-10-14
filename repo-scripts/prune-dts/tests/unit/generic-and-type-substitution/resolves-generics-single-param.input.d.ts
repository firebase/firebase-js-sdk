class PrivateBase<T> {
  value: T;
  getValue(): T;
}
export class PublicChild extends PrivateBase<string> {}
