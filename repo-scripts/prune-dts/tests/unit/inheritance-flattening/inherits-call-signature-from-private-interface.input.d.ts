interface PrivateCallable {
  (x: string): boolean;
  name: string;
}
export interface PublicCallable extends PrivateCallable {}
