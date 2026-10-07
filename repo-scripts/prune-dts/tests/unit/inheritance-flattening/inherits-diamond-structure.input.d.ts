interface PrivateBase {
  id: string;
}
interface PrivateLeft extends PrivateBase {
  left: number;
}
interface PrivateRight extends PrivateBase {
  right: boolean;
}
export interface PublicTop extends PrivateLeft, PrivateRight {}
