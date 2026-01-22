# Google Developer Documentation Style Guide (Succinct)

This guide summarizes the key points of the [Google Developer Documentation Style Guide](https://developers.google.com/style) and specific rules for the Firestore JavaScript SDK.

## Audience
*   **Maintainers**: Engineers working on the SDK internals.
*   **AI Agents**: Automated assistants reading this consistency to understand the codebase.
*   **NOT Audience**: 3rd Party Developers (App Developers). They should use the [official Firebase documentation](https://firebase.google.com/docs/firestore).

## Voice and Tone
*   **Conversational and Friendly**: Be precise, correct, and clear, but not cold or rote.
*   **Respectful**: Avoid slang, bias, and needless complexity.

## Point of View
*   **Second Person**: Address the reader as "you".
    *   *Good*: "You can configure the server..."
    *   *Bad*: "The user can configure the server..."

## Tense and Voice
*   **Present Tense**: Use present tense for most things.
    *   *Good*: "The function returns..."
    *   *Bad*: "The function will return..."
*   **Active Voice**: Make it clear who is doing the action.
    *   *Good*: "The server handles the request."
    *   *Bad*: "The request is handled by the server."

## Clarity
*   **Keep it Simple**: Use short sentences and simple words.
*   **Avoid Jargon**: Define terms if you must use them.

## Formatting
*   **Lists**: Use bullet points for unordered lists and numbered lists for steps.
*   **Code**: Use backticks for code elements (e.g., `variableName`).
*   **Bold**: Use bold for UI elements (e.g., **Save** button).

## Maintainability
*   **Focus on concepts**: Explain the *architecture* and *data flow* rather than implementation details. This makes docs resilient to refactoring.
    *   *Good*: "The persistence layer caches mutations."
    *   *Bad*: "The `LocalStore` class calls `appendMutation`."
*   **Why > How**: Explain *why* a design choice was made. The code shows *how*.
*   **Avoid Duplication**: Do not duplicate code logic in text. If the code changes, the docs will rot.
*   **Co-location**: Keep documentation close to the code it describes (linked via `Code Layout`).
*   **Atomic Updates**: Update documentation in the *same PR* as the feature or fix.
*   **Freshness**: If you see stale docs, fix them immediately.

## Terminology
*   **Concepts First**: **Aggressively favor** high-level English concepts over code identifiers. Only drop down to code identifiers when absolutely necessary for precise mapping.
    *   *Good*: "The Mutation Queue stores pending writes."
    *   *Bad*: "The `mutationQueues` store contains `DbMutationBatch` objects."
*   **Strict Casing**: When you *must* reference code, use the **exact casing** found in the codebase (e.g., `mutationQueues`).
*   **No "Translations"**: Never convert code names into snake_case. Either use the English Concept ("Remote Documents") or the exact Code Name (`remoteDocuments`).

## Progressive Disclosure
*   **Start High-Level**: Always start with the "What" and "Why" before diving into the "How".
*   **Link to Details**: Keep the main text focused on concepts and link to separate files or sections for implementation details (e.g., "See [Transactions](./transactions.md) for implementation details").
*   **Verify**: Ensure this pattern is applied consistently to prevent information overload.

## Accuracy and Relevance
*   **Current State**: Document the *current* implementation, not aspirational future states.
*   **Historical Context**: Avoid mentioning legacy formats or deprecated APIs unless strictly necessary (e.g., for schema migrations).
*   **Focus**: Keep the documentation focused on what exists *now* to avoid confusion.

## Navigation and Structure
*   **Breadcrumbing**: Deep-dive files must distinctively link back to the parent concept in the [Architecture](./architecture.md) or [Overview](./overview.md). (e.g., "Part of the [Persistence](./architecture.md#persistence) system").
*   **Explicit Prerequisites**: List specific dependencies at the top.
    *   *Exception*: `overview.md` and `architecture.md` are **assumed knowledge** and should NOT be listed as prerequisites.
    *   *Example*: "Prerequisites: Read [Query Engine](./query-execution.md) first."
*   **Contextual Refresher**: Deep dives must start with a 1-2 sentence "Refresher" summary of the parent concept/problem before going deep.
*   **Clear Purpose**: Every file must start with a high-level summary of **what** it covers and **why** it exists.
*   **Outlines**: Complex overview files must have a "Documentation Map" or Outline section linking to useful topics.

## Best Practices
*   **Diagrams**: Use **Mermaid** for complex flows, state machines, or class relationships.
*   **Links**: Use relative paths for file links (e.g., `[Overview](./overview.md)`). This ensures links work in GitHub and IDEs.
