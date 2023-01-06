import {newConnection} from '../src/platform/connection';
import { DatabaseId, DatabaseInfo } from '../src/core/database_info';

const databaseInfo = new DatabaseInfo(
  new DatabaseId("dconeybe-testing"),
  /*appId=*/"",
  /*persistenceKey=*/"[DEFAULT]",
  /*host=*/"firestore.googleapis.com",
  /*ssl=*/true,
  /*forceLongPolling=*/false,
  /*autoDetectLongPolling=*/false,
  /*useFetchStreams=*/true
);

const connection = newConnection(databaseInfo);
