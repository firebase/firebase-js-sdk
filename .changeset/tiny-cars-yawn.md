---
'@firebase/ai': minor
'firebase': minor
---

Deprecated `VertexAIBackend` in favor of `AgentPlatformBackend` to reflect the renaming of Vertex AI to Gemini Enterprise Agent Platform.

The only difference for `AgentPlatformBackend` is the default [location for accessing the model](https://firebase.google.com/docs/ai-logic/locations?api=vertex). The default location for `AgentPlatformBackend` is `global`, whereas the default location for `VertexAIBackend` is `us-central1`. To use `us-central1` with `AgentPlatformBackend`, specify `getAI(app, { backend: new AgentPlatformBackend('us-central1') })` when initializing the SDK. However, note that most new Gemini models do not support `us-central1`.