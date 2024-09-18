import { uuidv4 } from '@firebase/util';
// initializeApp({ projectId: 'p' });
// const dc = getDataConnect({ connector: 'c', location: 'l', service: 'l' });

// connectDataConnectEmulator(dc, 'localhost', 3628);
// const ref = queryRef(dc, 'listPosts');
// const res = executeQuery(ref);
// res.then(res => console.log(res.data));
function listPosts() {
  // perform Mutation of full data
  const executeBody = {
    name: 'projects/p/locations/l/services/l/connectors/c',
    operationName: 'listPosts',
    variables: undefined
  };
  return fetch(
    'http://localhost:3628/v1alpha/projects/p/locations/l/services/l/connectors/c:executeQuery',
    {
      method: 'POST',
      body: JSON.stringify(executeBody)
    }
  );
}
const SEEDED_DATA = [
  {
    id: uuidv4(),
    content: 'task 1'
  },
  {
    id: uuidv4(),
    content: 'task 2'
  }
];
async function seedDatabase() {
  // perform Mutation of full data
  for(let i = 0; i < SEEDED_DATA.length; i++) {
    const data = SEEDED_DATA[i];
    const executeBody = {
        name: 'projects/p/locations/l/services/l/connectors/c',
        operationName: 'createPost',
        variables: data
      };
      await fetch(
        'http://localhost:3628/v1alpha/projects/p/locations/l/services/l/connectors/c:executeMutation',
        {
          method: 'POST',
          body: JSON.stringify(executeBody)
        }
      );
  }
}
function removeData() {
  // perform mutation of removing data
}
function setupSchema() {
 const obj = {
   "service_id": "l",
   "schema": {
     "files": [
       {
          "path": "schema/post.gql",
          "content": "type Post @table {content: String!}"
       }
     ]
   },
   "connectors": {
     "c": {
       "files": [
         {
           "path": "operations/post.gql",
           "content": "query getPost($id: UUID!) @auth(level: PUBLIC) {post(id: $id) {content}} query listPosts @auth(level: PUBLIC) {posts {content}} mutation createPost($id: UUID!, $content: String!) @auth(level: PUBLIC)  {post_insert(data: {id: $id, content: $content})} mutation deletePost($id: UUID!) @auth(level: PUBLIC) { post_delete(id: $id)}"
         }
       ]
     }
   }
};
return fetch(`http://localhost:3628/setupSchema`, {
    method: 'POST',
    body: JSON.stringify(obj)
  });
}

await setupSchema().then(res => res.json());
const databaseSeeded = await seedDatabase()
const posts = await listPosts().then(res => res.json());
console.log(posts);
// console.log(databaseSeeded);
