import { expect } from "chai";
import { Modality, getGenerativeModel, getVertexAI } from "../src";
import { MODEL_NAME, generationConfig, systemInstruction, safetySettings } from "./constants";
import { initializeApp } from "@firebase/app";
import { FIREBASE_CONFIG } from "./firebase-config";

// Token counts are only expected to differ by at most this number of tokens.
// Set to 1 for whitespace that is not always present.
const TOKEN_COUNT_DELTA = 1;

describe('Generate Content', () => {

  before(() => initializeApp(FIREBASE_CONFIG))

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

    expect(response.usageMetadata).to.not.be.null;
    expect(response.usageMetadata!.promptTokenCount).to.be.closeTo(21, TOKEN_COUNT_DELTA);
    expect(response.usageMetadata!.candidatesTokenCount).to.be.closeTo(4, TOKEN_COUNT_DELTA);
    expect(response.usageMetadata!.totalTokenCount).to.be.closeTo(25, TOKEN_COUNT_DELTA*2);
    expect(response.usageMetadata!.promptTokensDetails).to.not.be.null;
    expect(response.usageMetadata!.promptTokensDetails!.length).to.equal(1);
    expect(response.usageMetadata!.promptTokensDetails![0].modality).to.equal(Modality.TEXT);
    expect(response.usageMetadata!.promptTokensDetails![0].tokenCount).to.equal(21);
    expect(response.usageMetadata!.candidatesTokensDetails).to.not.be.null;
    expect(response.usageMetadata!.candidatesTokensDetails!.length).to.equal(1);
    expect(response.usageMetadata!.candidatesTokensDetails![0].modality).to.equal(Modality.TEXT);
    expect(response.usageMetadata!.candidatesTokensDetails![0].tokenCount).to.equal(4);
  });
  // TODO (dlarocque): Test generateContentStream
});