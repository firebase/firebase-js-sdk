// Hermetic Native E2E Test Suite for Firebase AI Interactions Web (JavaScript / TypeScript) SDK.
// Connects to local MockInteractionsServer and validates all 5 interaction tiers.

import { BackendResolver } from '../src/transport/backendResolver.js';
import { InteractionsClient } from '../src/client/interactionsClient.js';
import { InteractionSession } from '../src/client/interactionSession.js';

function reportResult(name, status, durationMs, details, error) {
  const out = {
    platform: 'js',
    test_name: name,
    status: status,
    duration_ms: durationMs,
    details: details,
  };
  if (error) {
    out.error = String(error);
  }
  console.log('RESULT_JSON:' + JSON.stringify(out));
}

async function testDeveloperApiUnary(baseUrl) {
  const start = performance.now();
  try {
    const resolver = new BackendResolver({
      config: { target: 'googleAI', customBaseUrl: baseUrl },
      apiKey: 'test-api-key',
    });
    const client = new InteractionsClient(resolver);
    const interaction = await client.create({
      model: 'gemini-2.5-flash',
      input: 'Hello from JS E2E!',
    });

    if (!interaction.id) {
      throw new Error('Missing interaction ID in response');
    }
    if (interaction.status !== 'COMPLETED') {
      throw new Error(`Unexpected status: ${interaction.status}`);
    }

    const duration = performance.now() - start;
    reportResult(
      'Developer API Unary Roundtrip',
      'PASS',
      duration,
      `Interaction ${interaction.id} completed with model ${interaction.model}`
    );
  } catch (err) {
    const duration = performance.now() - start;
    reportResult(
      'Developer API Unary Roundtrip',
      'FAIL',
      duration,
      'Exception thrown during JS unary test',
      err.stack || err.message
    );
  }
}

async function testDeveloperApiStreaming(baseUrl) {
  const start = performance.now();
  try {
    const resolver = new BackendResolver({
      config: { target: 'googleAI', customBaseUrl: baseUrl },
      apiKey: 'test-api-key',
    });
    const client = new InteractionsClient(resolver);

    const { stream } = await client.createStream({
      model: 'gemini-2.5-flash',
      input: 'Stream tokens from JS!',
    });

    let chunkCount = 0;
    let sawDone = false;
    for await (const chunk of stream) {
      chunkCount++;
      if (chunk.isDone) {
        sawDone = true;
      }
    }

    if (!sawDone) {
      throw new Error('Stream terminated without [DONE] event');
    }
    if (chunkCount === 0) {
      throw new Error('No SSE stream chunks received');
    }

    const duration = performance.now() - start;
    reportResult(
      'Developer API SSE Stream Chunk Decoding',
      'PASS',
      duration,
      `Received ${chunkCount} SSE chunks and verified terminal [DONE]`
    );
  } catch (err) {
    const duration = performance.now() - start;
    reportResult(
      'Developer API SSE Stream Chunk Decoding',
      'FAIL',
      duration,
      'Exception thrown during JS SSE stream test',
      err.stack || err.message
    );
  }
}

async function testAgentPlatformUnary(baseUrl) {
  const start = performance.now();
  try {
    const resolver = new BackendResolver({
      config: {
        target: { agentPlatform: { location: 'us-central1' } },
        projectId: 'test-project',
        customBaseUrl: baseUrl,
      },
      apiKey: '',
      authToken: 'mock-bearer-token',
    });
    const client = new InteractionsClient(resolver);

    const interaction = await client.create({
      input: 'Hello from Agent Platform JS!',
    });

    if (!interaction.id) {
      throw new Error('Missing interaction ID in response');
    }
    if (interaction.status !== 'COMPLETED') {
      throw new Error(`Unexpected status: ${interaction.status}`);
    }

    const duration = performance.now() - start;
    reportResult(
      'Agent Platform Unary Roundtrip',
      'PASS',
      duration,
      `Successfully authenticated with Bearer token, id: ${interaction.id}`
    );
  } catch (err) {
    const duration = performance.now() - start;
    reportResult(
      'Agent Platform Unary Roundtrip',
      'FAIL',
      duration,
      'Exception thrown during JS Agent Platform test',
      err.stack || err.message
    );
  }
}

async function testSessionMultiTurnChaining(baseUrl) {
  const start = performance.now();
  try {
    const resolver = new BackendResolver({
      config: { target: 'googleAI', customBaseUrl: baseUrl },
      apiKey: 'test-api-key',
    });
    const client = new InteractionsClient(resolver);
    const session = client.startSession({ model: 'gemini-2.5-flash' });

    const res1 = await session.sendMessage('My name is Bob');
    const id1 = session.currentInteractionId;
    if (!id1 || id1 !== res1.id) {
      throw new Error('Session did not record first turn interaction ID');
    }

    const res2 = await session.sendMessage('What is my name?');
    const id2 = session.currentInteractionId;
    if (!id2 || id2 !== res2.id) {
      throw new Error('Session did not advance to second turn interaction ID');
    }

    if (session.history.length !== 2) {
      throw new Error(`Expected 2 history records, got ${session.history.length}`);
    }

    const duration = performance.now() - start;
    reportResult(
      'Stateful Session Multi-Turn Chaining',
      'PASS',
      duration,
      `Successfully chained turn 1 (${id1}) -> turn 2 (${id2})`
    );
  } catch (err) {
    const duration = performance.now() - start;
    reportResult(
      'Stateful Session Multi-Turn Chaining',
      'FAIL',
      duration,
      'Exception during multi-turn session test',
      err.stack || err.message
    );
  }
}

async function testAutonomousToolCallingLoop(baseUrl) {
  const start = performance.now();
  try {
    const resolver = new BackendResolver({
      config: { target: 'googleAI', customBaseUrl: baseUrl },
      apiKey: 'test-api-key',
    });
    const client = new InteractionsClient(resolver);

    const session = client.startSession({
      model: 'gemini-2.5-flash',
      tools: [
        {
          functionDeclarations: [
            {
              name: 'getCurrentWeather',
              description: 'Get the current weather for a city',
              parameters: {
                type: 'OBJECT',
                properties: {
                  location: { type: 'STRING' },
                },
                required: ['location'],
              },
            },
          ],
        },
      ],
    });

    let toolWasCalled = false;
    session.registerTool('getCurrentWeather', async (args) => {
      toolWasCalled = true;
      return {
        location: args.location || 'New York',
        temperature: 75,
        condition: 'Sunny',
      };
    });

    const finalRes = await session.sendMessage('What is the weather in New York?');

    if (!toolWasCalled) {
      throw new Error('Local tool getCurrentWeather was never called');
    }
    if (finalRes.status !== 'COMPLETED') {
      throw new Error(`Expected final status COMPLETED, got: ${finalRes.status}`);
    }

    const duration = performance.now() - start;
    reportResult(
      'Autonomous Client-Side Tool Loop',
      'PASS',
      duration,
      `Autonomous tool dispatch executed and synthesized final interaction ${finalRes.id}`
    );
  } catch (err) {
    const duration = performance.now() - start;
    reportResult(
      'Autonomous Client-Side Tool Loop',
      'FAIL',
      duration,
      'Exception during tool loop test',
      err.stack || err.message
    );
  }
}

async function testPolymorphicOneOfRoundtrip(baseUrl) {
  const start = performance.now();
  try {
    const resolver = new BackendResolver({
      config: { target: 'googleAI', customBaseUrl: baseUrl },
      apiKey: 'test-api-key',
    });
    const client = new InteractionsClient(resolver);

    const agentConfig = {
      type: 'antigravity',
      model: 'gemini-2.5-flash',
      max_total_tokens: '2048',
    };

    const interaction = await client.create({
      agent: 'agents/research-agent',
      agentConfig: agentConfig,
      input: 'Verify polymorphic oneOf AgentConfig roundtrip in JS',
    });

    if (!interaction.agent_config) {
      throw new Error('Response interaction.agent_config was undefined after roundtrip');
    }
    if (interaction.agent_config.type !== 'antigravity') {
      throw new Error(`Expected echoed agent_config.type === 'antigravity', got: ${interaction.agent_config.type}`);
    }
    if (interaction.agent_config.max_total_tokens !== '2048') {
      throw new Error(`Expected echoed max_total_tokens === '2048', got: ${interaction.agent_config.max_total_tokens}`);
    }

    const duration = performance.now() - start;
    reportResult(
      'Polymorphic oneOf Union Roundtrip',
      'PASS',
      duration,
      `Verified AntigravityAgentConfig polymorphic oneOf wire roundtrip (type=${interaction.agent_config.type})`
    );
  } catch (err) {
    const duration = performance.now() - start;
    reportResult(
      'Polymorphic oneOf Union Roundtrip',
      'FAIL',
      duration,
      'Exception during JS polymorphic oneOf union roundtrip test',
      err.stack || err.message
    );
  }
}

async function main() {
  const baseUrl = (process.argv[2] || '').replace(/\/+$/, '');
  if (!baseUrl) {
    console.error('Usage: node test_js_e2e.mjs <base_url>');
    process.exit(1);
  }

  await testDeveloperApiUnary(baseUrl);
  await testDeveloperApiStreaming(baseUrl);
  await testAgentPlatformUnary(baseUrl);
  await testPolymorphicOneOfRoundtrip(baseUrl);
  await testSessionMultiTurnChaining(baseUrl);
  await testAutonomousToolCallingLoop(baseUrl);
}

main();
