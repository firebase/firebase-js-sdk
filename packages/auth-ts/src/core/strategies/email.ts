import { Auth } from '../../model/auth';

export function fetchSignInMethodsForEmail(
  auth: Auth,
  email: string
): Promise<string[]> {
  throw new Error('not implemented');
}
