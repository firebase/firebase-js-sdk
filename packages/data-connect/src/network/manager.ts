import { DataConnectOptions, TransportOptions } from '../api/DataConnect';
import { AppCheckTokenProvider } from '../core/AppCheckTokenProvider';
import { AuthTokenProvider } from '../core/FirebaseAuthProvider';

import {
  CallerSdkType,
  DataConnectResponse,
  DataConnectResponseWithMaxAge,
  DataConnectTransport,
  SubscribeNotificationHook
} from './DataConnectTransport';
import { RESTTransport } from './rest/RestTransport';

/**
 * Entry point for the transport layer. Manages routing between transport implementations.
 * @internal
 */
export class DataConnectTransportManager implements DataConnectTransport {
  private restTransport: RESTTransport;
  private _isUsingEmulator = false; // TODO(stephenarosaj): this will be used in a future PR.

  constructor(
    private options: DataConnectOptions,
    private apiKey?: string,
    private appId?: string | null,
    private authProvider?: AuthTokenProvider,
    private appCheckProvider?: AppCheckTokenProvider,
    private transportOptions?: TransportOptions,
    private _isUsingGen = false,
    private _callerSdkType?: CallerSdkType
  ) {
    this.restTransport = new RESTTransport(
      options,
      apiKey,
      appId,
      authProvider,
      appCheckProvider,
      transportOptions,
      _isUsingGen,
      _callerSdkType
    );
  }

  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponseWithMaxAge<Data>> {
    return this.restTransport.invokeQuery(queryName, body);
  }

  invokeMutation<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>> {
    return this.restTransport.invokeMutation(queryName, body);
  }

  invokeSubscribe<Data, Variables>(
    notificationHook: SubscribeNotificationHook<Data>,
    queryName: string,
    body?: Variables
  ): void {
    this.restTransport.invokeSubscribe(notificationHook, queryName, body);
  }

  invokeUnsubscribe<Variables>(queryName: string, variables: Variables): void {
    this.restTransport.invokeUnsubscribe(queryName, variables);
  }

  useEmulator(host: string, port?: number, sslEnabled?: boolean): void {
    this._isUsingEmulator = true;
    this.transportOptions = { host, port, sslEnabled };
    this.restTransport.useEmulator(host, port, sslEnabled);
  }

  onAuthTokenChanged(token: string | null): void {
    this.restTransport.onAuthTokenChanged(token);
  }

  _setCallerSdkType(callerSdkType: CallerSdkType): void {
    this._callerSdkType = callerSdkType;
    this.restTransport._setCallerSdkType(callerSdkType);
  }
}
