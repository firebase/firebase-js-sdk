/**
 * @license
 * Copyright 2020 Google LLC
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

// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { IndentedWriter } from '../IndentedWriter';
import { expect, use } from 'chai';
import { jestSnapshotPlugin } from 'mocha-chai-jest-snapshot';

use(jestSnapshotPlugin());

it('01 Demo from docs', () => {
  const indentedWriter: IndentedWriter = new IndentedWriter();
  indentedWriter.write('begin\n');
  indentedWriter.increaseIndent();
  indentedWriter.write('one\ntwo\n');
  indentedWriter.decreaseIndent();
  indentedWriter.increaseIndent();
  indentedWriter.decreaseIndent();
  indentedWriter.write('end');

  expect(indentedWriter.toString()).toMatchSnapshot();
});

it('02 Indent something', () => {
  const indentedWriter: IndentedWriter = new IndentedWriter();
  indentedWriter.write('a');
  indentedWriter.write('b');
  indentedWriter.increaseIndent();
  indentedWriter.writeLine('c');
  indentedWriter.writeLine('d');
  indentedWriter.decreaseIndent();
  indentedWriter.writeLine('e');

  indentedWriter.increaseIndent('>>> ');
  indentedWriter.writeLine();
  indentedWriter.writeLine();
  indentedWriter.writeLine('g');
  indentedWriter.decreaseIndent();

  expect(indentedWriter.toString()).toMatchSnapshot();
});

it('03 Two kinds of indents', () => {
  const indentedWriter: IndentedWriter = new IndentedWriter();

  indentedWriter.writeLine('---');
  indentedWriter.indentScope(() => {
    indentedWriter.write('a\nb');
    indentedWriter.indentScope(() => {
      indentedWriter.write('c\nd\n');
    });
    indentedWriter.write('e\n');
  }, '> ');
  indentedWriter.writeLine('---');

  expect(indentedWriter.toString()).toMatchSnapshot();
});

it('04 Edge cases for ensureNewLine()', () => {
  let indentedWriter: IndentedWriter = new IndentedWriter();
  indentedWriter.ensureNewLine();
  indentedWriter.write('line');
  expect(indentedWriter.toString()).toMatchSnapshot();

  indentedWriter = new IndentedWriter();
  indentedWriter.write('previous');
  indentedWriter.ensureNewLine();
  indentedWriter.write('line');
  expect(indentedWriter.toString()).toMatchSnapshot();
});

it('04 Edge cases for ensureSkippedLine()', () => {
  let indentedWriter: IndentedWriter = new IndentedWriter();
  indentedWriter.ensureSkippedLine();
  indentedWriter.write('line');
  expect(indentedWriter.toString()).toMatchSnapshot();

  indentedWriter = new IndentedWriter();
  indentedWriter.write('previous');
  indentedWriter.ensureSkippedLine();
  indentedWriter.write('line');
  expect(indentedWriter.toString()).toMatchSnapshot();
});
