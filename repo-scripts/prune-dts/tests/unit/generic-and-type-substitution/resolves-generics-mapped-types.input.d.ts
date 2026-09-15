class PrivateDict<K extends string | number, V> {
  toObject(): Record<K, V>;
}
export class PublicDict extends PrivateDict<string, boolean> {}
