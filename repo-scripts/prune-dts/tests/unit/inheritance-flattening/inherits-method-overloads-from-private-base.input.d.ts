class Base {
  calc(x: string): void;
  calc(x: number): void;
  calc(x: any): void;
}
export class Child extends Base {}
