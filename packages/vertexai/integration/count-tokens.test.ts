import { expect } from "chai";
import { Modality, getGenerativeModel, getVertexAI } from "../src";
import { MODEL_NAME, generationConfig, systemInstruction, safetySettings, } from "./constants";
import { initializeApp } from "@firebase/app";
import { FIREBASE_CONFIG } from "./firebase-config";

describe('Count Tokens', () => {

  before(() => initializeApp(FIREBASE_CONFIG))

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
  // TODO (dlarocque): Test countTokens() with the following:
  // - inline data
  // - public storage reference
  // - private storage reference (testing auth integration)
  // - count tokens
  // - JSON schema
});