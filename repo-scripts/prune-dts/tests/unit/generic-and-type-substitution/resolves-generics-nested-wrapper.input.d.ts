class PrivateAsync<T> {
  fetchAll(): Promise<T[]>;
}
export class PublicService extends PrivateAsync<string> {}
