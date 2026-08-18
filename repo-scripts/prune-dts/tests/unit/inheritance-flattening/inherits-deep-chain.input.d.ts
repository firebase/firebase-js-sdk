class PrivateRoot {
  rootVal: string;
}
class PrivateMiddle extends PrivateRoot {
  midVal: number;
}
export class PublicLeaf extends PrivateMiddle {
  leafVal: boolean;
}
