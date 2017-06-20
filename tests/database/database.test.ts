import { expect } from "chai";
import firebase from "../../src/app";
import { 
  TEST_PROJECT,
  patchFakeAuthFunctions,
} from "./helpers/util";
import "../../src/database";

describe('Database Tests', function() {
  var defaultApp;

  beforeEach(function() {
    defaultApp = firebase.initializeApp({databaseURL: TEST_PROJECT.databaseURL});
    patchFakeAuthFunctions(defaultApp);
  });

  afterEach(function() {
    return defaultApp.delete();
  });

  it('Can get database.', function() {
    var db = firebase.database();
    expect(db).to.not.be.undefined;
    expect(db).not.to.be.null;
  });

  it('Illegal to call constructor', function() {
    expect(function() {
      var db = new firebase.database.Database('url');
    }).to.throw(/don't call new Database/i);
  });

  it('Can get app', function() {
    var db = firebase.database();
    expect(db.app).to.not.be.undefined;
    expect((db.app as any) instanceof firebase.app.App);
  });

  it('Can get root ref', function() {
    var db = firebase.database();

    var ref = db.ref();

    expect(ref instanceof firebase.database.Reference).to.be.true;
    expect(ref.key).to.be.null;
  });

  it('Can get child ref', function() {
    var db = firebase.database();

    var ref = db.ref('child');

    expect(ref instanceof firebase.database.Reference).to.be.true;
    expect(ref.key).to.equal('child');
  });

  it('Can get deep child ref', function() {
    var db = firebase.database();

    var ref = db.ref('child/grand-child');

    expect(ref instanceof firebase.database.Reference).to.be.true;
    expect(ref.key).to.equal('grand-child');
  });

  it('ref() validates arguments', function() {
    var db = firebase.database();
    expect(function() {
      var ref = (db as any).ref('path', 'extra');
    }).to.throw(/Expects no more than 1/);
  });

  it('Can get refFromURL()', function() {
    var db = firebase.database();
    var ref = db.refFromURL(TEST_PROJECT.databaseURL + '/path/to/data');
    expect(ref.key).to.equal('data');
  });

  it('refFromURL() validates domain', function() {
    var db = firebase.database();
    expect(function() {
      var ref = db.refFromURL('https://thisisnotarealfirebase.firebaseio.com/path/to/data');
    }).to.throw(/does not match.*database/i);
  });

  it('refFromURL() validates argument', function() {
    var db = firebase.database();
    expect(function() {
      var ref = (db as any).refFromURL();
    }).to.throw(/Expects at least 1/);
  });
});
