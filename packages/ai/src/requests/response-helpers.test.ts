/**
 * @license
 * Copyright 2024 Google LLC
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

import {
  addHelpers,
  assignPartType,
  formatBlockErrorMessage
} from './response-helpers';
import { expect, use } from 'chai';
import { restore } from 'sinon';
import sinonChai from 'sinon-chai';
import {
  BlockReason,
  Content,
  FinishReason,
  GenerateContentResponse,
  InlineDataPart,
  FunctionCallPart,
  Part,
  UnknownPart
} from '../types';

use(sinonChai);

const fakeResponseText: GenerateContentResponse = {
  candidates: [
    {
      index: 0,
      content: {
        role: 'model',
        parts: [
          { type: 'text', text: 'Some text' },
          { type: 'text', text: ' and some more text' }
        ]
      }
    }
  ]
};

const fakeResponseThoughts: GenerateContentResponse = {
  candidates: [
    {
      index: 0,
      content: {
        role: 'model',
        parts: [
          { type: 'text', text: 'Some text' },
          { type: 'text', text: 'and some thoughts', thought: true }
        ]
      }
    }
  ]
};

const functionCallPart1: FunctionCallPart = {
  type: 'functionCall',
  functionCall: {
    name: 'find_theaters',
    args: {
      location: 'Mountain View, CA',
      movie: 'Barbie'
    }
  }
};

const functionCallPart2: FunctionCallPart = {
  type: 'functionCall',
  functionCall: {
    name: 'find_times',
    args: {
      location: 'Mountain View, CA',
      movie: 'Barbie',
      time: '20:00'
    }
  }
};

const fakeResponseFunctionCall: GenerateContentResponse = {
  candidates: [
    {
      index: 0,
      content: {
        role: 'model',
        parts: [functionCallPart1]
      }
    }
  ]
};

const fakeResponseFunctionCalls: GenerateContentResponse = {
  candidates: [
    {
      index: 0,
      content: {
        role: 'model',
        parts: [functionCallPart1, functionCallPart2]
      }
    }
  ]
};

const fakeResponseMixed1: GenerateContentResponse = {
  candidates: [
    {
      index: 0,
      content: {
        role: 'model',
        parts: [{ type: 'text', text: 'some text' }, functionCallPart2]
      }
    }
  ]
};

const fakeResponseMixed2: GenerateContentResponse = {
  candidates: [
    {
      index: 0,
      content: {
        role: 'model',
        parts: [functionCallPart1, { type: 'text', text: 'some text' }]
      }
    }
  ]
};

const fakeResponseMixed3: GenerateContentResponse = {
  candidates: [
    {
      index: 0,
      content: {
        role: 'model',
        parts: [
          { type: 'text', text: 'some text' },
          functionCallPart1,
          { type: 'text', text: ' and more text' }
        ]
      }
    }
  ]
};

const inlineDataPart1: InlineDataPart = {
  type: 'inlineData',
  inlineData: {
    mimeType: 'image/png',
    data: 'base64encoded...'
  }
};

const inlineDataPart2: InlineDataPart = {
  type: 'inlineData',
  inlineData: {
    mimeType: 'image/jpeg',
    data: 'anotherbase64...'
  }
};

const fakeResponseInlineData: GenerateContentResponse = {
  candidates: [
    {
      index: 0,
      content: {
        role: 'model',
        parts: [inlineDataPart1, inlineDataPart2]
      }
    }
  ]
};

const fakeResponseTextAndInlineData: GenerateContentResponse = {
  candidates: [
    {
      index: 0,
      content: {
        role: 'model',
        parts: [{ type: 'text', text: 'Describe this:' }, inlineDataPart1]
      }
    }
  ]
};

const badFakeResponse: GenerateContentResponse = {
  promptFeedback: {
    blockReason: BlockReason.SAFETY,
    safetyRatings: []
  }
};

describe('response-helpers methods', () => {
  afterEach(() => {
    restore();
  });
  describe('addHelpers', () => {
    it('good response text', async () => {
      const enhancedResponse = addHelpers(fakeResponseText);
      expect(enhancedResponse.text()).to.equal('Some text and some more text');
      expect(enhancedResponse.functionCalls()).to.be.undefined;
      expect(enhancedResponse.inlineDataParts()).to.be.undefined;
      expect(enhancedResponse.thoughtSummary()).to.be.undefined;
    });
    it('good response functionCall', async () => {
      const enhancedResponse = addHelpers(fakeResponseFunctionCall);
      expect(enhancedResponse.text()).to.equal('');
      expect(enhancedResponse.functionCalls()).to.deep.equal([
        functionCallPart1.functionCall
      ]);
      expect(enhancedResponse.inlineDataParts()).to.be.undefined;
      expect(enhancedResponse.thoughtSummary()).to.be.undefined;
    });
    it('good response functionCalls', async () => {
      const enhancedResponse = addHelpers(fakeResponseFunctionCalls);
      expect(enhancedResponse.text()).to.equal('');
      expect(enhancedResponse.functionCalls()).to.deep.equal([
        functionCallPart1.functionCall,
        functionCallPart2.functionCall
      ]);
      expect(enhancedResponse.inlineDataParts()).to.be.undefined;
      expect(enhancedResponse.thoughtSummary()).to.be.undefined;
    });
    it('good response text/functionCall', async () => {
      const enhancedResponse = addHelpers(fakeResponseMixed1);
      expect(enhancedResponse.functionCalls()).to.deep.equal([
        functionCallPart2.functionCall
      ]);
      expect(enhancedResponse.text()).to.equal('some text');
      expect(enhancedResponse.inlineDataParts()).to.be.undefined;
      expect(enhancedResponse.thoughtSummary()).to.be.undefined;
    });
    it('good response functionCall/text', async () => {
      const enhancedResponse = addHelpers(fakeResponseMixed2);
      expect(enhancedResponse.functionCalls()).to.deep.equal([
        functionCallPart1.functionCall
      ]);
      expect(enhancedResponse.text()).to.equal('some text');
      expect(enhancedResponse.inlineDataParts()).to.be.undefined;
      expect(enhancedResponse.thoughtSummary()).to.be.undefined;
    });
    it('good response text/functionCall/text', async () => {
      const enhancedResponse = addHelpers(fakeResponseMixed3);
      expect(enhancedResponse.functionCalls()).to.deep.equal([
        functionCallPart1.functionCall
      ]);
      expect(enhancedResponse.text()).to.equal('some text and more text');
      expect(enhancedResponse.thoughtSummary()).to.be.undefined;
      expect(enhancedResponse.inlineDataParts()).to.be.undefined;
    });
    it('bad response safety', async () => {
      const enhancedResponse = addHelpers(badFakeResponse);
      expect(enhancedResponse.text).to.throw('SAFETY');
      expect(enhancedResponse.thoughtSummary).to.throw('SAFETY');
      expect(enhancedResponse.functionCalls).to.throw('SAFETY');
      expect(enhancedResponse.inlineDataParts).to.throw('SAFETY');
    });
    it('good response inlineData', async () => {
      const enhancedResponse = addHelpers(fakeResponseInlineData);
      expect(enhancedResponse.text()).to.equal('');
      expect(enhancedResponse.thoughtSummary()).to.be.undefined;
      expect(enhancedResponse.functionCalls()).to.be.undefined;
      expect(enhancedResponse.inlineDataParts()).to.deep.equal([
        inlineDataPart1,
        inlineDataPart2
      ]);
    });
    it('good response text/inlineData', async () => {
      const enhancedResponse = addHelpers(fakeResponseTextAndInlineData);
      expect(enhancedResponse.text()).to.equal('Describe this:');
      expect(enhancedResponse.thoughtSummary()).to.be.undefined;
      expect(enhancedResponse.functionCalls()).to.be.undefined;
      expect(enhancedResponse.inlineDataParts()).to.deep.equal([
        inlineDataPart1
      ]);
    });
    it('good response text/thought', async () => {
      const enhancedResponse = addHelpers(fakeResponseThoughts);
      expect(enhancedResponse.text()).to.equal('Some text');
      expect(enhancedResponse.thoughtSummary()).to.equal('and some thoughts');
      expect(enhancedResponse.functionCalls()).to.be.undefined;
      expect(enhancedResponse.inlineDataParts()).to.be.undefined;
    });
  });
  describe('getBlockString', () => {
    it('has no promptFeedback or bad finishReason', async () => {
      const message = formatBlockErrorMessage({
        candidates: [
          {
            index: 0,
            finishReason: FinishReason.STOP,
            finishMessage: 'this was fine',
            content: {} as Content
          }
        ]
      });
      expect(message).to.equal('');
    });
    it('has promptFeedback and blockReason only', async () => {
      const message = formatBlockErrorMessage({
        promptFeedback: {
          blockReason: BlockReason.SAFETY,
          safetyRatings: []
        }
      });
      expect(message).to.include('Response was blocked due to SAFETY');
    });
    it('has promptFeedback with blockReason and blockMessage', async () => {
      const message = formatBlockErrorMessage({
        promptFeedback: {
          blockReason: BlockReason.SAFETY,
          blockReasonMessage: 'safety reasons',
          safetyRatings: []
        }
      });
      expect(message).to.include(
        'Response was blocked due to SAFETY: safety reasons'
      );
    });
    it('has bad finishReason only', async () => {
      const message = formatBlockErrorMessage({
        candidates: [
          {
            index: 0,
            finishReason: FinishReason.SAFETY,
            content: {} as Content
          }
        ]
      });
      expect(message).to.include('Candidate was blocked due to SAFETY');
    });
    it('has finishReason and finishMessage', async () => {
      const message = formatBlockErrorMessage({
        candidates: [
          {
            index: 0,
            finishReason: FinishReason.SAFETY,
            finishMessage: 'unsafe candidate',
            content: {} as Content
          }
        ]
      });
      expect(message).to.include(
        'Candidate was blocked due to SAFETY: unsafe candidate'
      );
    });
  });
  describe('assignPartType', () => {
    it('correctly assigns "text" type to an untagged text part', () => {
      const part: UnknownPart = { text: 'hello' };
      const result = assignPartType(part);
      expect(result.type).to.equal('text');
      expect(result).to.deep.equal({ type: 'text', text: 'hello' });
    });
    it('correctly assigns "text" type to an empty text part', () => {
      const part: UnknownPart = { text: '' };
      const result = assignPartType(part);
      expect(result.type).to.equal('text');
      expect((result as any).text).to.equal('');
    });
    it('correctly assigns "inlineData" type', () => {
      const part: UnknownPart = {
        inlineData: { mimeType: 'image/png', data: 'abc' }
      };
      const result = assignPartType(part);
      expect(result.type).to.equal('inlineData');
    });
    it('correctly assigns "functionCall" type', () => {
      const part: UnknownPart = {
        functionCall: { name: 'foo', args: {} }
      };
      const result = assignPartType(part);
      expect(result.type).to.equal('functionCall');
    });
    it('correctly assigns "functionResponse" type', () => {
      const part: UnknownPart = {
        functionResponse: { name: 'foo', response: {} }
      };
      const result = assignPartType(part);
      expect(result.type).to.equal('functionResponse');
    });
    it('correctly assigns "fileData" type', () => {
      const part: UnknownPart = {
        fileData: { mimeType: 'application/pdf', fileUri: 'gs://bucket/file' }
      };
      const result = assignPartType(part);
      expect(result.type).to.equal('fileData');
    });
    it('correctly assigns "executableCode" type', () => {
      const part: UnknownPart = {
        executableCode: { code: 'print(1)' }
      };
      const result = assignPartType(part);
      expect(result.type).to.equal('executableCode');
    });
    it('correctly assigns "codeExecutionResult" type', () => {
      const part: UnknownPart = {
        codeExecutionResult: { output: '1' }
      };
      const result = assignPartType(part);
      expect(result.type).to.equal('codeExecutionResult');
    });
    it('is idempotent and leaves already-tagged Part untouched', () => {
      const part: Part = { type: 'text', text: 'hello' };
      const result = assignPartType(part);
      expect(result).to.equal(part);
      expect(result.type).to.equal('text');
    });
    it('returns empty or unrecognized object as-is without crashing', () => {
      const emptyPart = {} as UnknownPart;
      const resultEmpty = assignPartType(emptyPart);
      expect(resultEmpty).to.equal(emptyPart);
      expect(resultEmpty.type).to.be.undefined;

      const unknownPart = { invalidKey: 'val' } as unknown as UnknownPart;
      const resultUnknown = assignPartType(unknownPart);
      expect(resultUnknown).to.equal(unknownPart);
      expect(resultUnknown.type).to.be.undefined;
    });
  });
});
