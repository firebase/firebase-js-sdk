import { expect } from "chai";
import { getGenerativeModel, getVertexAI } from "../src";
import { MODEL_NAME, generationConfig, systemInstruction, safetySettings, config } from "./constants";
import { initializeApp } from "@firebase/app";

// Token counts are only expected to differ by at most this number of tokens.
// Set to 1 for whitespace that is not always present.
const TOKEN_COUNT_DELTA = 1;

describe('Generate Content', () => {

  before(() => initializeApp(config))

  it('generateContent', async () => {
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

    const result = await model.generateContent("Where is Google headquarters located? Answer with the city name only.");
    const response = result.response;
    
    const trimmedText = response.text().trim();
    expect(trimmedText).to.equal('Mountain View');

    console.log(JSON.stringify(response));

    expect(response.usageMetadata).to.not.be.null;
    expect(response.usageMetadata!.promptTokenCount).to.be.closeTo(21, TOKEN_COUNT_DELTA);
  });
});