interface PrivateInterface {
  parentField: boolean;
}
export interface PublicInterface extends PrivateInterface {
  childField: string;
}
