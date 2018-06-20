import { FirebaseApp as IFirebaseApp, FirebaseOptions } from "@firebase/app-types";
import { ReplaySubject } from 'rxjs'; 

const DEFAULT = '[DEFAULT]';

export interface AppEvent {
  type: string,
  payload?: any
}

export class FirebaseApp implements IFirebaseApp {
  private _name: string;
  private _options: FirebaseOptions;
  private _automaticDataCollectionEnabled: boolean = false;
  private _isDestroyed: boolean = false;

  public event$: ReplaySubject<AppEvent> = new ReplaySubject();

  constructor(options: FirebaseOptions, name: string = DEFAULT) {
    this._options = Object.assign({}, options);
    this._name = name;

    this.event$.next({ type: "created" });
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
    
    this.event$.next({ type: "deleted" });
    this.event$.complete();
  }

  private _checkDestroyed() {
    if (this._isDestroyed) {
      throw new Error('app-deleted');
    }
  }
}