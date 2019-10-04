const Point = require('../_Point.js').Point;

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
 *
 */
function p2p(p1, p2) {

  if ( !(p1 instanceof Point) || !(p2 instanceof Point) ) {
    console.log(p1);
    console.log(p1 instanceof Point);
    console.log(p1 instanceof Point);
    console.log("Error from p2p: arguments should be of Point class");
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


/**
* returns distance in meters between a line and a point
*
* @param {Point} p1 lng/lat of line start in decimal degrees as instance of Point class
* @param {Point} p2 lng/lat of line end in decimal degrees as instance of Point class
* @param {Point} p3 lng/lat of mid-point in decimal degrees as instance of Point class
*
* https://www.movable-type.co.uk/scripts/latlong.html
*/

function p2l(p1, p2, p3) {

  if ( !(p1 instanceof Point) || !(p2 instanceof Point) || !(p3 instanceof Point)) {
    console.log("Error from p2l: arguments should be of Points class");
    return 0;
  }

  const d13 = p2p(p1, p3) / 1000.0;
  const brg12 = bearing(p1, p2);
  const brg13 = bearing(p1, p3);

  return Math.asin( Math.sin( d13/6378.137 ) * Math.sin( brg13-brg12 ) ) * 6378.137 * 1000.0;

}

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
function bearing(p1, p2) {

  if ( !(p1 instanceof Point) || !(p2 instanceof Point) ) {
    console.log("Error from bearing: arguments should be of Points class");
    return 0;
  }

  const lat1 = degs2rads(p1.lat);
  const lat2 = degs2rads(p2.lat);
  const lng1 = degs2rads(p1.lng);
  const lng2 = degs2rads(p2.lng);

	x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2)* Math.cos(lng2 - lng1)
	y = Math.sin(lng2 - lng1) * Math.cos(lat2)

	return Math.atan2(y, x)

}


function outerBoundingBox(arrayOfBoundingBoxes) {
  let outerBbox = [ 180, 90, -180, -90 ];
  arrayOfBoundingBoxes.forEach( (x) => {
    outerBbox[0] = x[0] < outerBbox[0] ? x[0] : outerBbox[0];
    outerBbox[1] = x[1] < outerBbox[1] ? x[1] : outerBbox[1];
    outerBbox[2] = x[2] > outerBbox[2] ? x[2] : outerBbox[2];
    outerBbox[3] = x[3] > outerBbox[3] ? x[3] : outerBbox[3];
  })
  return outerBoundingbox;
}



module.exports = {
  p2p,
  p2l,
  bearing,
  outerBoundingBox
};
