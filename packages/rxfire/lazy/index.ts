/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Observable, OperatorFunction as RxOperatorFunction, UnaryFunction, from, combineLatest, of } from 'rxjs'; 
import { app, firestore, auth, database, functions, storage, messaging } from 'firebase/app';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { collectionData } from 'rxfire/firestore';

class RxFireLazy {
  public app$: Observable<app.App>;
  public auth$: Observable<auth.Auth>;
  public firestore$: Observable<firestore.Firestore>;
  private firestoreSettings: firestore.Settings|undefined;
  private firestorePersistenceSettings: firestore.PersistenceSettings|undefined;
  public database$: Observable<database.Database>;
  private databaseURL: string|undefined;
  public storage$: Observable<storage.Storage>;
  private storageBucket: string|undefined;
  public functions$: Observable<functions.Functions>;
  private functionsRegion: string|undefined;
  public messaging$: Observable<messaging.Messaging>;
  private firestoreSettingsLocked = false;
  private databaseSettingsLocked = false;
  private storageSettingsLocked = false;
  private functionsSettingsLocked = false;
  constructor(settings: {}) {
    this.app$ = from(import('firebase/app')).pipe(
      map(firebase => firebase.initializeApp(settings)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.firestore$ = this.app$.pipe(
      tap(() => this.firestoreSettingsLocked = true),
      switchMap(app => import('firebase/firestore').then(() => app)),
      map(app => (app.firestore as any)(this.firestoreSettings) as firestore.Firestore),
      tap(firestore => {
        if (this.firestorePersistenceSettings) {
          firestore.enablePersistence(this.firestorePersistenceSettings);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    ) as any; // TODO kill the any here
    this.database$ = this.app$.pipe(
      tap(() => this.databaseSettingsLocked = true),
      switchMap(app => import('firebase/database').then(() => app)),
      map(app => app.database(this.databaseURL)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.storage$ = this.app$.pipe(
      tap(() => this.storageSettingsLocked = true),
      switchMap(app => import('firebase/storage').then(() => app)),
      map(app => app.storage(this.storageBucket)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.functions$ = this.app$.pipe(
      tap(() => this.functionsSettingsLocked = true),
      switchMap(app => import('firebase/functions').then(() => app)),
      map(app => app.functions(this.functionsRegion)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.messaging$ = this.app$.pipe(
      switchMap(app => import('firebase/messaging').then(() => app)),
      map(app => app.messaging()),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.auth$ = this.app$.pipe(
      switchMap(app => import('firebase/auth').then(() => app)),
      map(app => app.auth()),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }
  firestore(settings?: firestore.Settings) {
    if (!this.firestoreSettingsLocked) {
      this.firestoreSettings = settings || undefined;
    } else if (settings !== this.firestoreSettings) {
      throw new Error("Settings can only be changed before firestore$ is subscribed to, you should initialize a different app");
    }
    const promise = this.firestore$.toPromise() as Promise<firestore.Firestore>  & {enablePersistence: (settings?: firestore.PersistenceSettings) => Promise<firestore.Firestore>};
    promise.enablePersistence = (settings?: firestore.PersistenceSettings) => {
      if (this.firestoreSettingsLocked) {
        throw new Error("enablePersistence() should only be called before firestore$ is subscribed to, you should initialize a different app");
      } else {
        this.firestorePersistenceSettings = settings || {};
      }
      return this.firestore$.toPromise();
    };
    return promise;
  }
  database(databaseURL?: string) {
    if (!this.databaseSettingsLocked) {
      this.databaseURL  = databaseURL || undefined;
    } else if (databaseURL !== this.databaseURL) {
      throw new Error("Database URL can only be changed before database$ is subscribed to, you should initialize a different app");
    }
    return this.database$.toPromise();
  }
  storage(storageBucket?: string) {
    if (!this.storageSettingsLocked) {
      this.storageBucket = storageBucket || undefined;
    } else if (storageBucket !== this.storageBucket) {
      throw new Error("Storage bucket can only be changed before storage$ is subscribed to, you should initialize a different app");
    }
    return this.storage$.toPromise();
  }
  functions(functionsRegion?: string) {
    if (!this.functionsSettingsLocked) {
      this.functionsRegion = functionsRegion || undefined;
    } else if (functionsRegion !== this.functionsRegion) {
      throw new Error("Functions region can only be changed before functions$ is subscribed to, you should initialize a different app");
    }
    return this.storage$.toPromise();
  }
  auth() {
    return this.auth$.toPromise();
  }
  messaging() {
    return this.messaging$.toPromise();
  }
  
  lazy<A, B>(op1: RxfireLazyOperator<A,B>): Observable<B>;
  lazy<A, B, C>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>): Observable<C>;
  lazy<A, B, C, D>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>): Observable<D>;
  lazy<A, B, C, D, E>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>): Observable<E>;
  lazy<A, B, C, D, E, F>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>): Observable<F>;
  lazy<A, B, C, D, E, F, G>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>, op6: OperatorFunction<F, G>): Observable<G>;
  lazy<A, B, C, D, E, F, G, H>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>, op6: OperatorFunction<F, G>, op7: OperatorFunction<G, H>): Observable<H>;
  lazy<A, B, C, D, E, F, G, H, I>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>, op6: OperatorFunction<F, G>, op7: OperatorFunction<G, H>, op8: OperatorFunction<H, I>): Observable<I>;
  lazy<A, B, C, D, E, F, G, H, I, J>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>, op6: OperatorFunction<F, G>, op7: OperatorFunction<G, H>, op8: OperatorFunction<H, I>, op9: OperatorFunction<I, J>): Observable<J>;
  lazy<A, B, C, D, E, F, G, H, I, J>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>, op6: OperatorFunction<F, G>, op7: OperatorFunction<G, H>, op8: OperatorFunction<H, I>, op9: OperatorFunction<I, J>, ...operations: OperatorFunction<any, any>[]): Observable<{}>;
  lazy(op1: RxfireLazyOperator<any,any>, ...args: OperatorFunction<any, any>[])  {
    const operators = args.map(arg => isRxfireLazyOperator(arg) ? arg.operator(this) : arg);
    const source = op1.observable(this);
    return pipeFromArray(operators)(source);
  }


  eager<A, B>(op1: RxfireLazyOperator<A,B>): Promise<B>;
  eager<A, B, C>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>): Promise<C>;
  eager<A, B, C, D>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>): Promise<D>;
  eager<A, B, C, D, E>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>): Promise<E>;
  eager<A, B, C, D, E, F>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>): Promise<F>;
  eager<A, B, C, D, E, F, G>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>, op6: OperatorFunction<F, G>): Promise<G>;
  eager<A, B, C, D, E, F, G, H>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>, op6: OperatorFunction<F, G>, op7: OperatorFunction<G, H>): Promise<H>;
  eager<A, B, C, D, E, F, G, H, I>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>, op6: OperatorFunction<F, G>, op7: OperatorFunction<G, H>, op8: OperatorFunction<H, I>): Promise<I>;
  eager<A, B, C, D, E, F, G, H, I, J>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>, op6: OperatorFunction<F, G>, op7: OperatorFunction<G, H>, op8: OperatorFunction<H, I>, op9: OperatorFunction<I, J>): Promise<J>;
  eager<A, B, C, D, E, F, G, H, I, J>(op1: RxfireLazyOperator<A,B>, op2: OperatorFunction<B, C>, op3: OperatorFunction<C, D>, op4: OperatorFunction<D, E>, op5: OperatorFunction<E, F>, op6: OperatorFunction<F, G>, op7: OperatorFunction<G, H>, op8: OperatorFunction<H, I>, op9: OperatorFunction<I, J>, ...operations: OperatorFunction<any, any>[]): Promise<{}>;
  eager<A>(op1: RxfireLazyOperator<any,any>, ...args: OperatorFunction<any, any>[]) {
    const operators = args.map(arg => isRxfireLazyOperator(arg) ? arg.operator(this) : arg);
    const source = op1.observable(this);
    return pipeFromArray(operators)(source).toPromise();
  }
}

const noop: any = () => {};

export function pipeFromArray<T, R>(fns: Array<UnaryFunction<T, R>>): UnaryFunction<T, R> {
  if (!fns) { return noop }
  if (fns.length === 1) { return fns[0] }

  return function piped(input: T): R {
    return fns.reduce((prev: any, fn: UnaryFunction<T, R>) => fn(prev), input as any);
  };
};

const isRxfireLazyOperator = (arg: any): arg is RxfireLazyPipe<any,any>|RxfireLazyOperator<any,any> => arg.operator !== undefined;

export type RxfireLazyOperator<T,R> = {operator: (rxfire: RxFireLazy) => RxOperatorFunction<T,T|R>, observable: (rxfire: RxFireLazy) => Observable<R>};
export type RxfireLazyPipe<T,R> = {operator: (rxfire: RxFireLazy) => RxOperatorFunction<T,R>};

export type OperatorFunction<T,R> = RxfireLazyPipe<T,R> | RxOperatorFunction<T,R> | RxfireLazyOperator<T,R>;
export type CollectionQueryFn = (ref: firestore.CollectionReference) => firestore.Query

export type StreamCollection<K extends string,T,R> = {operator: (rxfire: RxFireLazy) => RxOperatorFunction<T[], (T extends undefined ? R & {[R in K]: string} : (T|R & {[R in K]: string}))[]>, observable: (rxfire: RxFireLazy) => Observable<(T extends undefined ? R & {[R in K]: string} : (T|R & {[R in K]: string}))[]>};

const collection = <K extends string,T=undefined,R={[key:string]: unknown}>(collectionName: string, idField: K): StreamCollection<K,T,R> => {
  const observable = (lazy: RxFireLazy) => lazy.firestore$.pipe(
    switchMap(firestore => collectionData<R & {[R in K]: string}>(firestore.collection(collectionName), idField))
  ) as any;
  const operator = (lazy: RxFireLazy) => (source: Observable<T[]>) => combineLatest(source, observable(lazy)).pipe(
    map(it => it.flat(1))
  );
  return { observable, operator };
}

type Join<T,R> = {operator: (rxfire: RxFireLazy) => RxOperatorFunction<T,R>};

type Unpacked<T> = T extends (infer U)[] ? U : T;

/*

TEST

const initializeApp = (config: {}) => new RxFireLazy(config);
const myApp = initializeApp({});


myApp.lazy(
  collection('resturants', 'id'),
  // TODO(jamesdaniels): get the typing here automatic
  collection<'id', { [key: string]: unknown } & { id: string }>('resturants', 'id')
).subscribe(resturants => {
  resturants.forEach(resturant => {
    const id = resturant.id;
    const name = resturant.name;
    const reviews = resturant.reviews;
  })
})

*/