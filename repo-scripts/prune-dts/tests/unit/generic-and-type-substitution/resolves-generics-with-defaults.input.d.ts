class PrivateBase<T = string> {
  data: T;
}
export class PublicChild extends PrivateBase {}
