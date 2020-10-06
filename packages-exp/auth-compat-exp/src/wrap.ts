export interface Wrapper<T> {
  unwrap(): T;
}

export function unwrap<T>(object: unknown): T {
  return (object as Wrapper<T>).unwrap();
}