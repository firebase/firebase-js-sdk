interface _InternalService {
  _serviceId: string;
}
interface PrivateService extends _InternalService {
  serviceName: string;
}
export interface PublicClient extends PrivateService {
  clientName: string;
}
