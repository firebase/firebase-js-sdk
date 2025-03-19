import { Content, GenerationConfig, HarmBlockMethod, HarmBlockThreshold, HarmCategory, SafetySetting } from "../src";

export const MODEL_NAME = 'gemini-1.5-pro'; 

export const generationConfig: GenerationConfig = {
  temperature: 0,
  topP: 0,
  responseMimeType: 'text/plain'
}

export const safetySettings: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    method: HarmBlockMethod.PROBABILITY
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    method: HarmBlockMethod.SEVERITY
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
];

export const systemInstruction: Content = {
  role: 'system',
  parts: [
    {
      text: 'You are a friendly and helpful assistant.'
    }
  ]
};