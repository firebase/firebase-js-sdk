class PrivateBase {
  baseProp: string;
  baseMethod(): void;
}
export class PublicChild extends PrivateBase {
  childProp: number;
}
