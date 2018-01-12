import { expect } from "chai";
import { testFxn } from "../src";

describe('Simple test', () => {
  it('Should skip this test');
  it('Should test this fxn', () => {
    expect(testFxn()).to.equal(42);
  });
  it('Should test this async thing', async () => {
    // Do some async assertions, you can use `await` syntax if it helps
    const val = await Promise.resolve(42);
    expect(val).to.equal(42);
  });
});
