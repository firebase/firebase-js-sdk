/**
 * @license
 * Copyright 2026 Google LLC
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

import { SourceFile, SyntaxKind } from 'ts-morph';

/**
 * Removes members whose names start with an underscore from classes and interfaces.
 * Strips properties, methods, getters, and setters, while leaving constructor parameter
 * identifiers untouched.
 */
export function stripPrivateMembers(sourceFile: SourceFile): void {
  const membersToRemove: Array<{
    remove: () => void;
    wasForgotten?: () => boolean;
  }> = [];

  const classes = sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration);
  for (const cls of classes) {
    for (const prop of cls.getProperties()) {
      if (prop.getName().startsWith('_')) {
        membersToRemove.push(prop);
      }
    }
    for (const method of cls.getMethods()) {
      if (method.getName().startsWith('_')) {
        membersToRemove.push(method);
      }
    }
    for (const getAcc of cls.getGetAccessors()) {
      if (getAcc.getName().startsWith('_')) {
        membersToRemove.push(getAcc);
      }
    }
    for (const setAcc of cls.getSetAccessors()) {
      if (setAcc.getName().startsWith('_')) {
        membersToRemove.push(setAcc);
      }
    }
  }

  const interfaces = sourceFile.getDescendantsOfKind(
    SyntaxKind.InterfaceDeclaration
  );
  for (const iface of interfaces) {
    for (const prop of iface.getProperties()) {
      if (prop.getName().startsWith('_')) {
        membersToRemove.push(prop);
      }
    }
    for (const method of iface.getMethods()) {
      if (method.getName().startsWith('_')) {
        membersToRemove.push(method);
      }
    }
  }

  for (const member of membersToRemove) {
    if (typeof member.wasForgotten === 'function' && member.wasForgotten()) {
      continue;
    }
    member.remove();
  }
}
