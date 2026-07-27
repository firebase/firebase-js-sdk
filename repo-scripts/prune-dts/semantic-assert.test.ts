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

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { assertSemanticEquals } from './src/utils/semantic-assert';

describe('assertSemanticEquals', () => {
  it('passes when declarations differ only in whitespace or formatting', () => {
    const expected = `
      export interface Foo {
        bar: string;
        baz?: number;
      }
    `;
    const actual = `
      export interface Foo{
        bar :   string ;
        baz ? : number;
      }
    `;
    expect(() => assertSemanticEquals(actual, expected, 'formatting test')).to.not.throw();
  });

  it('passes when interface properties are in a different order', () => {
    const expected = `
      export interface User {
        id: string;
        name: string;
      }
    `;
    const actual = `
      export interface User {
        name: string;
        id: string;
      }
    `;
    expect(() => assertSemanticEquals(actual, expected, 'order test')).to.not.throw();
  });

  it('throws an error when a semantic change is introduced (property type mismatch)', () => {
    const expected = `
      export interface User {
        id: string;
      }
    `;
    const actual = `
      export interface User {
        id: number;
      }
    `;
    expect(() => assertSemanticEquals(actual, expected, 'semantic mismatch test')).to.throw(
      /Semantic difference in 'User'/
    );
  });

  it('throws an error when an export is missing', () => {
    const expected = `
      export interface User {
        id: string;
      }
      export interface Admin {
        role: string;
      }
    `;
    const actual = `
      export interface User {
        id: string;
      }
    `;
    expect(() => assertSemanticEquals(actual, expected, 'missing export test')).to.throw(
      /Expected export\(s\) missing in actual output: Admin/
    );
  });
});
