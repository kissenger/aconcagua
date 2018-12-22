const fs = require('fs');
const Route = require('./_Path.js').Route;
const Track = require('./_Path.js').Track;

/**
 * getPathFromGpx
 *
 * Purpose is to convert data object from file read, into a Path object containing Point objects
 * for each data point.
 *
 */

function readGpx(data) {

  // if ( data.indexOf('\n' !== -1 ) {
  //   newlineChar = '\n'
  // } elseif

  var a = 0;                          // start of interesting feature
  var b = data.indexOf("\r",a);     // end of interesting feature
  var i = 0;                          // counter
  var typeOfPath = '';
  var nameOfPath = '';                 // "route" or "path"
  const maxIters = 100000;             // will only process this number of points
  var latValue, lngValue, eleValue, timeValue;
  let lngLat = [];
  let time = [];
  let elev = [];
  let isElev = false;
  let isTime = false;


  /**
   * Loop until we find track or route start
   */
  do {

    lineData = data.slice(a,b)
    a = b + 2;
    b = data.indexOf("\r",a);

    if ( lineData.indexOf("<trk>") !== -1 ) {
      // console.log('getPathFromGpx says: found a track');
      typeOfPath = "track";
      typeTag = "trkpt";
      break;
    }

    if ( lineData.indexOf("<rte>") !== -1 ) {
      typeOfPath = "route";    //preceeding '<' is important
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
  const fs = require('fs');
  const file = fs.createWriteStream("C:/__FILES/PROJECT/__Master Data/check.txt");
  do {

    // get the start and end of the current track point, break from loop if not found
    ptStart = data.indexOf('<' + typeTag,ptEnd);  // find the next tag opener
    a = data.indexOf('</' + typeTag,ptStart);     // find regular tag closure
    b = data.indexOf('/>',ptStart);               // find self-closing tag

    if ( ptStart == -1 || ( a == -1 && b == -1) ) break;  // one of the above wasnt found

    if ( a != -1 && b != -1 ) {
      // if both closures are found, take the nearest one
      ptEnd = Math.min(a,b);
    } else if ( a == -1 || b == -1 ) {
      // if one or other closure was not found, take the one that was found
      ptEnd = Math.max(a,b);
    };

    ptData = data.slice(ptStart,ptEnd)

    // lat and long
    a = ptData.indexOf("lat=");
    b = ptData.indexOf("lon=");
    c = ptData.indexOf(">");         // end of line lat/long line to ensure elev numbers arent captured

    if ( a !== -1 && b !== -1 ) {
      if ( b > a ) {
        latValue = parseFloat(ptData.slice(a, b).match(/[-0123456789.]/g).join(""));
        lngValue = parseFloat(ptData.slice(b, c).match(/[-0123456789.]/g).join(""));
      } else {
        lngValue = parseFloat(ptData.slice(b, a).match(/[-0123456789.]/g).join(""));
        latValue = parseFloat(ptData.slice(a, c).match(/[-0123456789.]/g).join(""));
      }
    }
    lngLat.push([lngValue, latValue]);

    // elevation
    eleValue = '';
    a = ptData.indexOf("<ele>");
    b = ptData.indexOf("</ele>");
    if (a != -1 && b != -1) {
      eleValue = parseFloat(ptData.slice(a,b).match(/[-0123456789.]/g).join(""));
      isElev = true;
    }
    elev.push(eleValue);

    // time
    timeValue = '';
    a = ptData.indexOf("<time>");
    b = ptData.indexOf("</time>");
    if (a != -1 && b != -1) {
      timeValue = ptData.slice(a,b).match(/[-0123456789.TZ:]/g).join("");
      isTime = true;
    }
    time.push(timeValue);

    file.write(lngValue + ',' + latValue + ',' + eleValue + ',' + timeValue + '\n');

    i++;
  } while ( i < maxIters )

  // create paths
  // note that time and elev are only pushed if at least one point was found to contain this data
  //name, description, lngLat, elev, time, heartRate, cadence)
  if ( typeOfPath === 'route') var path = new Route(nameOfPath, ' ', lngLat, isElev ? elev : [], isTime ? time : []);
  if ( typeOfPath === 'track') var path = new Track(nameOfPath, ' ', lngLat, isElev ? elev : [], isTime ? time : []);

  // exportCsv(path);
  return path;

}



/**
 * writeGpx
 *
 * Purpose is to write path data to gpx file
 *
 */

function writeGpx(path){

  return new Promise( (resolve, reject) => {

    const creator = 'Aconcagua Beta https://kissenger.github.io/aconcagua/';
    const xmlns = 'http://www.topografix.com/GPX/1/0';

    const file = fs.createWriteStream('output_test.gpx');
    const s = '   ';
    const eol = '\r\n'
    let i = 0;

    file.on('finish', () => { resolve(true) });
    file.on('error', reject);

    file.write(s.repeat(0) + "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + eol);
    file.write(s.repeat(0) + "<gpx version=\"1.1\" creator=\"" + creator + "\" xmlns=\"" + xmlns + "\">" + eol);
    file.write(s.repeat(1) + "<rte>" + eol);
    file.write(s.repeat(2) + "<name>" + path.name + "</name>" + eol);

    do {

      point = path.point(i);

      if ( point.elev || point.time ) {
        // elevation or time data exists, use conventional tag

        file.write(s.repeat(2) + "<rtept lat=\"" + point.lat + "\" lon=\"" + point.lng + "\">" + eol);
        if ( point.elev ) {
          file.write(s.repeat(3) + "<ele>" + point.elev + "</ele>" + eol);
        }
        file.write(s.repeat(2) + "</rtept>" + eol);

      } else {
        // only lat/lon exists, use self-closing tag

        file.write(s.repeat(2) + "<rtept lat=\"" + point.lat + "\" lon=\"" + point.lng + "\" />" + eol);

      }

      i++;
    } while (i <= path.pathSize)

    file.write(s.repeat(1) + "</rte>" + eol);
    file.write(s.repeat(0) + "</gpx>");

    file.end;




  })

}





function exportCsv(path) {

  const fs = require('fs');
  let file = fs.createWriteStream("C:/__FILES/PROJECT/__Master Data/tracks/node.out");

  path.points.forEach ( point => {
    file.write([point.lng, point.lat, point.time, point.elev].join(',') + '\n')
  })

}

module.exports = { readGpx, writeGpx };
