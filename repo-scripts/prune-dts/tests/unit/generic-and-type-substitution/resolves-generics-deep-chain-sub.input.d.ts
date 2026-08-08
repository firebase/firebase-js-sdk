class PrivateRoot<R> {
  root: R;
}
class PrivateMid<M> extends PrivateRoot<M> {
  mid: M;
}
export class PublicChild<C> extends PrivateMid<C> {
  child: C;
}
