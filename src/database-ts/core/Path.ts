export class Path {
  static comparePaths() {}
  static Empty = new Path('');
  private pieces: Array<string> = [];
  constructor(pathOrString: string | Array<string>, private pieceNum = 0) {
    if (arguments.length == 1) {
      this.pieces = (<string>pathOrString).split('/');

      // Remove empty pieces.
      var copyTo = 0;
      for (var i = 0; i < this.pieces.length; i++) {
        if (this.pieces[i].length > 0) {
          this.pieces[copyTo] = this.pieces[i];
          copyTo++;
        }
      }
      this.pieces.length = copyTo;

      this.pieceNum = 0;
    } else {
      this.pieces = <Array<string>>pathOrString;
      this.pieceNum = pieceNum;
    }
  }
  child(childPath): Path { return new Path([]); }
  equals(path: Path) {}
  getBack(): string {return '';}
  getFront() {}
  isEmpty() {
    return this.pieceNum >= this.pieces.length;
  }
  parent(): Path {return new Path([]);}
  toString() {
    var pathString = '';
    for (var i = this.pieceNum; i < this.pieces.length; i++) {
      if (this.pieces[i] !== '')
        pathString += '/' + this.pieces[i];
    }

    return pathString || '/';
  }
}