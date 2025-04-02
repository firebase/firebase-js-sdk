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
import { GENAI_TYPE } from './constants';
import {
  encodeInstanceIdentifier,
  decodeInstanceIdentifier
} from './helpers';
import { GenAIError } from './errors';
import { BackendType, InstanceIdentifier } from './public-types';
import { GenAIErrorCode } from './types';

describe('Identifier Encoding/Decoding', () => {
  describe('encodeInstanceIdentifier', () => {
    it('should encode Vertex AI identifier with a specific location', () => {
      const identifier: InstanceIdentifier = {
        backendType: BackendType.VERTEX_AI,
        location: 'us-central1'
      };
      console.log(identifier);
      const expected = `${GENAI_TYPE}/vertexai/us-central1`;
      expect(encodeInstanceIdentifier(identifier)).to.equal(expected);
    });

    it('should encode Vertex AI identifier using empty location', () => {
      const identifier: InstanceIdentifier = {
        backendType: BackendType.VERTEX_AI,
        location: ""
      };
      const expected = `${GENAI_TYPE}/vertexai/`;
      expect(encodeInstanceIdentifier(identifier)).to.equal(expected);
    });

    it('should encode Google AI identifier', () => {
      const identifier: InstanceIdentifier = {
        backendType: BackendType.GOOGLE_AI
      };
      const expected = `${GENAI_TYPE}/googleai`;
      expect(encodeInstanceIdentifier(identifier)).to.equal(expected);
    });

    it('should throw GenAIError for unknown backend type', () => {
      const identifier = {
        backendType: 'some-future-backend'
      } as any; // bypass type checking for the test

      expect(() => encodeInstanceIdentifier(identifier)).to.throw(GenAIError);

      try {
        encodeInstanceIdentifier(identifier);
        expect.fail('Expected encodeInstanceIdentifier to throw');
      } catch (e) {
        expect(e).to.be.instanceOf(GenAIError);
        const error = e as GenAIError;
        expect(error.message).to.contain(`Unknown backend`);
        expect(error.code).to.equal(GenAIErrorCode.ERROR);
      }
    });
  });

  describe('decodeInstanceIdentifier', () => {
    it('should decode Vertex AI identifier with location', () => {
      const encoded = `${GENAI_TYPE}/vertexai/europe-west1`;
      const expected: InstanceIdentifier = {
        backendType: BackendType.VERTEX_AI,
        location: 'europe-west1'
      };
      expect(decodeInstanceIdentifier(encoded)).to.deep.equal(expected);
    });

     it('should throw an error if Vertex AI identifier string without explicit location part', () => {
       const encoded = `${GENAI_TYPE}/vertexai`;
       expect(() => decodeInstanceIdentifier(encoded)).to.throw(GenAIError);

       try {
         decodeInstanceIdentifier(encoded);
         expect.fail('Expected encodeInstanceIdentifier to throw');
       } catch (e) {
         expect(e).to.be.instanceOf(GenAIError);
         const error = e as GenAIError;
         expect(error.message).to.contain(`Invalid instance identifier, unknown location`);
         expect(error.code).to.equal(GenAIErrorCode.ERROR);
       }
     });

    it('should decode Google AI identifier', () => {
      const encoded = `${GENAI_TYPE}/googleai`;
      const expected: InstanceIdentifier = {
        backendType: BackendType.GOOGLE_AI
      };
      expect(decodeInstanceIdentifier(encoded)).to.deep.equal(expected);
    });

    it('should throw GenAIError for invalid backend string', () => {
      const encoded = `${GENAI_TYPE}/someotherbackend/location`;
      expect(() => decodeInstanceIdentifier(encoded)).to.throw(
        GenAIError,
        `Invalid instance identifier string: '${encoded}'`
      );
      try {
        decodeInstanceIdentifier(encoded);
        expect.fail('Expected decodeInstanceIdentifier to throw');
      } catch (e) {
        expect(e).to.be.instanceOf(GenAIError);
        expect((e as GenAIError).code).to.equal(GenAIErrorCode.ERROR);
      }
    });

    it('should throw GenAIError for malformed identifier string (too few parts)', () => {
      const encoded = GENAI_TYPE;
      expect(() => decodeInstanceIdentifier(encoded)).to.throw(
        GenAIError,
        `Invalid instance identifier string: '${encoded}'`
      );
    });

     it('should throw GenAIError for malformed identifier string (incorrect prefix)', () => {
       const encoded = 'firebase/vertexai/location';
        // This will also hit the default case in the switch statement
       expect(() => decodeInstanceIdentifier(encoded)).to.throw(
         GenAIError,
         `Invalid instance identifier, unknown prefix 'firebase'`
       );
     });
  });
});