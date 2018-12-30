const p2p = require('./geo.js').p2p;
const p2l = require('./geo.js').p2l;
const Point = require('./_Point.js').Point;



class Path  {

  constructor(lngLat, elev, time, heartRate, cadence) {


    this.lngLat = lngLat;

    if (time) {
      if (typeof time[0] === 'string') {
        // have recieved array of timestamps - convert to increments in seconds
        this.startTime = time[0];
        this.time = time.map( (t, i, a) => {
          return i===0 ? 0 : (new Date(t) / 1000) - (new Date(a[i-1]) / 1000)
        });
      } else {
        // have recieved array of increments - use as-is
        this.time = time;
      }
    }

    this.pathSize = this.lngLat.length - 1;

    if (elev) this.elev = elev;
    if (heartRate) this.heartRate = heartRate;
    if (cadence) this.cadence = cadence;
    // this.category = category();


  }

  injectKeyValuePair(obj) {
    this[Object.keys(obj)[0]] = Object.values(obj)[0];
  }

  mongoFormat(userId, isSaved) {
    // return object in format required to save to mongo

    // console.log(this.analysePath());
    const params = {};
    if (this.time) params.time = this.time;
    if (this.elev) params.elev = this.elev;
    if (this.heartRate) params.heartRate = this.heartRate;
    if (this.cadence) params.cadence = this.cadence;

    const category = this.category();
    const name = typeof this.name === 'undefined' ? "" : this.name;
    const stats = this.analysePath();

    return {
      userId: userId,
      isSaved: isSaved,
      pathType: this.pathType,
      startTime: this.startTime,
      category: category,
      name: name,
      description: this.description,
      geometry: {
        type: 'LineString',
        coordinates: this.lngLat
      },
      params: params,
      stats: stats,
      // listStats: {
      //   name: name,
      //   category: category,
      //   startTime: this.startTime,
      //   pathDistance: stats.distance,
      //   duration: stats.duration,
      // },
    }
  }

  point(index) {
    // return data for a single point
    let thisPoint = [];
    if ( this.lngLat ) thisPoint.push(this.lngLat[index]);
    if ( this.elev ) thisPoint.push(this.elev[index]);
    if ( this.time ) thisPoint.push(this.time[index]);
    if ( this.heartRate ) thisPoint.push(this.heartRate[index]);
    if ( this.cadence ) thisPoint.push(this.cadence[index]);
    return (new Point(thisPoint));
  }



  category() {

    const MATCH_DISTANCE = 25;   // in m, if points are this close then consider as coincident
    const BUFFER = 50;           // number of points ahead to skip in matching algorithm
    const PC_THRESH_UPP = 90;    // % above which to consider as out and back
    const PC_THRESH_LOW = 10;    // % below which to consider as one way or loop

    // loop through points and match each point against remaining points in path; count matches
    let nm = 0;
    for ( let i = 0; i < this.pathSize - BUFFER; i++ ) {
      for ( let j = i + BUFFER; j < this.pathSize; j++ ) {
        if ( p2p(this.point(i), this.point(j)) < MATCH_DISTANCE ) {
          nm++;
          break;
        }
      }
    }

    // caculate proportion of points that are matched ( x2 becasue only a max 1/2 of points can be matched)
    const pcShared = nm / this.pathSize * 100 * 2;

    // determine path category
    if ( p2p(this.point(0), this.point(this.pathSize)) < MATCH_DISTANCE * 10 ) {
      // path ends where it started, within tolerance

      if ( pcShared > PC_THRESH_UPP ) return 'Out and back'
      else if (pcShared < PC_THRESH_LOW ) return 'Circular'
      else return 'Hybrid'

    } else {
      // path did not end where it started

      if ( pcShared > PC_THRESH_UPP ) return 'Out and back'
      else if (pcShared < PC_THRESH_LOW ) return 'One way'
      else return 'Hybrid'

    }
  }

  analysePath() {


    const KM_TO_MILE = 0.6213711922;
    const ALPHA = 0.3;             //low pass filter constant, to higher the number the quicker the response
    const GRAD_THRESHOLD = 2;      // gradient in % above which is considered a climb/descent
    const HILL_THRESHOLD = 20;     // hills of less height gain will not be considered
    const SPEED_THRESHOLD = 1.4;   // km/h

    let maxDist = 0;
    let bbox = [ 180, 90, -180, -90 ]; //minLng, minLat, maxLng, maxLat
    let p2pMax = 0;

    // increments from last point
    let dDist = 0;
    let dElev = 0;

    // cumulative counters
    let distance = 0;
    let ascent = 0;
    let descent = 0;

    let movingTime = 0;
    let movingDist = 0;
    let duration = 0;

    // this and last point values
    let thisFiltElev; // needs to be undefined as its checked
    let lastFiltElev;
    let lastPoint;
    let lastSlopeType;
    let thisSlopeType;    // 0 = flat, 1 = ascending, -1 = descending
    let lastKmStartTime = 0;        // time at which previous km marker was reached
    let lastMileStartTime = 0;      // time at which previous mile marker was reached
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

    /**
     * Pre-process
     *
     */
    const isTime = typeof this.point(0).time !== 'undefined' ? true : false;
    const isElev = typeof this.point(0).elev !== 'undefined' ? true : false;

    let index = 0;
    do  {

      const thisPoint = this.point(index);

      // skipping the first point, compare this point to the previous one
      if (index !== 0) {

        /**
         * Distance
         * Incremental and cumulative distance
         */
        dDist = p2p(thisPoint, lastPoint);
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

          // track moving time and distance
          if ((dDist / 1000) / (thisPoint.time / 3600) > SPEED_THRESHOLD ) {
            movingTime += thisPoint.time;
            movingDist += dDist;
          }
          // total time to this point
          duration += thisPoint.time;

        }

         /**
         * Mile and KM splits
         * Create new arrays containing point number at milestone, and pace for last segment
         */

          if ( distance / (1000 * (kmSplits.length + 1)) >= 1 || index === this.pathSize) {
            // first point past finished km
            if ( isTime ) {
              var dt = (duration - lastKmStartTime) / 60;     //time in mins
              var dd = (distance - lastKmStartDist) / 1000;
            }
            kmSplits.push([index, isTime ? dt/dd : 0]);
            lastKmStartTime = duration;
            lastKmStartDist = distance;
          }
          if ( distance * KM_TO_MILE / (1000 * (mileSplits.length + 1)) >= 1 || index === this.pathSize) {
            if ( isTime ) {
              var dt = (duration - lastMileStartTime) / 60;
              var dd = (distance - lastMileStartDist) / 1000 * KM_TO_MILE;
            }
            mileSplits.push([index, isTime ? dt/dd : 0]);
            lastMileStartTime = duration;
            lastMileStartDist = distance;
          }


         /**
         * Elevation tracking and analyse gradient and hills
         * Count cumulative elevation gain/drop
         * Gradient and slope type
         */
        if ( isElev ) {
          // elevation data exists on this point

          dElev = thisPoint.elev - lastPoint.elev;
          ascent = dElev > 0 ? ascent + dElev : ascent;
          descent = dElev < 0 ? descent + dElev : descent;

          if ( dElev != 0 ) {
            // elevation has changed since the last loop

            lastFiltElev = thisFiltElev;

            // filter the elevation using LP filter : newValue = measuredValue * alpha + oldValue * (1 - alpha)
            thisFiltElev = thisPoint.elev * ALPHA + thisFiltElev * ( 1 - ALPHA );
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
            gradM = 0;

          } else {
            // slopeType exists

            if ( thisSlopeType !== lastSlopeType  || index === this.pathSize) {
              // slopetype has changed

              const de = thisFiltElev - e0;
              if ( Math.abs(de) > HILL_THRESHOLD ) {

                const dd = distance - d0;
                const dt = (duration - t0);

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
              t0 = duration;
              e0 = thisFiltElev;
              gradM = 0;
              lastSlopeType = thisSlopeType;
            }
          }

        } // if (point.elev)

      } else {
        // index === 0

        if ( isElev) thisFiltElev = this.point(index).elev;



      }

     /**
     * Bounding box
     */
      bbox[0] = thisPoint.lng < bbox[0] ? thisPoint.lng : bbox[0];
      bbox[1] = thisPoint.lat < bbox[1] ? thisPoint.lat : bbox[1];
      bbox[2] = thisPoint.lng > bbox[2] ? thisPoint.lng : bbox[2];
      bbox[3] = thisPoint.lat > bbox[3] ? thisPoint.lat : bbox[3];

     /**
     * Keep track of previous points for next loop
     */
      lastPoint = thisPoint;
      index++;

    } while (index <= this.pathSize)

    return{

      duration: isTime ? duration: 0,
      bbox: bbox,
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
        ave: distance / this.pathSize
      }

    }

  }


/**
 * function simplifyPath
 * simplify path using perpendicular distance method
 * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.95.5882&rep=rep1&type=pdf
 */

  simplify() {

    const TOLERANCE = 10;     // tolerance value in metres; the higher the value to greater the simplification
    const origLength = this.lngLat.length - 1.
    let i;
    let flag = true;

    // create array of indexes - what remains at end are points remaining aftre simplification
    let j = Array.from(this.lngLat, (x, i) => i)

    // Repeat loop until no nodes are deleted
    while ( flag === true ) {
      i = 0;
      flag = false;   // if remains true then simplification is complete; loop will break

      while ( i < ( j.length - 2 ) ) {

        // find perpendicular distance from line p(i)-p(i+2) to point p(i+1)
        const pd = p2l( this.point(j[i]), this.point(j[i+2]), this.point(j[i+1]) );
        if ( Math.abs(pd) < TOLERANCE ) {
          j.splice(i+1, 1);
          flag = true;
        }
        i++;

      }
    }

    // strip out points from class using whats left of j
    this.lngLat = j.map( x => this.lngLat[x] );
    console.log(this.time);
    if ( typeof this.elev !== 'undefined') {
      if ( this.elev.length !== 0 ) this.elev = j.map( x => this.elev[x] );
    }
    if ( typeof this.time !== 'undefined') {
      if ( this.time.length !== 0 ) this.time = j.map( x => this.time[x] );
    }

    // update path length
    this.pathSize = this.lngLat.length - 1;

    //compression ratio for info only
    console.log( 'Simplified path to: ' + ((j.length/origLength)*100.0).toFixed(1) + '%');

  }

}


class Track extends Path {
  constructor(name, description, lngLat, elev, time, heartRate, cadence){

    super(lngLat, elev, time, heartRate, cadence);

    this.pathType = 'track';
    this.name = name;
    this.description = description;

  }
}

class Route extends Path {
  constructor(name, description, lngLat, elev, time, heartRate, cadence){

    super(lngLat, elev, time, heartRate, cadence);

    this.pathType = 'route';
    this.name = name;
    this.description = description;

    this.simplify();

  }
}


module.exports = {
  Path, Track, Route
};
