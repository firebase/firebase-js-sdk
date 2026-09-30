class PrivateMap<K, V> {
  get(key: K): V;
  set(key: K, val: V): void;
}
export class PublicMap extends PrivateMap<string, number> {}
