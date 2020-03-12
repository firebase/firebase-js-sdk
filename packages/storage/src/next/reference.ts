import { ReferenceNext, StorageNext } from '@firebase/storage-types/next';
import { LocationNext } from './location';
import { validate, stringSpec } from '../implementation/args';
import { child as childFunc, parent as parentFunc, lastComponent } from '../implementation/path';

export class ReferenceImplNext implements ReferenceNext {

    constructor(private readonly _storage: StorageNext, private readonly _location: LocationNext) {
    }

    child(childPath: string): ReferenceNext {
        validate('child', [stringSpec()], arguments);
        const newPath = childFunc(this.location.path, childPath);
        const location = new LocationNext(this.location.bucket, newPath);
        return new ReferenceImplNext(this.storage, location);
    }

    toString(): string {
        validate('toString', [], arguments);
        return 'gs://' + this.location.bucket + '/' + this.location.path;
    }

    get root(): ReferenceNext {
        const location = new LocationNext(this.location.bucket, '');
        return new ReferenceImplNext(this.storage, location);
    }

    get bucket(): string {
        return this._location.bucket;
    }

    get fullPath(): string {
        return this._location.path;
    }

    get name(): string {
        return lastComponent(this._location.path);
    }

    get storage(): StorageNext {
        return this._storage;
    }

    /**
     * @internal
     */
    get location(): LocationNext {
        return this._location
    }

    /**
     * @return A reference to the parent of the
     *     current object, or null if the current object is the root.
     */
    get parent(): ReferenceNext | null {
        const newPath = parentFunc(this.location.path);
        if (newPath === null) {
            return null;
        }
        const location = new LocationNext(this.location.bucket, newPath);
        return new ReferenceImplNext(this.storage, location);
    }

}
