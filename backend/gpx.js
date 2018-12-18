
const Route = require('./_Path.js').Route;
const Track = require('./_Path.js').Track;
const Point = require('./_Point.js').Point;

/**
 * getPathFromGpx
 *
 * Purpose is to convert data object from file read, into a Path object containing Point objects
 * for each data point.
 *
 */

function toPath(data) {

  // if ( data.indexOf('\n' !== -1 ) {
  //   newlineChar = '\n'
  // } elseif

  var a = 0;                          // start of interesting feature
  var b = data.indexOf("\r",a);     // end of interesting feature
  var i = 0;                          // counter
  var pathType = '';
  var nameOfPath = '';                 // "route" or "path"
  const maxIters = 100000;             // will only process this number of points
  var latValue, lngValue, eleValue, timeValue;
  let points = [];


  /**
   * Loop until we find track or route start
   */
  do {

    lineData = data.slice(a,b)
    a = b + 2;
    b = data.indexOf("\r",a);

    if ( lineData.indexOf("<trk>") !== -1 ) {
      // console.log('getPathFromGpx says: found a track');
      pathType = "track";
      typeTag = "trkpt";
      break;
    }

    if ( lineData.indexOf("<rte>") !== -1 ) {
      // console.log('getPathFromGpx says: found a route');
      pathType = "route";
      typeTag = "rtept";
      break;
    }

  } while ( i < maxIters )

  /**
   *  Try to find a name
   */
  lineData = data.slice(a,b)
  a = lineData.indexOf("<name>");
  b = lineData.indexOf("</name>");
  if ( a !== -1 && b !== -1 ) {
    nameOfPath = lineData.slice(a + 6, b);
  }

  /**
   *  If this is a track file....
   */

  ptEnd = b;

  do {

    // get the start and end of the current track point, break from loop if not found
    ptStart = data.indexOf(typeTag,ptEnd);
    ptEnd = data.indexOf('/' + typeTag,ptStart);
    if ( ptStart == -1 || ptEnd == -1 ) {
      break;
    }
    ptData = data.slice(ptStart,ptEnd)


    // lat and long
    a = ptData.indexOf("lat=");
    b = ptData.indexOf("lon=");
    if ( a !== -1 && b !== -1 ) {
      if ( b > a ) {
        latValue = parseFloat(ptData.slice(a, b).match(/[-0123456789.]/g).join(""));
        lngValue = parseFloat(ptData.slice(b).match(/[-0123456789.]/g).join(""));
      } else {
        lngValue = parseFloat(ptData.slice(b, a).match(/[-0123456789.]/g).join(""));
        latValue = parseFloat(ptData.slice(a).match(/[-0123456789.]/g).join(""));
      }
    }

    // elevation
    a = ptData.indexOf("<ele>");
    b = ptData.indexOf("</ele>");
    if (a != -1 && b != -1) {
      eleValue = parseFloat(ptData.slice(a,b).match(/[-0123456789.]/g).join(""));
    }

    // time
    a = ptData.indexOf("<time>");
    b = ptData.indexOf("</time>");
    if (a != -1 && b != -1) {
      timeValue = ptData.slice(a,b).match(/[-0123456789.TZ:]/g).join("");
    }

    // create point and push to path
    points.push(new Point([lngValue, latValue], eleValue, timeValue, null, null));
    i++;
  } while ( i < maxIters )

  if ( pathType === 'route') {
    var path = new Route(nameOfPath, points);
  } else if ( pathType === 'track') {
    var path = new Track(nameOfPath, points);
  }

  // exportCsv(path);

  return path;

}

function exportCsv(path) {

  const fs = require('fs');
  let file = fs.createWriteStream("C:/__FILES/PROJECT/__Master Data/tracks/node.out");

  path.points.forEach ( point => {
    file.write([point.lng, point.lat, point.time, point.elev].join(',') + '\n')
  })

}

module.exports = { toPath };
