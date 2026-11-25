---
description: Conducts a retro for the current session
---

1.  **Preparation**:
    *   Read the recent conversation history and any `task.md` or `implementation_plan.md` artifacts created.
    *   Identify the main goal of the session and whether it was achieved.

2.  **Reflection**:
    *   Analyze the specific tool calls and agent actions.
    *   Analyze any follow up instructions or corrections the user made.
    *   **What went well?** (Efficient tool usage, clear communication, etc.)
    *   **What didn't go well?** (failed tool calls, circular logic, misunderstanding user intent).
    *   **Root Cause Analysis**: For anything that didn't go well, why did it happen? (e.g., specific file missing, lack of context).

3.  **Output**:
    *   Create an artifact named `retro_report.md` in the current artifact directory.
    *   Include the following sections:
        *   **Summary**: A 1-2 sentence summary of the session.
        *   **Positives**: Bullet points of what worked.
        *   **Negatives**: Bullet points of issues encountered.
        *   **Actionable Improvements**: Concrete steps to avoid these issues in the future (e.g., "Always check `overview.md` first").