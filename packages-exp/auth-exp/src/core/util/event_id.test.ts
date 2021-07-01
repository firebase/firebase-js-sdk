import { expect } from 'chai';
import { _generateEventId } from './event_id';

describe('core/util/event_id', () => {
  it('sub-15 digit id', () => {
    expect(_generateEventId('', 10)).to.have.length(10);
  });

  it('15 digit id', () => {
    expect(_generateEventId('', 15)).to.have.length(15);
  });

  it('above-15 digit id', () => {
    expect(_generateEventId('', 20)).to.have.length(20);
  });
});