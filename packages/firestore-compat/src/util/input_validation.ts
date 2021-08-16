import { FirestoreError } from '@firebase/firestore';
import { SetOptions } from '@firebase/firestore-types';

export function validateSetOptions(
    methodName: string,
    options: SetOptions | undefined
  ): SetOptions {
    if (options === undefined) {
      return {
        merge: false
      };
    }
  
    if (options.mergeFields !== undefined && options.merge !== undefined) {
      throw new FirestoreError(
        'invalid-argument',
        `Invalid options passed to function ${methodName}(): You cannot ` +
          'specify both "merge" and "mergeFields".'
      );
    }
  
    return options;
  }