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
  BackendType,
  getLiveGenerativeModel,
  LiveGenerationConfig,
  LiveServerContent,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  ResponseModality
} from '../src';
import { liveTestConfigs } from './constants';
import { HELLO_AUDIO_PCM_BASE64 } from './sample-data/hello-audio';

// A helper function to consume the generator and collect text parts from one turn.
async function nextTurnText(
  stream: AsyncGenerator<
    LiveServerContent | LiveServerToolCall | LiveServerToolCallCancellation
  >
): Promise<string> {
  let text = '';
  // We don't use `for await...of` on the generator, because that would automatically close the generator.
  // We want to keep the generator open so that we can pass it to this function again to get the
  // next turn's text.
  let result = await stream.next();
  while (!result.done) {
    const chunk = result.value as
      | LiveServerContent
      | LiveServerToolCall
      | LiveServerToolCallCancellation;
    switch (chunk.type) {
      case 'serverContent':
        if (chunk.turnComplete) {
          return text;
        }

        const parts = chunk.modelTurn?.parts;
        if (parts) {
          parts.forEach(part => {
            if (part.text) {
              text += part.text;
            } else {
              throw Error(`Expected TextPart but got ${JSON.stringify(part)}`);
            }
          });
        }
        break;
      default:
        throw new Error(`Unexpected chunk type '${(chunk as any).type}'`);
    }

    result = await stream.next();
  }

  return text;
}

describe('Live', function () {
  this.timeout(20000);

  const textLiveGenerationConfig: LiveGenerationConfig = {
    responseModalities: [ResponseModality.TEXT],
    temperature: 0,
    topP: 0
  };

  liveTestConfigs.forEach(testConfig => {
    if (testConfig.ai.backend.backendType === BackendType.VERTEX_AI) {
      return;
    }
    describe(`${testConfig.toString()}`, () => {
      describe('Live', () => {
        it('should connect, send a message, receive a response, and close', async () => {
          const model = getLiveGenerativeModel(testConfig.ai, {
            model: testConfig.model,
            generationConfig: textLiveGenerationConfig
          });

          const session = await model.connect();
          const responsePromise = nextTurnText(session.receive());
          await session.send(
            'Where is Google headquarters located? Answer with the city name only.'
          );
          const responseText = await responsePromise;
          expect(responseText).to.exist;
          expect(responseText).to.include('Mountain View');
          await session.close();
        });
        it('should handle multiple messages in a session', async () => {
          const model = getLiveGenerativeModel(testConfig.ai, {
            model: testConfig.model,
            generationConfig: textLiveGenerationConfig
          });
          const session = await model.connect();
          const generator = session.receive();

          await session.send(
            'Where is Google headquarters located? Answer with the city name only.'
          );

          const responsePromise1 = nextTurnText(generator);
          const responseText1 = await responsePromise1; // Wait for the turn to complete
          expect(responseText1).to.include('Mountain View');

          await session.send(
            'What state is that in? Answer with the state name only.'
          );

          const responsePromise2 = nextTurnText(generator);
          const responseText2 = await responsePromise2; // Wait for the second turn to complete
          expect(responseText2).to.include('California');

          await session.close();
        });

        it('close() should be idempotent and terminate the stream', async () => {
          const model = getLiveGenerativeModel(testConfig.ai, {
            model: testConfig.model
          });
          const session = await model.connect();
          const generator = session.receive();

          // Start consuming but don't wait for it to finish yet
          const consumptionPromise = (async () => {
            // This loop should terminate cleanly when close() is called
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of generator) {
            }
          })();

          await session.close();

          // Calling it again should not throw an error
          await session.close();

          // Should resolve without timing out
          await consumptionPromise;
        });
      });

      describe('sendMediaChunks()', () => {
        it('should send a single audio chunk and receive a response', async () => {
          const model = getLiveGenerativeModel(testConfig.ai, {
            model: testConfig.model,
            generationConfig: textLiveGenerationConfig
          });
          const session = await model.connect();
          const responsePromise = nextTurnText(session.receive());

          await session.sendMediaChunks([
            {
              data: HELLO_AUDIO_PCM_BASE64, // "Hey, can you hear me?"
              mimeType: 'audio/pcm'
            }
          ]);

          const responseText = await responsePromise;
          expect(responseText).to.include('Yes');

          await session.close();
        });

        it('should send multiple audio chunks in a single batch call', async () => {
          const model = getLiveGenerativeModel(testConfig.ai, {
            model: testConfig.model,
            generationConfig: textLiveGenerationConfig
          });
          const session = await model.connect();
          const responsePromise = nextTurnText(session.receive());

          // TODO (dlarocque): Pass two PCM files with different audio, and validate that the model
          // heard both.
          await session.sendMediaChunks([
            { data: HELLO_AUDIO_PCM_BASE64, mimeType: 'audio/pcm' },
            { data: HELLO_AUDIO_PCM_BASE64, mimeType: 'audio/pcm' }
          ]);

          const responseText = await responsePromise;
          expect(responseText).to.include('Yes');

          await session.close();
        });
      });

      describe('sendMediaStream()', () => {
        it('should consume a stream with multiple chunks and receive a response', async () => {
          const model = getLiveGenerativeModel(testConfig.ai, {
            model: testConfig.model,
            generationConfig: textLiveGenerationConfig
          });
          const session = await model.connect();
          const responsePromise = nextTurnText(session.receive());

          // TODO (dlarocque): Pass two PCM files with different audio, and validate that the model
          // heard both.
          const testStream = new ReadableStream({
            start(controller) {
              controller.enqueue({
                data: HELLO_AUDIO_PCM_BASE64,
                mimeType: 'audio/pcm'
              });
              controller.enqueue({
                data: HELLO_AUDIO_PCM_BASE64,
                mimeType: 'audio/pcm'
              });
              controller.close();
            }
          });

          await session.sendMediaStream(testStream);
          const responseText = await responsePromise;
          expect(responseText).to.include('Yes');

          await session.close();
        });
      });

      /**
       * These tests are currently very unreliable. Their behavior seems to change frequently.
       * Skipping them for now.
       */
      /*
      describe('function calling', () => {
        // When this tests runs against the Google AI backend, the first message we get back 
        // has an `executableCode` part, and then 
        it('should trigger a function call', async () => {
          const tool: FunctionDeclarationsTool = {
            functionDeclarations: [
              {
                name: 'fetchWeather',
                description:
                  'Get the weather conditions for a specific city on a specific date.',
                parameters: Schema.object({
                  properties: {
                    location: Schema.string({
                      description: 'The city of the location'
                    }),
                    date: Schema.string({
                      description: 'The date to fetch weather for.'
                    })
                  }
                })
              }
            ]
          };
          const model = getLiveGenerativeModel(testConfig.ai, {
            model: testConfig.model,
            tools: [tool],
            generationConfig: textLiveGenerationConfig
          });
          const session = await model.connect();
          const generator = session.receive();

          const streamPromise = new Promise<string>(async resolve => {
            let text = '';
            let turnNum = 0;
            for await (const chunk of generator) {
              console.log('chunk', JSON.stringify(chunk))
              switch (chunk.type) {
                case 'serverContent':
                  if (chunk.turnComplete) {
                    // Vertex AI only:
                    // For some unknown reason, the model's first turn will not be a toolCall, but 
                    // will instead be an executableCode part in Google AI, and a groundingMetadata in Vertex AI.
                    // Let's skip this unexpected first message, waiting until the second turn to resolve with the text. This will definitely break if/when
                    // that bug is fixed.
                    if (turnNum === 0) {
                      turnNum = 1;
                    } else {
                      return resolve(text);
                    }
                  } else {
                    const parts = chunk.modelTurn?.parts;
                    if (parts) {
                      text += parts.flatMap(part => part.text).join('');
                    }
                  }
                  break;
                case 'toolCall':
                  // Send a fake function response
                  const functionResponse: FunctionResponsePart = {
                    functionResponse: {
                      id: chunk.functionCalls[0].id, // Only defined in Google AI
                      name: chunk.functionCalls[0].name,
                      response: { degrees: '22' }
                    }
                  };
                  console.log('sending', JSON.stringify(functionResponse))
                  await session.send([functionResponse]);
                  break;
                case 'toolCallCancellation':
                  throw Error('Unexpected tool call cancellation');
                default:
                  throw Error('Unexpected chunk type');
              }
            }
          });

          // Send a message that should trigger a function call to fetchWeather
          await session.send('Whats the weather on June 15, 2025 in Toronto?');

          const finalResponseText = await streamPromise;
          expect(finalResponseText).to.include('22'); // Should include the result of our function call

          await session.close();
        });
      });
      */
    });

    describe('startAudioConversation', () => {
      it('');
    });
  });
});
