class PrivateBase {
  foo(): void;
  bar(): string;
}
export class PublicChild extends PrivateBase {
  foo(): void;
}
