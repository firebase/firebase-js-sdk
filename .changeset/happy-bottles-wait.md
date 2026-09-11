---
'@firebase/ai': major
'firebase': minor
---

Refactored `TemplateGenerativeModel.generateContent` and `TemplateGenerativeModel.generateContentStream` to accept a unified `TemplateRequest` object (`{ templateId, templateVariables, toolConfig? }`) as the first parameter.
Made templateVariables required in both TemplateRequest and StartTemplateChatParams