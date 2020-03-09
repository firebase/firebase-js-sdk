import { ReferenceNext } from '@firebase/storage-types/next';
import { StorageInternalNext} from './types';

export class ReferenceImplNext implements ReferenceNext {
    bucket: string;
    name: string;
    fullPath: string;
    parent: ReferenceNext | null;
    storage: Storage;
    root: ReferenceNext;
    child: (path: string) => ReferenceNext;
    toString: () => string;

    constructor(private readonly storage: StorageInternalNext) {
    }

}
