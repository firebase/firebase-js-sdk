class PrivateBase<T> {
  process(val: T): T;
}
export class PublicChild extends PrivateBase<string> {}
