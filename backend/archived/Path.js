
class Path  {

  constructor(name, type, points) {
    this.name = name;
    this.type = type;
    this.points = points;
  }

  category() {

    const matchDistance = 25;  // in m, if points are this close then consider as coincident
    const buff = 50;           // number of points ahead to skip in matching algorithm
    const pcThreshUpper = 90;  // % above which to consider at out and back
    const pcThreshLower = 10;  // % below which to consider as one way or loop

    let nm = 0, np = this.points.length;
    let isEndsAtStart = false;
    let category = '';

    // loop through points and match each point against remaining points in path; count matches
    for ( let i = 0; i < np - buff; i++ ) {
      for ( let j = i + buff; j < np; j++ ) {
        const d = p2p(this.points[i], this.points[j]);
        if ( d < matchDistance ) {
          nm++;
          break;
        }
      }
    }

    // determine whether 1st and last points are within tolerance
    const d = p2p(this.points[0], this.points[np - 1]);
    if ( d < matchDistance * 10 ) isEndsAtStart = true;

    // caculate proportion of points that are matched
    // factor of 2 accounts for the fact that only a max 1/2 of points can be matched with algorithm
    const pcShared = nm / np * 200;

    // determine path category
    if ( isEndsAtStart ) {

      if ( pcShared > pcThreshUpper ) category = 'Out and back'
      else if (pcShared < pcThreshLower ) category = 'Circular'
      else category = 'Hybrid'

    } else {

      if ( pcShared > pcThreshUpper ) category = 'Out and back'
      else if (pcShared < pcThreshLower ) category = 'One way'
      else category = 'Hybrid'

    }

    return category;
  }

  parameters() {

    return {
      'timeArray': this.points.map( (p, i) => {
        if ( i === 0 ) { return 0 }
        else {
          const a = new Date(this.points[i].time);
          const b = new Date(this.points[i-1].time);
          return Math.ceil((a-b)/1000);
        }
      }),
      'heartRate': this.points.map( (p) => p.hr),
      'cadence':   this.points.map( (p) => p.cad),
      'elevation': this.points.map( (p) => p.elev)
    }

  }

  statistics() {

    let maxDist = 0;
    let minLat = 180;
    let maxLat = -180;
    let minLng = 180;
    let maxLng = -180;
    let ascent = 0;
    let descent = 0;
    let lastPoint;
    let distance = 0;
    let p2pMax = 0;

    this.points.forEach( (point, index) => {

      // skip the first point and compare this point to the previous one
      if (index !== 0) {

        // Cumulative distance
        let dist = p2p(point, lastPoint);
        distance += dist;
        p2pMax = dist > maxDist ? dist : maxDist;

        // Calculate ascent and descent if elevation data is available
        if ( point.elev ) {
          const delta = point.elev - lastPoint.elev;
          ascent = delta > 0 ? ascent + delta : ascent;
          descent = delta > 0 ? descent + delta : descent;
        }

      } // if (index != 0)

      // Determine max lat/long for bounding box
      minLat = point.Lat < minLat ? point.Lat : minLat;
      minLng = point.Lng < minLng ? point.Lng : minLng;
      maxLat = point.Lat > maxLat ? point.Lat : maxLat;
      maxLng = point.Lng > maxLng ? point.Lng : maxLng;

      //
      lastPoint = point;

    }); // forEach

    // time
    const startTime = new Date(this.points[0].time);
    const endTime = new Date(this.points[this.points.length-1].time);

    // set bounding box on class
    this.bbox = [minLng, minLat, maxLng, maxLat];

    return {
      'duration': Math.ceil((endTime-startTime) / 1000),
      'startTime': startTime,
      'distance': distance,
      'ascent': ascent,
      'descent': descent,
      'p2p': {
        'max': p2pMax,
        'ave': p2pMax / (this.points.length - 1)
      }
    }

  }


}

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

function p2p(p1, p2) {

  // check that function arguments were supplied as instances of the class Point
  if ( !(p1 instanceof Point) || !(p1 instanceof Point) ) {
    console.log(p1);
    console.log(typeof p1)
    console.log("Error from p2p: arguments should be of Points class");
    return 0;
  }

  const R = 6378.137;     // radius of earth

  const lat1 = degs2rads(p1.lat);
  const lat2 = degs2rads(p2.lat);
  const lng1 = degs2rads(p1.lng);
  const lng2 = degs2rads(p2.lng);

  const dlat = lat1 - lat2;
  const dlng = lng1 - lng2;

  const a = (Math.sin(dlat/2.0) ** 2.0 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng/2.0) ** 2.0) ** 0.5;
  const c = 2.0 * Math.asin(a);

  return d = R * c * 1000.0;  // distance in metres

}

function degs2rads(degs) {
  return degs * Math.PI / 180.0;
};

module.exports = {
  Path,
  Point
};

