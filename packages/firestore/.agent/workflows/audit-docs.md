---
description: Audits documentation to ensure they adhere to the style guide
---

1.  **Preparation**:
    *   Read the style guide at @devdocs/STYLE_GUIDE.md.
    *   Read the root documentation: @devdocs/overview.md and @devdocs/architecture.md to establish the "Assumed Knowledge".

2.  **Audit Execution**:
    *   Recursively list all markdown files in `packages/firestore/devdocs` using depth first search starting with `overview.md`.
    *   For each file (excluding `STYLE_GUIDE.md`), verify it against the **Verification Checklist** below.

3.  **Reporting**:
    *   Create an artifact named `audit_report.md` in the current artifact directory.
    *   In the report, group findings by file.
    *   For each violation, cite the specific rule from the STYLE_GUIDE that was broken.
    *   If a file is perfect, mark it as "PASS".

## Verification Checklist

### 1. Navigation & Structure
*   [ ] **Breadcrumb**: Does the first paragraph contain a link to the parent component in any sentence? (Exception: `overview.md` does not need this).
*   [ ] **Refresher**: Does it start with a 1-2 sentence high-level summary of the problem?
*   [ ] **Prerequisites**: Are dependencies listed at the top (excluding `overview.md` and `architecture.md`)?
*   [ ] **Outline**: If the file is long (>300 lines), is there a TOC or Documentation Map?

### 2. Concepts & Terminology
*   [ ] **English Concepts**: Does it use English terms (e.g., "Mutation Queue") instead of code identifiers (e.g., `mutationQueue`) in narrative text?
*   [ ] **Why > How**: Does it explain the architectural intent before listing class names?
*   [ ] **Accuracy**: Does it describe the *current* state (no aspirational features)?
*   [ ] **No Legacy**: Are deprecated APIs avoided unless necessary for migration?

### 3. Voice, Tone & Perspective
*   [ ] **Audience**: Is it written for a Fellow Maintainer (not an App Developer)?
*   [ ] **Second Person**: Does it address the reader as "You"?
*   [ ] **Present Tense**: "Returns X" (Pass) vs "Will return X" (Fail).
*   [ ] **Active Voice**: "The Server handles X" (Pass) vs "X is handled by the Server" (Fail).
*   [ ] **Respectful**: Is it free of slang and unnecessary complexity?

### 4. Formatting & Polish
*   [ ] **Relative Links**: Are all links relative (`./doc.md`)?
*   [ ] **Diagrams**: Are complex flows visualized with Mermaid?
*   [ ] **Code Formatting**: Are variables wrapped in backticks?
*   [ ] **UI Elements**: Are buttons/menus bolded (e.g., **Save**)?