class Base {
  run<T extends string>(item: T): Promise<T>;
}
export class Child extends Base {}
