
class Path  {

  constructor(name, type, points) {
    this.name = name;
    this.type = type;
    this.points = points;
    this.category = this.category();
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
        const d = p2p(this.points[i].latLng, this.points[j].latLng);
        if ( d < matchDistance ) {
          nm++;
          break;
        }
      }
    }

    // determine whether 1st and last points are within tolerance
    const d = p2p(this.points[0].latLng, this.points[np - 1].latLng);
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

}

class Point extends Path {
  constructor(lngLat, elev) {
    this.lngLat = LngLat;
    this.elev = elev;
    this.lng = lngLat[0];
    this.lat = lngLat[1];
  }
}

class Params extends Point {
  constructor(timeStamp, heartRate, cadence) {
    this.timeStamp = timeStamp;
    this.heartRate = heartRate;
    this.cadence = cadence;
  }
};

constructor(name, type, points) {
  this.name = name;
  this.type = type;
  this.points = points;
}


function p2p(p1, p2) {

  // check that function arguments were supplied as instances of the class Point
  if ( !(p1 instanceof Point) || !(p1 instanceof Point) ) {
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

function degs2Rads(degs) {
  return degs * Math.PI / 180.0;
};
