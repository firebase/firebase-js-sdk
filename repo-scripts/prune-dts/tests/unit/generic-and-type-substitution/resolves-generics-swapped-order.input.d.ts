class PrivatePair<First, Second> {
  first: First;
  second: Second;
}
export class PublicSwapped<X, Y> extends PrivatePair<Y, X> {}
