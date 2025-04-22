import { expect } from "chai";
import { GoogleAIBackend, VertexAIBackend } from "./backend";
import { BackendType } from "./public-types";
import { DEFAULT_LOCATION } from "./constants";

describe('Backend', () => {
  describe('GoogleAIBackend', () => {
  it('sets backendType to GOOGLE_AI', () => {
      const backend = new GoogleAIBackend();
      expect(backend.backendType).to.equal(BackendType.GOOGLE_AI);
    });
  });
  describe('VertexAIBackend', () => {
    it('set backendType to VERTEX_AI', () => {
      const backend = new VertexAIBackend();
      expect(backend.backendType).to.equal(BackendType.VERTEX_AI);
      expect(backend.location).to.equal(DEFAULT_LOCATION);
    });
    it('sets custom location', () => {
      const backend = new VertexAIBackend('test-location');
      expect(backend.backendType).to.equal(BackendType.VERTEX_AI);
      expect(backend.location).to.equal('test-location');
    });
    it('sets custom location even if empty string', () => {
      const backend = new VertexAIBackend('');
      expect(backend.backendType).to.equal(BackendType.VERTEX_AI);
      expect(backend.location).to.equal('');
    });
    it('uses default location if location is null', () => {
      const backend = new VertexAIBackend(null as any);
      expect(backend.backendType).to.equal(BackendType.VERTEX_AI);
      expect(backend.location).to.equal(DEFAULT_LOCATION);
    });
  });
});