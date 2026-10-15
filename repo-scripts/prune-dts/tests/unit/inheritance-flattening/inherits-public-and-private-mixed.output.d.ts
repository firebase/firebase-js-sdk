export class PublicBase {
  id: string;
}

export class PublicChild extends PublicBase {
  help(): void;
}
