export class PublicBase {}
class PrivateChild extends PublicBase {}
export function handleChild(child: PrivateChild): void;
