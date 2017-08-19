declare var $: any;
declare var $$: any;
declare var browser: any;
declare var window: any;
import { expect } from 'chai';

const testUrl = 'http://localhost:5002';

function createNewPost(title: string) {
  browser.click('#add');
  browser.waitForVisible('#message-form');
  browser.setValue('#new-post-title', title);
  browser.setValue('#new-post-message', `Test post`);
  browser.click('button[type=submit]');
  browser.waitForVisible('#user-posts-list');
}

function clearSession() {
  browser.execute(() => {
    window.firebase.auth().signOut();
    window.firebase.auth().signInAnonymously();
  });

  waitForSession();

  browser.click('#menu-recent');
  browser.waitUntil(() => {
    const classes = browser.getAttribute('#menu-recent', 'class');
    return ~classes.indexOf('is-active');
  });
}

function waitForSession() {
  browser.waitUntil(() => {
    return browser.execute(() => {
      return (
        window.firebase &&
        window.firebase.auth() &&
        !!window.firebase.auth().currentUser
      );
    }).value;
  });
}

describe('Database Tests', function() {
  beforeEach(function() {
    browser.url(testUrl);
    expect(browser.getTitle()).to.equal('Firebase Database Quickstart');

    browser.waitUntil(() => browser.execute(() => !!window.firebase).value);

    clearSession();
  });
  it('Should properly post a new topic (db push)', function() {
    const title = `Post at (${new Date().getTime()})`;

    createNewPost(title);

    const text = browser.getText(
      '#user-posts-list .post .mdl-card__title-text'
    );
    expect(text).to.equal(title);
  });
  it('Should properly like a post (db transaction)', function() {
    createNewPost('Likable Post');

    browser.click('#user-posts-list .post .star .not-starred');
    const count = browser.getText('#user-posts-list .post .star .star-count');

    expect(parseInt(count, 10)).to.equal(1);
  });
  it('Should properly read a post/like from another user', function() {
    const title = `Likable Post (${new Date().getTime()})`;

    createNewPost(title);
    browser.click('#user-posts-list .post:first-child .star .not-starred');

    clearSession();

    browser.waitForExist('#recent-posts-list .post');

    const createdPost = $(`h4=${title}`).$('../../..');
    const initialCount = parseInt(createdPost.$('.star-count').getText(), 10);
    expect(initialCount).to.not.be.undefined;

    createdPost
      .$$('.star .material-icons')
      .filter((el: any) => el.isVisible())
      .reduce((val: any, el: any) => val || el, null)
      .click();

    const finalCount = parseInt(createdPost.$('.star-count').getText(), 10);

    expect(finalCount).to.equal(initialCount + 1);
  });
});
