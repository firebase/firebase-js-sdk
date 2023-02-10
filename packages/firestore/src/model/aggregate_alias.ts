/**
 * @license
 * Copyright 2022 Google LLC
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

const aliasRegExp = /^[_a-zA-Z][_a-zA-Z0-9]*(?:\.[_a-zA-Z][_a-zA-Z0-9]*)*$/;

/**
 * An alias for aggregation results.
 * @internal
 */
export class AggregateAlias {
  /**
   * @internal
   * @param alias Un-escaped alias representation
   */
  constructor(private alias: string) {}

  /**
   * Returns true if the string could be used as an alias.
   */
  private static isValidAlias(value: string): boolean {
    return aliasRegExp.test(value);
  }

  /**
   * Return an escaped and quoted string representation of the alias.
   */
  canonicalString(): string {
    let alias = this.alias.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
    if (!AggregateAlias.isValidAlias(alias)) {
      alias = '`' + alias + '`';
    }
    return alias;
  }
}
