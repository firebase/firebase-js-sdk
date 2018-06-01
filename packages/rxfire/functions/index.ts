import { functions } from 'firebase/app';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export function httpsCallable<T=any, R=any>(
  functions: functions.Functions, name: string
) {
  const callable = functions.httpsCallable(name);
  return (data: T) => {
    return from(callable(data)).pipe(
      map(r => r.data as R)
    )
  }
}
