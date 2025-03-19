import { expect } from "chai";
import { Modality, getGenerativeModel, getVertexAI } from "../src";
import { MODEL_NAME, generationConfig, systemInstruction, safetySettings, config } from "./constants";
import { initializeApp } from "@firebase/app";

describe('Count Tokens', () => {

  before(() => initializeApp(config))

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