/**
 *
 * This file contains functions for processing GPS data
 *
 */

/**
 * Define class object to hold a track or route point
 * Properties:
 *   index [number]
 *   latLng [number, number]: lat/long number pair
 *   elev [number]
 *   timeStamp [string]
 *   heartRate [number]
 *   cadence [number]
 */
class Point {
  constructor(index, latLng, elev, timeStamp, heartRate, cadence) {
    this.index = index;
    this.latLng = latLng;
    this.elev = elev;
    this.timeStamp = timeStamp;
    this.heartRate = heartRate;
    this.cadence = cadence;
  }
};

/**
 * Define class object to hold the path (route or track) of interest.
 * Properties:
 *   name [string]
 *   type [string]: options "route" or "track"
 *   points [array]: array of Points [point1, point2, point 3, ... point n]
 * Methods:
 *   stats: outputs hash array with required path statistics eg path distance
 */
class Path {
  constructor(name, type, points) {
    this.name = name;
    this.type = type;
    this.points = points;
  }

  // Stats method on the Path class
  stats () {

    let asc = 0, dsc = 0;
    let cumDist = 0, maxDist = 0
    let minLat = 180, maxLat = -180, minLng = 180, maxLng = -180;

    // const nSmooth = 5; //number of points over which to smooth gradient

    this.points.forEach( (point, index) => {

      // Calculate statistics
      // skip the first point and compare this point to the previous one
      if (index != 0) {

        // Cumulative distance
        let dist = p2p(this.points[index-1].latLng, this.points[index].latLng);
        cumDist += dist;
        maxDist = dist > maxDist ? dist : maxDist;

        // Calculate ascent and descent if elevantion data is available
        if ( this.points[index].elev ) {
          let delta = this.points[index].elev - this.points[index-1].elev;
          asc = delta > 0 ? asc + delta : asc;
          dsc = delta > 0 ? dsc + delta : dsc;
        }

      } // end if

      // Determine max lat/long for bounding box
      minLat = point.latLng[0] < minLat ? point.latLng[0] : minLat;
      minLng = point.latLng[1] < minLng ? point.latLng[1] : minLng;
      maxLat = point.latLng[0] > maxLat ? point.latLng[0] : maxLat;
      maxLng = point.latLng[1] > maxLng ? point.latLng[1] : maxLng;

    });

    return {totalDistance: cumDist,
            totalAscent: asc,
            totalDescent: dsc,
            maxDistBtwnTwoPoints: maxDist,
            aveDistBtwnTwoPoints: cumDist/(this.points.length-1),
            boundingBoxJson: [ [[minLng, minLat],[maxLng, minLat],[maxLng, maxLat],[minLng, maxLat],[minLng, minLat]] ],
            boundingBox: [minLng, minLat, maxLng, maxLat]
          };
  };
};

/**
 * function p2p
 * returns distance in meters between two GPS points
 *
 * Implements the Haversine formula
 * https://en.wikipedia.org/wiki/Haversine_formula
 * Vincenty's formula is more accurate but more expensive
 * https://en.wikipedia.org/wiki/Vincenty's_formulae
 *
 * lngLat1 is lng/lat of point 1 in decimal degrees
 * lngLat2 is lng/lat of point 1 in decimal degrees
 *
 * https://www.movable-type.co.uk/scripts/latlong.html
 * can be sped up: https://stackoverflow.com/questions/27928
 */

function p2p(lngLat1, lngLat2) {

  const R = 6378.137;     // radius of earth


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

/**
* ---------------------------------------------------
* returns distance in meters between a line and a point
* ---------------------------------------------------
* latLng1 is lat/lng of point 1 (line start) in decimal degrees
* latLng2 is lat/lng of point 2 (line end) in decimal degrees
* latLng3 is lat/lng of point 3 (point) in decimal degrees
*---------------------------------------------------
* https://www.movable-type.co.uk/scripts/latlong.html
*---------------------------------------------------
*/

function p2l(latLng1, latLng2, latLng3) {

  const d13 = p2p(latLng1, latLng3) / 1000.0;
  const brg12 = bearing(latLng1, latLng2);
  const brg13 = bearing(latLng1, latLng3);

  return Math.asin( Math.sin( d13/6378.137 ) * Math.sin( brg13-brg12 ) ) * 6378.137 * 1000.0;

}

/**
 * function degreesToRadians
 * converts dgress to radians!!
 */

function degs2Rads(degrees) {
  return degrees * Math.PI / 180.0;
};

/**
 * ---------------------------------------------------
 * returns bearing in radians between two GPS points
 * ---------------------------------------------------
 * latLng1 is lat/lng of point 1 in decimal degrees
 * latLng2 is lat/lng of point 2 in decimal degrees
 *---------------------------------------------------
 * https://www.movable-type.co.uk/scripts/latlong.html
 *---------------------------------------------------
 */
function bearing(latLng1, latLng2) {

  const lat1 = degs2Rads(latLng1[0]);
  const lng1 = degs2Rads(latLng1[1]);
  const lat2 = degs2Rads(latLng2[0]);
  const lng2 = degs2Rads(latLng2[1]);

	x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2)* Math.cos(lng2 - lng1)
	y = Math.sin(lng2 - lng1) * Math.cos(lat2)

	return Math.atan2(y, x)

}

/**
 * function simplifyPath
 * simplify path using perpendicular distance method
 * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.95.5882&rep=rep1&type=pdf
 */
 function simplifyPath( path ) {

	const tol = 5;                      // tolerance value in metres; the higher the value to greater the simplification
  const l_orig = path.points.length;  // length of array to calculate compression ratio
  let i;
  let flag = true;
  let pd;

	// Repeat loop until no nodes are deleted

  while ( flag === true ) {

    i = 0;
    flag = false;   // if remains true then simplification is complete; loop will break

    while ( i < ( path.points.length - 2 ) ) {
      pd = p2l( path.points[i].latLng, path.points[i+2].latLng, path.points[i+1].latLng );
      if ( Math.abs(pd) < tol ) {
        path.points.splice(i+1, 1);
        flag = true;
      }
      i++;
    }

  }

  //compression ration for info only
  console.log( 'Simplified path to: ' + ((path.points.length/l_orig)*100.0).toFixed(1) + '%');
  return path;

 }

module.exports = {
  p2p,
  p2l,
  bearing,
  Point,
  Path,
  simplifyPath
};


