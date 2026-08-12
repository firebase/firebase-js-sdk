export class Child {
  run<T extends string>(item: T): Promise<T>;
}
