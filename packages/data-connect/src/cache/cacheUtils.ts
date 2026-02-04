import { OpResult } from '../api/Reference';
import { DataConnectExtension } from '../network';
export function parseEntityIds<T>(
  result: OpResult<T>
): Record<string, unknown> {
  // Iterate through extensions.dataConnect
  const dataConnectExtensions = result.extensions?.dataConnect;
  const dataCopy = Object.assign(result);
  if (!dataConnectExtensions) {
    return dataCopy;
  }
  const ret: Record<string, unknown> = {};
  for (const extension of dataConnectExtensions) {
    const { path } = extension;
    populatePath(path, ret, extension);
  }
  return ret;
}

// mutates the object to update the path
export function populatePath(
  path: Array<string | number>,
  toUpdate: Record<string | number, unknown>,
  extension: DataConnectExtension
): void {
  let curObj: Record<string | number, unknown> = toUpdate;
  for (const slice of path) {
    if (typeof curObj[slice] !== 'object') {
      curObj[slice] = {};
    }
    curObj = curObj[slice] as Record<string, unknown>;
  }

  if ('entityId' in extension && extension.entityId) {
    curObj['_id'] = extension.entityId;
  } else if ('entityIds' in extension) {
    const entityArr = extension.entityIds;
    for (let i = 0; i < entityArr.length; i++) {
      const entityId = entityArr[i];
      if (typeof curObj[i] === 'undefined') {
        curObj[i] = {};
      }
      (curObj[i] as Record<string, unknown>)._id = entityId;
    }
  }
}