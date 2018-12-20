const p2p = require('../geo.js').p2p;
const p2l = require('../geo.js').p2l;


// class MungoPath extends Path {
//   constructor(name ) {

//   }
//   this.name = name;
//   this.points = points;
//   this.geometry = {
//     type: 'LineString',
//     coordinates: this.points.map( (x) => { return [x.lng, x.lat]; } )
//   }
// }

class Path  {

  constructor(name, points) {
    this.name = name;
    this.points = points;
  }

  formatForMongo() {
    this.geometry = {
      type: 'LineString',
      coordinates: this.points.map( (x) => { return [x.lng, x.lat]; } )
    }
    this.pointParams = {
      elev: this.points.map( (x) => { return x.elev ? x.elev : 0; }),
      time: this.points.map( (x) => { return x.time ? x.time : ''; }),
      heartRate: this.points.map( (x) => { return x.heartRate ? x.heartRate : 0; }),
      cadence: this.points.map( (x) => { return x.cadence ? x.cadence : 0 })
    }

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


  analysePath() {

    // parameters
    const KM_TO_MILE = 0.6213711922;
    const ALPHA = 0.3;  //low pass filter constant, to higher the number the quicker the response
    const GRAD_THRESHOLD = 2; // gradient in % above which is considered a climb/descent
    const HILL_THRESHOLD = 20; // hills of less height gain will not be considered
    const SPEED_THRESHOLD = 1.4; // km/h

    let n = this.points.length - 1;
    let maxDist = 0;
    let bbox = [ 180, 90, -180, -90 ]; //minLng, minLat, maxLng, maxLat

    let p2pMax = 0;

    // increments from last point
    let dDist = 0;
    let dTime = 0;
    let dElev = 0;

    // cumulative counters
    let distance = 0;
    let ascent = 0;
    let descent = 0;

    // this and last point values
    let thisFiltElev; // needs to be undefined as its checked
    let lastFiltElev;
    let lastPoint;
    let thisTime;
    let lastTime;
    let lastSlopeType;
    let thisSlopeType;    // 0 = flat, 1 = ascending, -1 = descending
    let lastKmStartTime;        // time at which previous km marker was reached
    let lastMileStartTime;      // time at which previous mile marker was reached
    let lastKmStartDist = 0;
    let lastMileStartDist = 0;

    // hills and gradients local variables
    let eDist = 0;          // cumulative distance over which elevation is unchanged, used for gradient calc
    let hills = [];
    let gradM;
    let d0 = 0;
    let t0 = 0;
    let e0 = 0;

    // distances
    let kmSplits = [];            // array containing location of km markers and pace splits
    let mileSplits = [];          // array containing location of mile markers and pace splits


    // moving time and speed
    let movingTimeArr = [];           // array containing time increments of points where speed is above moving threshold
    let movingDistArr = [];           // array containing distance increments  of points where speed is above moving threshold

    // initiatlise parameters
    let time = [];
    let heartRate = [];
    let cadence = [];
    let elevation = [];

    /**
     * Pre-process
     *
     */
    // test for presence of time data
    let isTime = false;
    let isElev = false;
    if ( this.points[0].time ) {
      var startTime = this.points[0].time;
      isTime = true;
    }
    if ( this.points[0].elev ) {
      isElev = true;
    }

    this.points.forEach( (point, index) => {

      if ( typeof point.cadence !== 'undefined' ) { heartRate.push(point.hr); }
      if ( typeof point.cadence !== 'undefined' ) { cadence.push(point.cadence); }
      if ( typeof point.cadence !== 'undefined' ) { elevation.push(point.elev) }

      // skip the first point and compare this point to the previous one
      if (index !== 0) {

        /**
         * Distance
         * Incremental and cumulative distance
         */
        dDist = p2p(point, lastPoint);
        distance += dDist;
        eDist += dDist;
        p2pMax = dDist > maxDist ? dDist : maxDist;

        /**
         * Moving Time
         * Compare speed between previous point and this, against threshold.
         * Eliminate data points below threshold
         * Output: new array with indexes of saved points
         */
        if ( isTime ) {

          thisTime = (new Date(point.time)) / 1000;    // time in seconds
          dTime = Math.ceil((thisTime-lastTime));    // time increment in seconds
          const speed = (dDist / 1000) / (dTime / 3600);         // km per hour

          time.push(dTime);
          if (speed > SPEED_THRESHOLD ) {
            movingTimeArr.push(dTime);
            movingDistArr.push(dDist);
          }

        }

         /**
         * Mile and KM splits
         * Create new arrays containing point number at milestone, and pace for last segment
         */
        if ( isTime ) {

          if ( distance / (1000 * (kmSplits.length + 1)) >= 1 || index === n) {
            const dt = (thisTime - lastKmStartTime) / 60;
            const dd = (distance - lastKmStartDist) / 1000;
            const pace = point.time ? dt/dd : 0;
            kmSplits.push([index, pace]);
            lastKmStartTime = thisTime;
            lastKmStartDist = distance;
          }
          if ( distance * KM_TO_MILE / (1000 * (mileSplits.length + 1)) >= 1 || index === n) {
            const dt = (thisTime - lastMileStartTime) / 60;
            const dd = (distance - lastMileStartDist) / 1000 * KM_TO_MILE;
            const pace = point.time ? dt/dd : 0;
            mileSplits.push([index, pace]);
            lastMileStartTime = thisTime;
            lastMileStartDist = distance;
          }

        }

         /**
         * Elevation tracking and analyse gradient and hills
         * Count cumulative elevation gain/drop
         * Gradient and slope type
         */
        if ( isElev ) {
          // elevation data exists on this point

          dElev = point.elev - lastPoint.elev;
          ascent = dElev > 0 ? ascent + dElev : ascent;
          descent = dElev < 0 ? descent + dElev : descent;

          if ( dElev != 0 ) {
            // elevation has changed since the last loop

            lastFiltElev = thisFiltElev;

            // filter the elevation using LP filter : newValue = measuredValue * alpha + oldValue * (1 - alpha)
            thisFiltElev = point.elev * ALPHA + thisFiltElev * ( 1 - ALPHA );
            const gradient = (thisFiltElev - lastFiltElev) / eDist * 100;

            // determine type of slope based on gradient
            if ( gradient < (-GRAD_THRESHOLD) ) { thisSlopeType = -1; }
            else if ( gradient > GRAD_THRESHOLD ) { thisSlopeType = 1; }
            else { thisSlopeType = 0; };

            // max gradient; gets reset if slopetype changes
            gradM = Math.abs(gradient) > gradM ? Math.abs(gradient) : gradM;

            // reset distance each time elevation changes
            eDist = 0;

          }


          if ( typeof lastSlopeType === 'undefined' ) {
            // slopeType has not been initialised: do so
            lastSlopeType = thisSlopeType;
            e0 = thisFiltElev;

          } else {
            // slopeType exists

            if ( thisSlopeType !== lastSlopeType  || index === n) {
              // slopetype has changed

              const de = thisFiltElev - e0;
              if ( Math.abs(de) > HILL_THRESHOLD ) {

                const dd = distance - d0;
                const dt = (thisTime - t0);

                hills.push({
                  dHeight: de,
                  dDist: dd,
                  dTime: isTime ? dt : 0,
                  pace: isTime ? (dt/60)/(dd/1000) : 0,
                  ascRate: isTime ? de/(dt/60) : 0,
                  gradient: {
                    max: lastSlopeType === 1 ? gradM : -gradM,
                    ave: de / dd * 100
                  }
                });

              }
              d0 = distance;
              t0 = thisTime;
              e0 = thisFiltElev;
              gradM = 0;
              lastSlopeType = thisSlopeType;
            }
          }

        } // if (point.elev)
        lastTime = thisTime;

      } else {
        // index === 0

        if ( isElev) thisFiltElev = point.elev;

        if ( isTime ) {
          lastTime = (new Date(point.time)) / 1000;
          lastKmStartTime = lastTime;
          lastMileStartTime = lastTime;
        }

      }

     /**
     * Bounding box
     */
      bbox[0] = point.lng < bbox[0] ? point.lng : bbox[0];
      bbox[1] = point.lat < bbox[1] ? point.lat : bbox[1];
      bbox[2] = point.lng > bbox[2] ? point.lng : bbox[2];
      bbox[3] = point.lat > bbox[3] ? point.lat : bbox[3];

     /**
     * Keep track of previous points for next loop
     */
      lastPoint = point;

    }); // forEach

    if ( isTime ) {
      var duration = time.reduce((a, b) => { return a + b }, 0 );
      var movingTime = movingTimeArr.reduce((a, b) => { return a + b }, 0 );
      var movingDist = movingDistArr.reduce((a, b) => { return a + b }, 0 );
    }

    return{
      parameters: {
        time: time,
        heartRate: heartRate,
        cadence: cadence,
        elevation: elevation
      },
      statistics: {
        duration: isTime ? duration: 0,
        bbox: bbox,
        startTime: isTime ? startTime : 0,
        movingTime: isTime ? movingTime : 0,
        movingDist: isTime ? movingDist : 0,
        distance: distance,
        ascent: ascent,
        descent: descent,
        hills: hills,
        pace: isTime ? (duration/60) / (distance/1000) : 0,
        movingPace: isTime ? (movingDist/60) / (movingDist/1000) : 0,
        kmSplits: kmSplits,
        mileSplits: mileSplits,
        p2p: {
          max: p2pMax,
          ave: distance / n
        }
      }

    }

  }

}





/**
 * function simplifyPath
 * simplify path using perpendicular distance method
 * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.95.5882&rep=rep1&type=pdf
 */
function simplify(points) {

	const tol = 5;                      // tolerance value in metres; the higher the value to greater the simplification
  const l_orig = points.length;  // length of array to calculate compression ratio
  let i;
  let flag = true;
  let pd;

	// Repeat loop until no nodes are deleted

  while ( flag === true ) {

    i = 0;
    flag = false;   // if remains true then simplification is complete; loop will break

    while ( i < ( points.length - 2 ) ) {
      pd = p2l( points[i], points[i+2], points[i+1] );
      if ( Math.abs(pd) < tol ) {
        points.splice(i+1, 1);
        flag = true;
      }
      i++;
    }

  }

  //compression ration for info only
  console.log( 'Simplified path to: ' + ((points.length/l_orig)*100.0).toFixed(1) + '%');

  return points;

}


class Track extends Path {
  constructor(name, points){
    super(name, points);

    let pathData = this.analysePath();
    this.category = this.category();
    this.stats = pathData.statistics;
    this.pathType = 'track';
    this.formatForMongo();
  }
}

class Route extends Path {
  constructor(name, points){
    super(name, simplify(points));

    let pathData = this.analysePath();
    this.category = this.category();
    this.stats = pathData.statistics;
    this.pathType = 'route';
    this.formatForMongo();
  }
}

module.exports = {
  Route,
  Track,
  Path
};




        // profile.forEach( (p, i) => {

        //   const thisP3 = p[3];

        //   if ( i !== 0 ) {
        //     if ( thisP3 !== lastP3 || i === profile.length-1) {
        //       const dElev = profile[i][1] - profile[i0][1];
        //       if ( Math.abs(dElev) > hillThreshold ) {
        //         const dDist = profile[i][0] - profile[i0][0];
        //         const timei = new Date(profile[i][5]);
        //         const timei0 = new Date(profile[i0][5]);
        //         const dTime = (timei - timei0) /1000;
        //         const gradA = dElev / dDist * 100;
        //         hills.push({
        //           'dHeight': dElev,
        //           'dDist': dDist,
        //           'dTime': dTime,
        //           'pace': dTime/dDist/1000/60,
        //           'ascRate': dElev/dTime/60,
        //           'gradient': {
        //             'max': lastP3 === 1 ? gradM : -gradM,
        //             'ave': gradA
        //           }
        //         });
        //       }
        //       gradM = 0;
        //       i0 = i;
        //     } // if (thisP3 != lastP3)
        //     gradM = Math.abs(p[4]) > gradM ? Math.abs(p[4]) : gradM;
        //   } // if (i !== 0)

        //   lastP3 = thisP3;

        // })
