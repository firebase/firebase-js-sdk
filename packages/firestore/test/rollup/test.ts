import { expect } from "chai";

describe("Rollup Tests", () => {
      it("node.js commonjs scripts should use node.cjs bundle", () => {
      expect(2).to.equal(42);
   });
});
