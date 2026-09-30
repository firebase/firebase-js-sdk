interface PrivateInterface {
  requiredMethod(): void;
}
export class PublicClass implements PrivateInterface {}
