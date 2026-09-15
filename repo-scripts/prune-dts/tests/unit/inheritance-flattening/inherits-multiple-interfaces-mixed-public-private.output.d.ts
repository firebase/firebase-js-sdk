export interface PublicIface1 {
  a: string;
}
export interface PublicIface2 {
  b: string;
}

export class MyClass implements PublicIface1, PublicIface2 {
  c: number;
}
