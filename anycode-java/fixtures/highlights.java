// ### ctor-argument 1
class Point {
  int x, y;
  Point(int x, int y) {
//          ^
    this.x = x;
//           ^
    this.y = y;
  }
}
// ### ctor-argument 2
class Point {
  int x, y;
  Point(int x, int y) {
//                 ^
    this.x = x;
    this.y = y;
//           ^
  }
}
// ### method args 
class C {
  void C(int C) {
//           ^
    print(C);
//        ^
  }
}
