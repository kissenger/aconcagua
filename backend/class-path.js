class Point {
  constructor(lngLat, elev) {
    this.lngLat = LngLat;
    this.elev = elev;
    this.lng = lngLat[0];
    this.lat = lngLat[1];
  }

  degs2Rads(degrees) {
    return degrees * Math.PI / 180.0;
  };

  p2p(p1, p2) {

      const R = 6378.137;     // radius of earth

      let lat1 = p1.lat.degs2rads();
      let lat2 = p2.lat.degs2rads();
      let lng1 = p1.lng.degs2rads();
      let lng2 = p2.lng.degs2rads();

      var lat1 = degs2Rads(lngLat1[1]);
      var lng1 = degs2Rads(lngLat1[0]);
      var lat2 = degs2Rads(lngLat2[1]);
      var lng2 = degs2Rads(lngLat2[0]);

      var dlat = lat1 - lat2;
      var dlng = lng1 - lng2;

      var a = (Math.sin(dlat/2.0) ** 2.0 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng/2.0) ** 2.0) ** 0.5;
      c = 2.0 * Math.asin(a);
      d = R * c * 1000.0;  // distance in metres

      // console.log('@@ ' + lngLat1 + ', ' + lngLat2 + ', ' + d + ' @@')

      return d;

    }

  }
};

class Params extends Point {
  constructor(timeStamp, heartRate, cadence) {
    this.timeStamp = timeStamp;
    this.heartRate = heartRate;
    this.cadence = cadence;
  }
};

class Line extends Point {
  constructor(Point) {

  }
}


