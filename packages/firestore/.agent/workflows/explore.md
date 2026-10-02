---
description: Systematically explore a codebase to understand structure, purpose, and dependencies.
---

1.  **Preparation & Knowledge Check**
    *   **Check Knowledge Items (KIs)**: ALways start by checking your available KIs. A "new" topic might already be documented.
    *   **Define Scope**: Identify specific files, directories, or concepts to explore. If vague, ask clarifying questions.

2.  **Targeted Documentation Review**
    *   **Map Documentation**: Use `list_dir` on `devdocs/` (or similar) to see available documentation.
    *   **Search Docs**: Use `grep_search` within the documentation directory for keywords related to your target.
    *   **Read Context**: Read the most relevant docs *before* diving into code.

3.  **Structural High-Level Analysis**
    *   **Explore Neighborhood**: Use `list_dir` on the target code directory to see related files.
    *   **Skeletal View**: Use `view_file_outline` on key files to understand their primary components (classes, functions, types) without reading every line.

4.  **Usage & Reference Tracing**
    *   **Find Usages**: Use `grep_search` on the broader codebase to see where the target component is instantiated or called. This reveals its *role* in the system.
    *   **Check Entry Points**: Trace how execution reaches this code from public APIs or main entry points (like `index.ts`).

5.  **Detailed Implementation Review**
    *   **Read Critical Code**: Use `view_file` on the core logic identified in previous steps.
    *   **Trace Data**: Follow important data structures or parameters.

6.  **Synthesis & Reporting**
    *   **Explain "Why"**: Focus on the *purpose* of the code. Why does it exist? What problem does it solve? (Adhere to `STYLE_GUIDE.md` principles).
    *   **Update Knowledge**: If this exploration yielded reusable knowledge, propose a new or updated Knowledge Item (KI).
    *   **Summarize**: Present findings clearly to the user, linking concepts to code.