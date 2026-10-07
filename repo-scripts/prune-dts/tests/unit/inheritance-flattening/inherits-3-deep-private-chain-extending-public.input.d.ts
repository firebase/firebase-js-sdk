export class PublicTop {
  top: string;
}
class Mid1 extends PublicTop {
  mid1: number;
}
class Mid2 extends Mid1 {
  mid2: number;
}
export class Child extends Mid2 {}
