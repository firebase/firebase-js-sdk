export class Path {
  static comparePaths() {}
  constructor(pathOrString: string | Array<string>, pieceNum?) {}
  child(childPath): Path { return new Path([]); }
  getBack(): string {return '';}
  getFront() {}
  isEmpty() {}
  parent(): Path {return new Path([]);}
}