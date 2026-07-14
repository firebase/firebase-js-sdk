abstract class PrivateAbstract {
  abstract run(): void;
  stop(): void;
}
export class PublicConcrete extends PrivateAbstract {}
