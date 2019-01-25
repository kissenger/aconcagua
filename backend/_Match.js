const contourPalette = require('./utils.js').contourPalette;
const p2p = require('./geoLib.js').p2p;
const Point = require('./geoLib.js').Point;

GAP_TOLERANCE = 500;  // in metres
FUDGE_FACTOR = 1.0001;
MATCH_TOLERANCE = 20;  // in metres


/**
 * MatchRoute expects list of lngLats
 * Provides point method to extract objectified point data for a given index
 */
class MatchPath {

  constructor(lngLat) {
    this.lngLat = lngLat;
  }

  getPoint(index) {
    return (new Point([this.lngLat[index]]));
  }

}

/**
 * MatchTrack expects mongo document
 * Populates the instance with document data before invoking parent class
 */
class MatchTrack extends MatchPath {

  constructor(mDocument) {

    super(mDocument.geometry.coordinates);

    this.id = mDocument._id;
    this.bbox = mDocument.stats.bbox;


  }

}


/**
 * Class inputs
 *    rte {array} each column is a seperate route segment **NOT A PATH INSTANCE**
 *      (note this means that path.point() method is not available)
 *    matchObject {Object} Mongo document containing stored data from existing match
 * These arrays are internal and map to the provided rte array
 *    nmatch (number match) {Array} 2D array providing number of matches on each route point
 *    tmatch (track match) {Array} 2D array providing tracks matched against each route point
 *    dmatch (distance match) {Array} 2d array providing closest distance btwn matched trackk and route point
 * Other internal variables
 *    route is array of MatchPath instances, each eleemnt of the array is a different segment of the route
 */
class Match {

  constructor(rte, matchObject) {

    if (rte) {
      this.challengeId = rte._id,
      this.bbox = rte.stats.bbox,
      this.route = rte.geometry.coordinates.map(x => new MatchPath(x));
    }
    this.params = matchObject.params;
    if (!this.stats) this.stats = matchObject.stats;
    console.log(this.route);
  }

 /**
  * Removes a track from the match following deletion of track by stripping out
  * any mention of the track from the match arrays nmatch, tmatch and dmatch
  * @param {string} trkId as string
  */
  removeTrack(trkId) {

    // remove track id from trksList
    this.params.trksList.splice(this.params.trksList.indexOf(trkId), 1)

    // loop through points and remove track id and dist where it exists
    this.params.tmatch.forEach(segment => {
      segment.forEach( (point, index) => {
        let i = point.indexOf(trkId);
        if ( i !== -1 ) {
          this.params.nmatch[index]--;
          this.params.tmatch[index].splice(i, 1);
          this.params.dmatch[index].splice(i, 1);
        }
      })
    })

    // reanalyse stats
    this.getMatchStats();

  }


  // /**
  //  *
  //  * @param {*} trks
  //  */
  // createTrackPaths(trks) {

  //   // if trks isnt an array, make it one
  //   if ( !(trks instanceof Array) ) trks=[trks];

  //   return trks.map( (t) => {
  //     const a = new Path(t.geometry.coordinates);
  //     a.injectKeyValuePair({'pathId': t._id});
  //     a.injectKeyValuePair({'bbox': t.stats.bbox});
  //     return a;
  //   });
  // }


  /**
   * Add a new track or array of tracks to the match
   * Converts each track to an instance of MatchTrack class before invoking analyseMatch()
   * @param {MongoDocument} trks array of mongo documents from query
   */
  addTracks(trks) {

    if ( !(trks instanceof Array) ) trks=[trks];
    const trksInstances = trks.map(trk => new MatchTrack(trk));
    this.analyseMatch(trksInstances);

  }


  /**
   * Updates match statistics, presumably after a change to class members
   */
  getMatchStats() {

    console.log('Match.updateStats()...')
    let gapDist = 9999;
    let mDist = 0;
    let gapStart = 0;
    let lastPoint;

    // loop through each route segment
    this.route.forEach(segment => {
      console.log(segment.lngLat);
      // for each point count matched distance, and fill if needed

      for (let i = 0, n = segment.lngLat.length; i < n; i++) {
      // loop though each route point and count matched distance, and fill if needed

        const thisPoint = segment.getPoint(i);
        if ( i !== 0 ) {
          const d = p2p(thisPoint, lastPoint);

          if ( this.params.nmatch[i-1] > 0 && this.params.nmatch[i] > 0) {
            // if both this point and the previous one are matched, increment match distance
            mDist += d;

            if ( gapDist < GAP_TOLERANCE ) {
              // if length of gap was > tolerance then fill the gap and add dist
              const n = i - gapStart - 1;
              const f = new Array(n).fill(-1);
              this.params.nmatch.splice(gapStart, n, ...f)
              mDist += gapDist;
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
        } // if ( i !== 0 )

        lastPoint = thisPoint;
      } // for
    }) // route.forEach

    this.stats = {
      matchDistance: mDist,
      time: 0,
      nVisits: this.params.trksList.length + 1,
    }

    console.log('Finished');
  }


  /**
   * Prepares a GeoJson plot of path coloured for frequency each segment has been visited
   * TODO: see if this can be incorporated into a more generis GeoJson class
   */
  plotContour() {

    // get colour palette for contours
    let geomArr = [];
    const nColours = 9;
    const colours = contourPalette(nColours);

    // find min and max number of matches for contour plot
    // find the max of (minimum for each two adjacent numbers)
    let min = 9999, max = -1;
    this.route.lngLat.forEach( (p, i) => {
      if ( i !== 0 ) {
        if ( this.params.nmatch[i] !== -1 && this.params.nmatch[i-1] !== -1 ) {
            const mintemp = Math.max(this.params.nmatch[i], this.params.nmatch[i-1]);
            const maxtemp = Math.min(this.params.nmatch[i], this.params.nmatch[i-1]);
            min = mintemp < min ? mintemp : min;
            max = maxtemp > max ? maxtemp : max;
        }
      }
    })

    // define some stuff, then loop through points applying style
    const shift = (max - min) / (nColours - 1) * 0.5;
    let i0 = 0, c0;

    this.route.lngLat.forEach( (p, i) => {
      if ( i !== 0 ) {
        const nMatches = Math.min(
          this.params.nmatch[i] == -1 ? 0 : this.params.nmatch[i],
          this.params.nmatch[i-1] == -1 ? 0 : this.params.nmatch[i-1]
        );
        const cIndex = Math.ceil((nMatches - min + shift) / (max - min + 2*shift) * nColours);

        // only check on 2nd pass through we we need access to first line's colour (via cIndex)
        if ( (i > 1 && cIndex !== c0) || i === this.route.pathSize ) {
          geomArr.push({
            'type': 'Feature',
            'geometry':
              {'coordinates' : this.route.lngLat.slice(i0, i === this.route.pathSize ? i+2 : i),
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
      'stats': this.stats,
      'bbox': this.bbox,
      'features': geomArr
    }

  } // plotContour


  /**
   * Prepares a GeoJson plot of path coloured for whether segment has been visited or not
   * TODO: see if this can be incorporated into a more generis GeoJson class
   */
  plotBinary() {

    let geomArr = [], i0 = 0, c0;
    let isMatched = false;
    let wasMatched = false;

    this.route.lngLat.forEach( (p, i) => {

      isMatched = this.params.nmatch[i] === 0 ? false : true;
      if ( i !== 0 ) {

        const colour = ( isMatched && wasMatched ) ?  '#0000FF' : '#FF0000';
        if ( i > 1 && colour !== c0 || i === this.route.pathSize ) {
          // colour has changed or its the last data point
          geomArr.push({
            'type': 'Feature',
            'geometry':
              {'coordinates' : this.route.lngLat.slice(i0, i===this.route.pathSize ? i+2 : i),
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
      'stats': this.stats,
      'bbox': this.bbox,
      'features': geomArr
    }
  }


  /**
   * Processes routes and tracks
   * @param {Array<Array<number>>} track array of arrays of lngLat pairs, defining target tracks
   * @returns nothing, just updates class variables
   * ------------------------------------------------------------------------------------------
   * Implementation
   *  > for each track
   *    > for each route point array
   *      > for each route point
   *        > if route point is within tracks bounding box
   *          > call function to lop trhough trackpoints
   *        > next if
   *      > next track point
   *    > next route point array
   *  > next track
   */
  analyseMatch(tracks) {

    tracks.forEach((track) => {

      const trackBoundingBox = this.boundingBoxFudger(track.bbox)

      this.route.forEach( (routeSegment) => {
        routeSegment.lngLat.forEach( (rp, irp) => {

          if (this.isPointInBBox(rp, trackBoundingBox)) {
            this.compareTrackAgainstPoint(track, routeSegment, irp);
          };

        }); //rteSegment.forEach
      }); // route.lngLat.forEach
    }); // tracks.forEach
    this.getMatchStats();
  }


  /**
   * Calculates distance of all track points to provided point, updating match
   * data if distance is within defined threshold
   * @param {MatchTrack} trk MatchTrack class instance
   * @param {MatchPath} rSeg route segment as MatchPath class instance
   * @param {number} irp route point as index
   * @returns nothing, just updates class variables
   */
  compareTrackAgainstPoint(trk, rSeg, irp) {

    routePoint = rSeg.getPoint(irp);
    trk.lngLat.forEach( (tp, itp) => {

      const trackPoint = track.getPoint(itp);
      let d = Math.round(p2p(routePoint, trackPoint) * 100) / 100;
      if ( d < MATCH_TOLERANCE ) {

        const i = this.params.tmatch[irp].indexOf(track.id);

        if ( i === -1 ) {
          // if track is not found on current point, push it to array
          this.params.nmatch[irp]++;
          this.params.tmatch[irp].push(track.id);
          this.params.dmatch[irp].push(d);

        } else {
          // if track is found on current point, update distance in array
          this.params.dmatch[irp][i] = d < this.params.dist[irp][i] ? d : this.params.dist[irp][i];
        }

        // if track is not found in overall tracks list, push it
        if ( this.params.trksList.indexOf(track.id) === -1 ) {
          this.params.trksList.push(track.id);
        }
      }
    })

  }

  /**
   * Enlargens a bounding box by an arbitrary factor
   * @param {Array<number>} bbox bounding box as [minLng, minLat, maxLng, maxLat]
   * @returns bbox bounding box as [minLng, minLat, maxLng, maxLat]
   */
  boundingBoxFudger(bbox) {
    const minLng = bbox[0] < 0 ? bbox[0] * FUDGE_FACTOR : bbox[0] / FUDGE_FACTOR;
    const minLat = bbox[1] < 0 ? bbox[1] * FUDGE_FACTOR : bbox[1] / FUDGE_FACTOR;
    const maxLng = bbox[2] < 0 ? bbox[2] / FUDGE_FACTOR : bbox[2] * FUDGE_FACTOR;
    const maxLat = bbox[3] < 0 ? bbox[3] / FUDGE_FACTOR : bbox[3] * FUDGE_FACTOR;
    return [minLng, minLat, maxLng, maxLat];
  }


  /**
   * Determines if point lies within bounding box
   * @param {Array<number>} bbox bounding box as [minLng, minLat, maxLng, maxLat]
   * @param {Array<number>} point point as lngLat coordinate pair
   * @returns {boolean} true if point is in box, false otherwise
   */
  isPointInBBox(point, bbox) {
    return  point[0] < bbox[2] &&  /* less than maxLng */
            point[0] > bbox[0] &&  /* greater than minLng */
            point[1] < bbox[1] &&  /* less than maxLat */
            point[1] > bbox[1] ;   /* greater than minLat */
  }

  // analyseMatch(tracks) {

  //   console.log('Match.analyseMatch()...')

  //   // loop through each track
  //   tracks.forEach( (track) => {

  //     // find bounding box coords for current track
  //     const minLng = track.bbox[0] < 0 ? track.bbox[0] * FUDGE_FACTOR : track.bbox[0] / FUDGE_FACTOR;
  //     const minLat = track.bbox[1] < 0 ? track.bbox[1] * FUDGE_FACTOR : track.bbox[1] / FUDGE_FACTOR;
  //     const maxLng = track.bbox[2] < 0 ? track.bbox[2] / FUDGE_FACTOR : track.bbox[2] * FUDGE_FACTOR;
  //     const maxLat = track.bbox[3] < 0 ? track.bbox[3] / FUDGE_FACTOR : track.bbox[3] * FUDGE_FACTOR;

  //     // loop through each route point
  //     this.route.lngLat.forEach( (rp, irp) => {

  //       const routePoint = this.route.point(irp);

  //       if ( routePoint.lng < maxLng && routePoint.lng > minLng && routePoint.lat < maxLat && routePoint.lat > minLat ) {

  //         //  route point is within tracks bounding box
  //         track.lngLat.forEach( (tp, itp) => {

  //           const trackPoint = track.point(itp);

  //           let d = Math.round(p2p(routePoint, trackPoint)*100)/100;
  //           // if dist < tol then update matched arrays
  //           if ( d < MATCH_TOLERANCE ) {

  //             const i = this.params.tracks[irp].indexOf(track.pathId);

  //             if ( i === -1 ) {
  //               // if track is not found on current point, push it to array
  //               this.params.tracks[irp].push(track.pathId);
  //               this.params.nmatch[irp]++;
  //               this.params.dist[irp].push(d);

  //             } else {
  //               // if track is found on current point, update distance in array
  //               this.params.dist[irp][i] = d < this.params.dist[irp][i] ? d : this.params.dist[irp][i];
  //             }

  //             // if track is not found in overall tracks list, push it
  //             if ( this.params.trksList.indexOf(track.pathId) === -1 ) {
  //               this.params.trksList.push(track.pathId);
  //             }
  //           }
  //         }) //track.forEach

  //       } // if ( rtePt[0] ...

  //     }) // rteCoords.forEach

  //   }) // t.forEach
  //   this.matchStats();
  // }

}

/**
 * Invoked when no existing match is available; intialises variables for Match class
 * Class inputs
 *    rte {array} each column is a seperate route segment
 *    trks {array} each column is a seperate track to match against the provided route
 */
class NewMatch extends Match {

  constructor(rte, trks) {

    //set up blank match object
    const mObj = {
      challengeId: rte._id,
      bbox: rte.bbox,
      params: {
        trksList: [],

        // size arrays for later use
        nmatch: Array.from(rte.geometry.coordinates, x => Array.from(x, y => 0)),
        tmatch: Array.from(rte.geometry.coordinates, x => Array.from(x, y => [])),
        dmatch: Array.from(rte.geometry.coordinates, x => Array.from(x, y => [])),
        // time: Array.from(rte.geometry.coordinates, x => []),
        // elev: Array.from(rte.geometry.coordinates, x => []),
      },
      stats: {}
    }

    super(rte, mObj);
    this.addTracks(trks);

  }
}


module.exports = {
  Match,
  NewMatch
};





