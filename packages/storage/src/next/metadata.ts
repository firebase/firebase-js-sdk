import { ReferenceImplNext } from './reference';
import { Mappings } from '../implementation/metadata';
import { Metadata } from '../metadata';
import { jsonObjectOrNull } from '../implementation/json';
import { LocationNext } from './location';

export function addRef(ref: ReferenceImplNext, metadata: Metadata): void {
    function generateRef(): ReferenceImplNext {
      const bucket: string = metadata['bucket'] as string;
      const path: string = metadata['fullPath'] as string;
      const loc = new LocationNext(bucket, path);
      return new ReferenceImplNext(ref.storage, loc);
    }
    Object.defineProperty(metadata, 'ref', { get: generateRef });
  }

export function fromResource(
    ref: ReferenceImplNext,
    resource: { [name: string]: unknown },
    mappings: Mappings
  ): Metadata {
    const metadata: Metadata = {} as Metadata;
    metadata['type'] = 'file';
    const len = mappings.length;
    for (let i = 0; i < len; i++) {
      const mapping = mappings[i];
      metadata[mapping.local] = mapping.xform(
        metadata,
        resource[mapping.server] as undefined
      );
    }
    addRef(ref, metadata);
    return metadata;
  }
  
  export function fromResourceString(
    ref: ReferenceImplNext,
    resourceString: string,
    mappings: Mappings
  ): Metadata | null {
    const obj = jsonObjectOrNull(resourceString);
    if (obj === null) {
      return null;
    }
    const resource = obj as Metadata;
    return fromResource(ref, resource, mappings);
  }