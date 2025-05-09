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
import { AI_TYPE, DEFAULT_LOCATION } from './constants';
import { encodeInstanceIdentifier, decodeInstanceIdentifier } from './helpers';
import { AIError } from './errors';
import { AIErrorCode } from './types';
import { GoogleAIBackend, VertexAIBackend } from './backend';

describe('Identifier Encoding/Decoding', () => {
  describe('encodeInstanceIdentifier', () => {
    it('should encode Vertex AI identifier with a specific location', () => {
      const backend = new VertexAIBackend('us-east1');
      const expected = `${AI_TYPE}/vertexai/us-east1`;
      expect(encodeInstanceIdentifier(backend)).to.equal(expected);
    });

    it('should encode Vertex AI identifier using default location if location is empty string', () => {
      const backend = new VertexAIBackend('');
      const expected = `${AI_TYPE}/vertexai/${DEFAULT_LOCATION}`;
      expect(encodeInstanceIdentifier(backend)).to.equal(expected);
    });

    it('should encode Google AI identifier', () => {
      const backend = new GoogleAIBackend();
      const expected = `${AI_TYPE}/googleai`;
      expect(encodeInstanceIdentifier(backend)).to.equal(expected);
    });

    it('should throw AIError for unknown backend type', () => {
      expect(() => encodeInstanceIdentifier({} as any)).to.throw(AIError);

      try {
        encodeInstanceIdentifier({} as any);
        expect.fail('Expected encodeInstanceIdentifier to throw');
      } catch (e) {
        expect(e).to.be.instanceOf(AIError);
        const error = e as AIError;
        expect(error.message).to.contain('Invalid backend');
        expect(error.code).to.equal(AIErrorCode.ERROR);
      }
    });
  });

  describe('decodeInstanceIdentifier', () => {
    it('should decode Vertex AI identifier with location', () => {
      const encoded = `${AI_TYPE}/vertexai/europe-west1`;
      const backend = new VertexAIBackend('europe-west1');
      expect(decodeInstanceIdentifier(encoded)).to.deep.equal(backend);
    });

    it('should throw an error if Vertex AI identifier string without explicit location part', () => {
      const encoded = `${AI_TYPE}/vertexai`;
      expect(() => decodeInstanceIdentifier(encoded)).to.throw(AIError);

      try {
        decodeInstanceIdentifier(encoded);
        expect.fail('Expected encodeInstanceIdentifier to throw');
      } catch (e) {
        expect(e).to.be.instanceOf(AIError);
        const error = e as AIError;
        expect(error.message).to.contain(
          `Invalid instance identifier, unknown location`
        );
        expect(error.code).to.equal(AIErrorCode.ERROR);
      }
    });

    it('should decode Google AI identifier', () => {
      const encoded = `${AI_TYPE}/googleai`;
      const backend = new GoogleAIBackend();
      expect(decodeInstanceIdentifier(encoded)).to.deep.equal(backend);
    });

    it('should throw AIError for invalid backend string', () => {
      const encoded = `${AI_TYPE}/someotherbackend/location`;
      expect(() => decodeInstanceIdentifier(encoded)).to.throw(
        AIError,
        `Invalid instance identifier string: '${encoded}'`
      );
      try {
        decodeInstanceIdentifier(encoded);
        expect.fail('Expected decodeInstanceIdentifier to throw');
      } catch (e) {
        expect(e).to.be.instanceOf(AIError);
        expect((e as AIError).code).to.equal(AIErrorCode.ERROR);
      }
    });

    it('should throw AIError for malformed identifier string (too few parts)', () => {
      const encoded = AI_TYPE;
      expect(() => decodeInstanceIdentifier(encoded)).to.throw(
        AIError,
        `Invalid instance identifier string: '${encoded}'`
      );
    });

    it('should throw AIError for malformed identifier string (incorrect prefix)', () => {
      const encoded = 'firebase/AI/location';
      // This will also hit the default case in the switch statement
      expect(() => decodeInstanceIdentifier(encoded)).to.throw(
        AIError,
        `Invalid instance identifier, unknown prefix 'firebase'`
      );
    });
  });
});
