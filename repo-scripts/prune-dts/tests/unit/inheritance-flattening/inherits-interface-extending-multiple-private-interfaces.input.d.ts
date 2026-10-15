interface PrivateA {
  a: string;
}
interface PrivateB {
  b: number;
}
export interface PublicC {
  c: boolean;
}
export interface MultiChild extends PrivateA, PrivateB, PublicC {}
