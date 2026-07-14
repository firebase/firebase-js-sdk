class SharedClass {}
enum SharedEnum {
  X
}
export interface LocalConsumer {
  c: SharedClass;
  e: SharedEnum;
}
