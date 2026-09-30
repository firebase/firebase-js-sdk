export class PublicClass {
  pubProp: string;
}
class InternalClass extends PublicClass {
  extra: boolean;
}
export class ChildClass extends InternalClass {}
