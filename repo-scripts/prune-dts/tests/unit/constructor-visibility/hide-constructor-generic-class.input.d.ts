export class GenericStore<T, U = string> {
  /** @hideconstructor */
  constructor(item: T, fallback: U);
}
