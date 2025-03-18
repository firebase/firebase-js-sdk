import { initializeApp } from "@firebase/app";
import { Content, GenerationConfig, HarmBlockMethod, HarmBlockThreshold, HarmCategory, Modality, SafetySetting, getGenerativeModel, getVertexAI } from "../src";
import { expect } from "chai";

// TODO (dlarocque): Use seperate Firebase config specifically for Vertex AI
// TODO (dlarocque): Load this from environment variables, so we can set the config as a 
// secret in CI.
export const config = {
  apiKey: "AIzaSyBNHCyZ-bpv-WA-HpXTmigJm2aq3z1kaH8",
  authDomain: "jscore-sandbox-141b5.firebaseapp.com",
  databaseURL: "https://jscore-sandbox-141b5.firebaseio.com",
  projectId: "jscore-sandbox-141b5",
  storageBucket: "jscore-sandbox-141b5.appspot.com",
  messagingSenderId: "280127633210",
  appId: "1:280127633210:web:1eb2f7e8799c4d5a46c203",
  measurementId: "G-1VL38N8YFE"
};

initializeApp(config);
const MODEL_NAME = 'gemini-1.5-pro'; 

let generationConfig: GenerationConfig = {
  temperature: 0,
  topP: 0,
  topK: 1,
  responseMimeType: 'text/plain'
}

let safetySettings: SafetySetting[] = [
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

let systemInstruction: Content = {
  role: 'system',
  parts: [
    {
      text: 'You are a friendly and helpful assistant.'
    }
  ]
};

describe('VertexAIService', () => {
  it('CountTokens text', async () => {
    const vertexAI = getVertexAI(); 
    const model = getGenerativeModel(
      vertexAI, 
      {
        model: MODEL_NAME, 
        generationConfig,
        systemInstruction,
        safetySettings
      }
    );

    let response = await model.countTokens('Why is the sky blue?');

    expect(response.totalTokens).to.equal(6);
    expect(response.totalBillableCharacters).to.equal(16);
    expect(response.promptTokensDetails).to.not.be.null;
    expect(response.promptTokensDetails!.length).to.equal(1);
    expect(response.promptTokensDetails![0].modality).to.equal(Modality.TEXT);
    expect(response.promptTokensDetails![0].tokenCount).to.equal(6);
  });
});