export interface PublicIface1 {
  a: string;
}
export interface PublicIface2 {
  b: string;
}
interface PrivateIface {
  c: number;
}
export class MyClass implements PublicIface1, PrivateIface, PublicIface2 {}
