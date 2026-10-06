---
'@firebase/ai': major
'firebase': major
---

Removed APIs that were previously deprecated.

Removed the previously deprecated `VertexAIBackend` (and `BackendType.VERTEX_AI`). Use `AgentPlatformBackend` (and `BackendType.AGENT_PLATFORM`) instead.

The only difference for `AgentPlatformBackend` is the default
[location for accessing the model](https://firebase.google.com/docs/ai-logic/locations?api=vertex).
The default location for `AgentPlatformBackend` is `global`, whereas the default location for `VertexAIBackend` was `us-central1`. To use `us-central1` with `AgentPlatformBackend`, specify `getAI(app, { backend: new AgentPlatformBackend('us-central1') })` when initializing the SDK. However, note that most new Gemini models do not support `us-central1`.

Updated default hybrid-in-cloud model to `gemini-3.5-flash-lite`.
