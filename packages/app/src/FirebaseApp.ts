import { FirebaseApp as IFirebaseApp, FirebaseOptions } from "@firebase/app-types";

const DEFAULT = '[DEFAULT]';

export class FirebaseApp implements IFirebaseApp {
  private _name: string;
  private _options: FirebaseOptions;
  private _automaticDataCollectionEnabled: boolean = false;
  private _isDestroyed: boolean = false;

  constructor(options: FirebaseOptions, name: string = DEFAULT) {
    this._options = Object.assign({}, options);
    this._name = name;
  }

  public get name() {
    this._checkDestroyed();
    return this._name;
  }

  public get automaticDataCollectionEnabled() {
    this._checkDestroyed();
    return this._automaticDataCollectionEnabled;
  }

  public set automaticDataCollectionEnabled(val) {
    this._checkDestroyed();
    this._automaticDataCollectionEnabled = val;
  }

  public get options() {
    this._checkDestroyed();
    return this._options;
  }

  public async delete() {
    this._checkDestroyed();
    this._isDestroyed = true;
  }

  private _checkDestroyed() {
    if (this._isDestroyed) {
      throw new Error('app-deleted');
    }
  }
}