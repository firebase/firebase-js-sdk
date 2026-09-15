type PrivateObj = {
  a: string;
  b: number;
};
export interface Child extends PrivateObj {
  c: boolean;
}
