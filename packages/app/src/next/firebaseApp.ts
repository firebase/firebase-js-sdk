import {
  FirebaseAppNext,
  FirebaseOptionsNext,
  FirebaseAppConfigNext
} from './types';
import { ComponentContainer } from '@firebase/component';
import { ERROR_FACTORY, AppError } from '../errors';

export class FirebaseAppImplNext implements FirebaseAppNext {
  private readonly options_: FirebaseOptionsNext;
  private readonly name_: string;
  private automaticDataCollectionEnabled_: boolean;
  private isDeleted = false;
  private readonly container: ComponentContainer;

  constructor(
    options: FirebaseOptionsNext,
    config: Required<FirebaseAppConfigNext>,
    container: ComponentContainer
  ) {
    this.options_ = { ...options };
    this.name_ = config.name;
    this.automaticDataCollectionEnabled_ =
      config.automaticDataCollectionEnabled;
    this.container = container;
  }

  get automaticDataCollectionEnabled(): boolean {
    this.checkDestroyed_();
    return this.automaticDataCollectionEnabled_;
  }

  set automaticDataCollectionEnabled(val: boolean) {
    this.checkDestroyed_();
    this.automaticDataCollectionEnabled_ = val;
  }

  get name(): string {
    this.checkDestroyed_();
    return this.name_;
  }

  get options(): FirebaseOptionsNext {
    this.checkDestroyed_();
    return this.options_;
  }

  /**
   * This function will throw an Error if the App has already been deleted -
   * use before performing API actions on the App.
   */
  private checkDestroyed_(): void {
    if (this.isDeleted) {
      throw ERROR_FACTORY.create(AppError.APP_DELETED, { appName: this.name_ });
    }
  }
}
