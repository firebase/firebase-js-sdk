interface PrivateA {
  propA: string;
}
interface PrivateB {
  propB: number;
}
export interface PublicCombined extends PrivateA, PrivateB {
  propC: boolean;
}
