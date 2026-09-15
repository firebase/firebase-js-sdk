interface BaseReadonly {
  readonly id: string;
  readonly [idx: number]: string;
}
export interface PublicReadonly extends BaseReadonly {}
