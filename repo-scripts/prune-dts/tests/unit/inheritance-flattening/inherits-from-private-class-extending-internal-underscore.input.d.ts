class _InternalClass {
  _id: string;
}
class PrivateClass extends _InternalClass {
  serviceName: string;
}
export class PublicClass extends PrivateClass {
  clientName: string;
}
