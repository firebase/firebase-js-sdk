export interface Base {
  id: string;
}

export class PublicRepo<M extends Base> {
  find(): M;
}
