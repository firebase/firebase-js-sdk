class PrivateBase {
  process(other: PrivateBase): PrivateBase;
  compute(count: number): PrivateBase;
}

export class PublicChild extends PrivateBase {
  run(): PublicChild;
}
