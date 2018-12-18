const contourPalette = require('./utils.js').contourPalette;
const p2p = require('./geo.js').p2p;
const Point = require('./_Point.js').Point;

class Match {
  constructor(matchObject) {

    // class variables
    this.gapTolerance = 500;  // in metres
    this.fudgeFactor = 1.0001;
    this.matchTolerance = 20;  // in metres

    if ( !matchObject ) {
      // if match object does not exist, then create template

    } else {

      // otherwise use data supplied
      this.userId = matchObject.userId;
      this.routeId = matchObject.routeId;
      this.bbox = matchObject.bbox;
      this.lngLat = matchObject.lngLat;
      this.tracks = matchObject.tracks;
      this.dist = matchObject.dist;
      this.trksList = matchObject.trksList;
      this.nmatch = matchObject.nmatch;
      this.matchDistance = matchObject.matchDistance;

    }
  }

  /**
   * Activate route matching logic
   */
  run(rte, trks) {

  /**
   *  Route matching algorithm
   *
   * Notes from previous ruby implmentation
    # 1) for each route point check against all bounding boxes as you go, thereby removing outer loop ... quicker?
    # 2) optimise 'point skipping' logic
    # 3) implement 'point skipping' on route points
    # 4) better selection of tracks from mysql database
    # 5) better utilisation of mysql - return only sections of route of interest??
    # 6) employ route simplification?
   *
   * Implemntation approach
   * ======================
   * For each provided route
   *   For each provided track
   *     Loop through route points, for each route point
   *       Check if route point is within bounding box of current selected track
   *         If it is, then loop through all the points of the track to find point closest to current route point
   *         If it isn't, then just carry on
   *       End of loop
   *     End of loop
   *   End of loop
   * End of loop
   */

    console.log('Match.run()...')
    // check supplied rte is consistent with routeId on Match class
    if ( typeof this.lngLat === 'undefined' ) {
      // this is a new match, so check is not relevant: populate class data
      this.userId = rte.features[0].userId;
      this.lngLat = rte.features[0].geometry.coordinates;
      this.bbox = rte.bbox;
      this.routeId = rte.features[0]._id;
      this.tracks = Array.from(this.lngLat, x => []);
      this.dist = Array.from(this.lngLat, x => []);
      this.nmatch = Array.from(this.lngLat, x => 0);
      this.trksList = [];
      this.matchDistance =  0;

    } else {
      // match already exists, so confirm
      if ( rte.features[0]._id != this.routeId ) {
        console.error('Match.run error: routeId is not consistent with that on Match class')
      }
    }
    // loop through each track
    trks.features.forEach( (trk) => {

      // find bounding box coords for current track
      const minLng = trk.bbox[0] < 0 ? trk.bbox[0] * this.fudgeFactor : trk.bbox[0] / this.fudgeFactor;
      const minLat = trk.bbox[1] < 0 ? trk.bbox[1] * this.fudgeFactor : trk.bbox[1] / this.fudgeFactor;
      const maxLng = trk.bbox[2] < 0 ? trk.bbox[2] / this.fudgeFactor : trk.bbox[2] * this.fudgeFactor;
      const maxLat = trk.bbox[3] < 0 ? trk.bbox[3] / this.fudgeFactor : trk.bbox[3] * this.fudgeFactor;

      // loop through each route point
      this.lngLat.forEach( (r, iRtePt) => {

        const rtePoint = new Point(r);

        // check if current route point is within bounding box of current track
        if ( rtePoint.lng < maxLng && rtePoint.lng > minLng && rtePoint.lat < maxLat && rtePoint.lat > minLat ) {

          // if route point is within tracks bounding box, loop trhough track to find matching point(s)
          trk.geometry.coordinates.forEach( (t) => {

            const trkPoint = new Point(t);

            // get distance from route point and track point
            let d = Math.round(p2p(rtePoint, trkPoint)*100)/100;

            // if dist < tol then update matched arrays
            if ( d < this.matchTolerance ) {

              const i = this.tracks[iRtePt].indexOf(trk._id)

              if ( i === -1 ) {
                // if track is not found on current point, push it to array
                this.tracks[iRtePt].push(trk._id);
                this.nmatch[iRtePt]++;
                this.dist[iRtePt].push(d);

              } else {
                // if track is found on current point, update distance in array

                if ( d < this.dist[iRtePt][i] ) {
                  this.dist[iRtePt][i] = d;
                }
              }

              // if track is not found in overall tracks list, push it
              if ( this.trksList.indexOf(trk._id) === -1 ) {
                this.trksList.push(trk._id);
              }
            } // if ( dist ...

          }) //trk.forEach

        } // if ( rtePt[0] ...

      }) // rteCoords.forEach

    }) // t.forEach


    this.updateStats();
  }

  /**
   * Remove a track from the current match
   */
  removeTrack(trkId) {

    // remove track id from trksList
    this.trksList.splice(this.trksList.indexOf(trkId), 1)
    // loop through points and remove track id and dist where it exists
    this.tracks.forEach ( (t, index) => {
      let i = t.indexOf(trkId);
      if ( i !== -1 ) {
        this.tracks[index].splice(i, 1);
        this.dist[index].splice(i, 1);
        this.nmatch[index]--;
      }
    })
    this.updateStats();

  }

  /**
  * Add a new track to the current match
  */
  addTrack(rte, trk) {
    this.run(rte, trk);
  }

  /**
  * Update the match statistics following a change
  */
  updateStats() {

    console.log('Match.updateStats()...')
    let gapDist = 9999;
    let mDist = 0;
    let gapStart = 0;
    let lastPoint;

    // loop though each route point and count matched distance, and fill if needed
    this.lngLat.forEach( (p, i) => {

      const thisPoint = new Point(p);
      if ( i !== 0 ) {
        // skip the first point
        const d = p2p(lastPoint, thisPoint);

        if ( this.nmatch[i-1] > 0 && this.nmatch[i] > 0) {
          // if both this point and the previous one are matched, increment match distance
          mDist = mDist + d;

          if ( gapDist < this.gapTolerance ) {
            // if length of gap was > tolerance then fill the gap and add dist
            const n = i - gapStart - 1;
            const f = new Array(n).fill(-1);
            this.nmatch.splice(gapStart, n, ...f)
            mDist = mDist + gapDist;
          }
          gapDist = 9999;

        } else {

          // otherwise measure gap length
          if ( gapDist === 9999 ) {
            gapStart = i;
            gapDist = 0;
          }
          gapDist = gapDist + d;

        }
      }

      lastPoint = thisPoint;

    })

    this.matchDistance = mDist;

    console.log('Finished');
  }

  plotContour() {

    // get colour palette for contours
    let geomArr = [];
    const nColours = 9;
    const colours = contourPalette(nColours);

    // find min and max number of matches for contour plot
    // find the max of (minimum for each two adjacent numbers)
    let min = 9999, max = -1;
    this.lngLat.forEach( (p, i) => {
      if ( i > 0 ) {
        if ( this.nmatch[i] !== -1 && this.nmatch[i-1] !== -1 ) {
            const mintemp = Math.max(this.nmatch[i], this.nmatch[i-1]);
            const maxtemp = Math.min(this.nmatch[i], this.nmatch[i-1]);
            min = mintemp < min ? mintemp : min;
            max = maxtemp > max ? maxtemp : max;
        }
      }
    })

    // define some stuff, then loop through points applying style
    const shift = (max - min) / (nColours - 1) * 0.5;
    let i0 = 0, c0;

    this.lngLat.forEach( (p, i) => {
      if ( i !== 0 ) {
        const nMatches = Math.min(this.nmatch[i] == -1 ? 0 : this.nmatch[i], this.nmatch[i-1] == -1 ? 0 : this.nmatch[i-1]);
        const cIndex = Math.ceil((nMatches - min + shift) / (max - min + 2*shift) * nColours);

        // only check on 2nd pass through we we need access to first line's colour (via cIndex)
        if ( (i > 1 && cIndex !== c0) || i === this.lngLat.length - 1 ) {
          geomArr.push({
            'type': 'Feature',
            'geometry':
              {'coordinates' : this.lngLat.slice(i0, i === this.lngLat.length - 1 ? i+2 : i),
                'type': 'LineString'},
            'properties':
              {'color': colours[c0-1]}
          });

          i0 = i - 1;
        } // if ( (i > 1 && c...

        c0 = cIndex;
      } // if ( i !
    }) // forEach

    return {
      'type': 'FeatureCollection',
      'plotType': 'contour',
      'stats': {
        'matchDistance': this.matchDistance,
        // 'dist': this.dist,
      },
      'bbox': this.bbox,
      'features': geomArr
    }

  } // plotContour


  plotBinary() {

    let geomArr = [], i0 = 0, c0;
    let isMatched = false;
    let wasMatched = false;

    this.lngLat.forEach( (p, i) => {

      isMatched = this.nmatch[i] === 0 ? false : true;
      if ( i !== 0 ) {

        const colour = ( isMatched && wasMatched ) ?  '#0000FF' : '#000000';
        if ( i > 1 && colour !== c0 || i === this.lngLat.length - 1 ) {
          // colour has changed or its the last data point

          geomArr.push({
            'type': 'Feature',
            'geometry':
              {'coordinates' : this.lngLat.slice(i0, i === this.lngLat.length - 1 ? i+2 : i),
                'type': 'LineString'},
            'properties':
              {'color': c0}
          });
          i0 = i - 1;

        }
        c0 = colour;

      }
      wasMatched = isMatched;
    })

    return {
      'type': 'FeatureCollection',
      'plotType': 'binary',
      'stats': {
        'matchDistance': this.matchDistance,
        // 'dist': this.dist,
      },
      'bbox': this.bbox,
      'features': geomArr
    }

  } // plotBinary

}


module.exports = {
  Match
};
