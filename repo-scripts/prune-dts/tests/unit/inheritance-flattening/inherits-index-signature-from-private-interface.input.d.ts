interface PrivateMap {
  [key: string]: any;
  foo: string;
}
export interface PublicMap extends PrivateMap {}
