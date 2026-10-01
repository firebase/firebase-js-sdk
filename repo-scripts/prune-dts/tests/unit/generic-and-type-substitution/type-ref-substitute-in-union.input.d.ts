class PrivateError {}
export class PublicError extends PrivateError {}
export function getError(): PrivateError | null;
