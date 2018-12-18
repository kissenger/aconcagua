


/**
 * function pointToPointBearing
 * returns bearing in radians between two GPS points
 *
 * lat1 is latitude of point 1 in decimal degrees
 * lng1 is longitude of point 1 in decimal degrees
 * lat2 is latitude of point 2 in decimal degrees
 * lng2 is longitude of point 2 in decimal degrees
 *
 * https://www.movable-type.co.uk/scripts/latlong.html
 */

function pointToPointBearing(lat1, lng1, lat2, lng2) {

	var lat1 = degreesToRadians(lat1);
  var lat2 = degreesToRadians(lat2);
  var lng1 = degreesToRadians(lng1);
	var lng2 = degreesToRadians(lng2);

	var dlng = lng1 - lng2;

	var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2)* Math.cos(dlng);
	var y = Math.sin(dlng) * Math.cos(lat2);

	return Math.atan2(y, x);

}

/**
 * function pointToLineDistance
 * returns distance in meters between a line and a point
 *
 * lat1 is latitude of point 1 (line start) in decimal degrees
 * lng1 is longitude of point 1 (line start) in decimal degrees
 * lat2 is latitude of point 2 (line end) in decimal degrees
 * lng2 is longitude of point 2 (line end) in decimal degrees
 * lat3 is latitude of point 3 in decimal degrees
 * lng3 is longitude of point 3 in decimal degrees
 *
 * https://www.movable-type.co.uk/scripts/latlong.html
 */

function pointToLineDistance(lat1, lng1, lat2, lng2, lat3, lng3) {

  const R = 6378.137;     // radius of earth

  var d13 = pointToPointDistance(lat1, lng1, lat3, lng3) / 1000.0;
	var brg12 = pointToPointBearing(lat1, lng1, lat2, lng2);
	var brg13 = pointToPointBearing(lat1, lng1, lat3, lng3);

	return Math.asin(Math.sin(d13/R) * Math.sin(brg13-brg12)) * R * 1000.0;

}


/**
 * function routeOrTrackStats
 * loops through provided array of route ot track coordinates
 * and outputs common stats eg total distance
 */
function routeOrTrackStats(inArr) {

  // initialise variables
  i = 0;
	var stats = { totalDistance: 0,
					      totalAscent: 0,
					      totalDescent: 0,
					      maxDistBtwnTwoPoints: 0,
					      aveDistBtwnTwoPoints: 0,
					      minLat: 180,
					      maxLat: -180,
					      minLng: 180,
					      maxLng: -180,
				      	aveLat: 0,
					      aveLng: 0,
				      	startTime: "",
				      	nPoints: 0}

  stats.nPoints = inArr.length;

	if (stats.nPoints <= 1) {
		console.log("Warning from routeOrTrackStats: npoints <= 1");
		return false;
  }

  while (i != inArr.length) {

    // Cumulative distance calculation
		if (i != 0) {
			dist = pointToPointDistance(inArr[i-1][0], inArr[i-1][1], inArr[i][0], inArr[i][1]);
			stat.totalDistance += dist;
			stat.maxDistBtwnTwoPoints = dist > stat.maxDistBtwnTwoPoints ? dist : stat.maxDistBtwnTwoPoints;
    }

		// Determine max lat/long for bounding box
		stat.minLng = inArr[i][1] < stat.minLng ? inArr[i][1] : stat.minLng;
		stat.maxLng = inArr[i][1] > stat.maxLng ? inArr[i][1] : stat.maxLng;
		stat.minLat = inArr[i][0] < stat.minLat ? inArr[i][0] : stat.minLat;
		stat.maxLat = inArr[i][0] > stat.maxLat ? inArr[i][0] : stat.maxLat;


		// Sum lat/long for calculating average later
		stat.aveLat += inArr[i][0];
		stat.avelng += inArr[i][1];

		// Calculate total ascent and descent
    if (inArr[i][2] > inArr[i-1][2]) {
      stat.totalAscent += inArr[i][2] - inArr[i-1][2];
    }
		else {
			stat.totalDescent += inArr[i-1][2] - inArr[i][2];
    }

		// increment counter
    i++;

  }  // end of while loop

	// Calculate averages
	stat.aveLat /= stat.nPoints;
	stat.aveLng /= stat.nPoints;
	stat.aveDistanceBtwnPoints = stat.totalDistance/stat.nPoints;

	// Time
	if (arr[0][3] != 0) {
  	stat.startTime = arr[0][3];
  }

	console.log(stat);
  return stat

}
