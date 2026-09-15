export interface PublicBase {
  baseId: string;
}

export interface Child extends PublicBase {
  name: string;
  id: string;
}
