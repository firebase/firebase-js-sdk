import { FirebaseAppNext } from '@firebase/app-types/next'

interface StorageNext {
    readonly app: FirebaseAppNext
    // The maximum time to retry operations other than uploads or downloads in milliseconds.
    readonly maxOperationRetryTime: number;
    // The maximum time to retry uploads in milliseconds.
    readonly maxUploadRetryTime: number;
}

interface ReferenceNext {
    // The name of the bucket containing this reference's object.
    bucket: string;
 
    // The short name of this object, which is the last component of the full path. 
    // For example, if fullPath is 'full/path/image.png', name is 'image.png'.
    name: string;
 
    // The full path of this object.
    fullPath: string;
 
    // A reference pointing to the parent location of this reference, or null if 
    // this reference is the root.
    parent: ReferenceNext | null;
 
    // The storage service associated with this reference.
    storage: Storage;
 
    // A reference to the root of this reference's bucket.
    root: ReferenceNext;
    
    // Returns a reference to a relative path from this reference. 
    child: (path:string) => ReferenceNext;
 
    // Returns a gs:// URL for this object in the form gs://<bucket>/<path>/<to>/<object>
    toString: () => string;
 }
 