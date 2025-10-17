// Copyright 2025 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Type definitions for Intl.Segmenter

declare namespace Intl {
  type Granularity = 'grapheme' | 'word' | 'sentence';

  interface SegmenterOptions {
    granularity?: Granularity;
    localeMatcher?: 'lookup' | 'best fit';
  }

  interface SegmentData {
    segment: string;
    index: number;
    isWordLike?: boolean;
  }

  interface Segments {
    containing(index: number): SegmentData | undefined;
    [Symbol.iterator](): IterableIterator<SegmentData>;
  }

  class Segmenter {
    constructor(locales?: string | string[], options?: SegmenterOptions);
    segment(input: string): Segments;
  }
}
