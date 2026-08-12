interface PrivateConstructor {
  new (x: number): any;
  tag: string;
}
export interface PublicFactory extends PrivateConstructor {}
