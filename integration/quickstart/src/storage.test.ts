declare var browser: any;
declare var window: any;

import { expect } from 'chai';
import { resolve } from 'path';
import 'isomorphic-fetch';

describe('Storage Tests', function() {
  beforeEach(function() {
    browser.url('http://localhost:5001');
    expect(browser.getTitle()).to.equal(
      'Firebase SDK for Cloud Storage Quickstart'
    );

    // Pause to allow for anonymous sign in (POTENTIAL RACE CONDITION HERE)
    browser.waitUntil(() => {
      const result = browser.execute(
        () =>
          window.firebase &&
          window.firebase.auth() &&
          !!window.firebase.auth().currentUser
      );

      return result.value;
    });
  });
  it('Should properly upload a file with anonymous auth', async function() {
    browser.chooseFile('#file', resolve(__dirname, './test.json'));
    const textSelector = '#linkbox a';
    browser.waitForExist(textSelector, 5000);
    const url = browser.getAttribute(textSelector, 'href');

    expect(url).to.contain('firebasestorage');

    const file = await fetch(url);
    expect(await file.json()).to.deep.equal(require('./test.json'));
  });
});
