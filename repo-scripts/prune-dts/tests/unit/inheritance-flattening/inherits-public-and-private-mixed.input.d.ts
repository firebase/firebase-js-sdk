export class PublicBase {
  id: string;
}
interface PrivateHelper {
  help(): void;
}
export class PublicChild extends PublicBase implements PrivateHelper {}
