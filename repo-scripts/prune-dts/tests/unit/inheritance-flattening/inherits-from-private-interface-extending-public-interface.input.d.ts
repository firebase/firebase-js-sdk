export interface PublicBase {
  baseId: string;
}
interface Internal extends PublicBase {
  id: string;
}
export interface Child extends Internal {
  name: string;
}
