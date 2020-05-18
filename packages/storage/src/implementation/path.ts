/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Contains helper methods for manipulating paths.
 */

/**
 * @return Null if the path is already at the root.
 */
export function parent(path: string): string | null {
  if (path.length === 0) {
    return null;
  }
  const index = path.lastIndexOf('/');
  if (index === -1) {
    return '';
  }
  const newPath = path.slice(0, index);
  return newPath;
}

export function child(path: string, childPath: string): string {
  const canonicalChildPath = childPath
    .split('/')
    .filter(component => component.length > 0)
    .join('/');
  if (path.length === 0) {
    return canonicalChildPath;
  } else {
    return path + '/' + canonicalChildPath;
  }
}

/**
 * Returns the last component of a path.
 * '/foo/bar' -> 'bar'
 * '/foo/bar/baz/' -> 'baz/'
 * '/a' -> 'a'
 */
export function lastComponent(path: string): string {
  const index = path.lastIndexOf('/', path.length - 2);
  if (index === -1) {
    return path;
  } else {
    return path.slice(index + 1);
  }
}
