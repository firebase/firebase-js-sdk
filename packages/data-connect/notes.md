# Android SDK notes

## Structure
* Maybe we should have each query look up its own cache in the QueryManager. This should be a very easy lookup and we wouldn't have to replicate data in two places.
* `QueryManager` handles actual execution and subscription callbacks.
* Add a `QueryManager` to each of the `DataConnect` objects.
* What happens if you have multiple query references and then each of them has a different serializer?

For example:
```typescript
const query1 = queryRef('myQuery', myConverter1);
const query2 = queryRef('myQuery', myConverter2);
subscribe(query1, () => {});
subscribe(query2, () => {});
execute(query1);

```
* What if there are two query refs with the same function callback and then you unsubscribe one?
```typescript
const query1 = queryRef('myQuery', myConverter1);
const query2 = queryRef('myQuery', myConverter2);
function mySub() { }
const unsubscribe1 = subscribe(query1, mySub);
const unsubscribe2 = subscribe(query2, mySub);
unsubscribe1(); // would this unsubscribe twice?
```

* Potentially, what could happen is that for each reference, it stores the converter and then it queries the querymanager for cache changes?
    * Any time you call `new` on the `Query`, it adds an instance to the `QueryManager` to update when it gets data back.
* What if the converter was on the subscription itself?


``` typescript
interface Query<Response, Variables> {
    name: string;
    variables: Variables;
}
interface DataConnectSubscription<Response, Variables> {
    userCallback: (data: Response, error: Error) => void;
    converter: Converter<Response>;
    unsubscribe: () => void;
}
interface TrackedQuery<Response, Variables> {
    queryRef: Query<Response, Variables>;
    subscriptions: DataConnectSubscription[];
    currentCache: Response | null;
}
interface QueryManager {
    // adds a query to track
    track<T>(queryName: string, args: T)
    // subscribe to a query
    subscribe<T>(queryName, args: T)
}

// Examples
function HomeComponent() {
    const getAllMoviesRef = queryRef<Movie[]>('getAllMovies');
    const [movies, setMovieData] = useState<Movie[]>([]);
    function onMovieSubscribe(data: Movie[], error: Error) {
        setMovieData(data);
    }
    function movieConverter(snapshot: DataConnectSnapshot): Movie[] {
        return snapshot.data as Movie[];
    }
    subscribe(getAllMoviesRef, onMovieSubscribe, movieConverter)
}
// Separate Page, but still needs movie information
function ListComponent() {
    // Calls `queryManager`, which would return an existing query ref
    const getAllMoviesRef = queryRef<Movie[]>('getAllMovies');
}

// Two queries with different types? Should be fine. Weird, but fine.
```
