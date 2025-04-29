/**
 * @license
 * Copyright 2025 Google LLC
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

import {
  constant,
  cosineDistance,
  dotProduct,
  euclideanDistance,
  vectorLength
} from '../../../../src/lite-api/expressions';
import { VectorValue } from '../../../../src';
import { EvaluateResult } from '../../../../src/core/expressions';
import { constantArray } from '../../../util/pipelines';
import { evaluateToResult, evaluateToValue, expectEqual } from './utils';

describe('Vector Functions', () => {
  describe('cosineDistance', () => {
    it('cosineDistance', () => {
      expect(
        evaluateToValue(
          cosineDistance(
            constant(new VectorValue([0.0, 1.0])),
            constant(new VectorValue([5.0, 100.0]))
          )
        )?.doubleValue
      ).to.be.closeTo(0.0012476611221553524, 1e-10); // Use closeTo for floating-point comparison
    });

    it('zeroVector_returnsError', () => {
      expect(
        evaluateToResult(
          cosineDistance(
            constant(new VectorValue([0.0, 0.0])),
            constant(new VectorValue([5.0, 100.0]))
          )
        )
      ).to.deep.equal(EvaluateResult.newError());
    });

    it('emptyVectors_returnsError', () => {
      expect(
        evaluateToValue(
          cosineDistance(
            constant(new VectorValue([])),
            constant(new VectorValue([]))
          )
        )
      ).to.be.undefined;
    });

    it('differentVectorLengths_returnError', () => {
      expect(
        evaluateToValue(
          cosineDistance(
            constant(new VectorValue([1.0])),
            constant(new VectorValue([2.0, 3.0]))
          )
        )
      ).to.be.undefined;
    });

    it('wrongInputType_returnError', () => {
      expect(
        evaluateToValue(
          cosineDistance(
            constant(new VectorValue([1.0, 2.0])),
            constantArray([3.0, 4.0])
          )
        )
      ).to.be.undefined;
    });
  }); // end describe('cosineDistance')

  describe('dotProduct', () => {
    it('dotProduct', () => {
      expect(
        evaluateToValue(
          dotProduct(
            constant(new VectorValue([2.0, 1.0])),
            constant(new VectorValue([1.0, 5.0]))
          )
        )!.doubleValue
      ).to.equal(7.0);
    });

    it('orthogonalVectors', () => {
      expect(
        evaluateToValue(
          dotProduct(
            constant(new VectorValue([1.0, 0.0])),
            constant(new VectorValue([0.0, 5.0]))
          )
        )?.doubleValue
      ).to.deep.equal(0.0);
    });

    it('zeroVector_returnsZero', () => {
      expect(
        evaluateToValue(
          dotProduct(
            constant(new VectorValue([0.0, 0.0])),
            constant(new VectorValue([5.0, 100.0]))
          )
        )?.doubleValue
      ).to.equal(0.0);
    });

    it('emptyVectors_returnsZero', () => {
      expect(
        evaluateToValue(
          dotProduct(
            constant(new VectorValue([])),
            constant(new VectorValue([]))
          )
        )?.doubleValue
      ).to.equal(0.0);
    });

    it('differentVectorLengths_returnError', () => {
      expect(
        evaluateToValue(
          dotProduct(
            constant(new VectorValue([1.0])),
            constant(new VectorValue([2.0, 3.0]))
          )
        )
      ).to.be.undefined;
    });

    it('wrongInputType_returnError', () => {
      expect(
        evaluateToValue(
          dotProduct(
            constant(new VectorValue([1.0, 2.0])),
            constantArray([3.0, 4.0])
          )
        )
      ).to.be.undefined;
    });
  }); // end describe('dotProduct')

  describe('euclideanDistance', () => {
    it('euclideanDistance', () => {
      expect(
        evaluateToValue(
          euclideanDistance(
            constant(new VectorValue([0.0, 0.0])),
            constant(new VectorValue([3.0, 4.0]))
          )
        )?.doubleValue
      ).to.equal(5.0);
    });

    it('zeroVector', () => {
      expect(
        evaluateToValue(
          euclideanDistance(
            constant(new VectorValue([0.0, 0.0])),
            constant(new VectorValue([0.0, 0.0]))
          )
        )?.doubleValue
      ).to.equal(0.0);
    });

    it('emptyVectors', () => {
      expect(
        evaluateToValue(
          euclideanDistance(
            constant(new VectorValue([])),
            constant(new VectorValue([]))
          )
        )?.doubleValue
      ).to.equal(0.0);
    });

    it('differentVectorLengths_returnError', () => {
      expect(
        evaluateToValue(
          euclideanDistance(
            constant(new VectorValue([1.0])),
            constant(new VectorValue([2.0, 3.0]))
          )
        )
      ).to.be.undefined;
    });

    it('wrongInputType_returnError', () => {
      expect(
        evaluateToValue(
          euclideanDistance(
            constant(new VectorValue([1.0, 2.0])),
            constantArray([3.0, 4.0])
          )
        )
      ).to.be.undefined;
    });
  }); // end describe('euclideanDistance')

  describe('vectorLength', () => {
    it('length', () => {
      expectEqual(
        evaluateToValue(vectorLength(constant(new VectorValue([0.0, 1.0])))),
        constant(2)
      );
    });

    it('emptyVector', () => {
      expectEqual(
        evaluateToValue(vectorLength(constant(new VectorValue([])))),
        constant(0)
      );
    });

    it('zeroVector', () => {
      expectEqual(
        evaluateToValue(vectorLength(constant(new VectorValue([0.0])))),
        constant(1)
      );
    });

    it('notVectorType_returnsError', () => {
      expect(evaluateToValue(vectorLength(constantArray([1])))).to.be.undefined;
      expect(evaluateToValue(vectorLength(constant('notAnArray')))).to.be
        .undefined;
    });
  }); // end describe('vectorLength')
}); // end describe('Vector Functions')
