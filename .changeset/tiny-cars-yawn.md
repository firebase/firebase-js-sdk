---
'@firebase/ai': minor
---

Deprecate `VertexAIBackend` in favor of `AgentPlatformBackend` to reflect the renaming of Vertex AI to Gemini Enterprise Agent Platform.

The default location for `AgentPlatformBackend` is now `global` instead of `us-central1` (no other functionality has changed). To continue using `us-central1`, specify `getAI(app, { backend: new AgentPlatformBackend('us-central1') })` when initiializing the SDK.