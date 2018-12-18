class Point {
  constructor(lngLat, elev, time, hr, cad) {
    this.lngLat = lngLat;
    this.lng = lngLat[0];
    this.lat = lngLat[1];
    this.time = time;
    this.hr = hr;
    this.cad = cad;
    this.elev = elev;
  }
}

module.exports = {
  Point
};
