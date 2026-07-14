export interface Base {
  id: string;
}
class PrivateRepo<T extends Base> {
  find(): T;
}
export class PublicRepo<M extends Base> extends PrivateRepo<M> {}
