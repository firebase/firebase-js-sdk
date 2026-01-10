# Firestore JavaScript SDK Developer Documentation

This folder contains the developer documentation for the Firestore JavaScript SDK. 

**Audience:**
1.  **Maintainers**: Engineers working on the SDK internals.
2.  **AI Agents**: Automated assistants reading this consistency to understand the codebase.

**NOT Audience:**
-   3rd Party Developers (App Developers). They should use the [official Firebase documentation](https://firebase.google.com/docs/firestore).

# Entry Point
Start at [./overview.md](./overview.md).

# Content Guidelines

## Principles
-   **High-Level Focus**: Explain architecture and data flow. Avoid duplicating code.
-   **Why > How**: Explain *why* a design choice was made. The code shows *how*.
-   **Reference by Name**: Use exact component/interface names (e.g., `Persistence`, `EventManager`).

## Terminology
-   **Concepts First**: **Aggressively favor** high-level English concepts over code identifiers. Only drop down to code identifiers when absolutely necessary for precise mapping.
    *   *Good*: "The Mutation Queue stores pending writes."
    *   *Bad*: "The `mutationQueues` store contains `DbMutationBatch` objects."
    *   *Acceptable (Mapping)*: "The Mutation Queue (implemented as `mutationQueues` store)..."
-   **Avoid Over-Specification**: Do not generally reference private/internal variable names unless documenting that specific module's internals.
-   **Strict Casing**: When you *must* reference code, use the **exact casing** found in the codebase (e.g., `mutationQueues`).
-   **No "Translations"**: Never convert code names into snake_case. Either use the English Concept ("Remote Documents") or the exact Code Name (`remoteDocuments`).

## Diagramming
Use **Mermaid** for diagrams.
-   Flowcharts for logic.
-   Sequence diagrams for async protocols.
-   Class diagrams for component relationships.

# Style Guide
-   **Syntax**: Markdown (GFM).
-   **Voice**: Active voice ("The SDK does X").
-   **Tense**: Present tense ("The query executes...").
-   **Mood**: Imperative for instructions ("Run the build...").
-   **Conciseness**: Short sentences. Bullet points where possible.

# Maintenance
-   **Co-location**: Keep documentation close to the code it describes (linked via `Code Layout`).
-   **Atomic Updates**: Update documentation in the *same PR* as the feature or fix.
-   **Freshness**: If you see stale docs, fix them immediately.
