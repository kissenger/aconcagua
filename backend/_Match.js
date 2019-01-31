const contourPalette = require('./utils.js').contourPalette;
const p2p = require('./geoLib.js').p2p;
const Point = require('./geoLib.js').Point;
const isPointInBBox = require('./geoLib.js').isPointInBBox;

GAP_TOLERANCE = 500;  // in metres
BBOX_FUDGE_FACTOR = 1.0001;
MATCH_TOLERANCE = 20;  // in metres


/**
 * PathFromCoords class
 * Objectifies LngLat array 
 */
class PathFromCoords {

  /**
   * @param {[[number]]} lngLat lngLat array
   */
  constructor(lngLat) {
    this.lngLat = lngLat;
  }

  /**
   * Objectifies point data as instance of Point class
   * @param {number} index of point to extract from lngLat array
   * @param {Point} returns Point class instance
   */
  getPoint(index) {
    return (new Point([this.lngLat[index]]));
  }

}

/**
 * PathFromDocument class
 * Objectifies lngLat array extracted from provided mongo Path document
 * Invokes the PathFromCoords class
 */ 
class PathFromDocument extends PathFromCoords {

  /**
   * @param {MongoDocument} mDocument  mongo path document for desired path
   */
  constructor(mDocument) {
    super(mDocument.geometry.coordinates);
    this.id = mDocument._id;
    this.bbox = mDocument.stats.bbox;
  } // constructor
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
 *    route is array of PathFromCoords instances, each eleemnt of the array is a different segment of the route
 */
class Match {

  /**
   * @param {[[number]]} rte array of array of lngLats where each column will be treated as route segment
   * @param {MongoDocument} matchObject Mongo document containing stored data from existing match
   */
  constructor(rte, matchObject) {

    if (rte) {
      this.challengeId = rte._id,
      this.bbox = rte.stats.bbox,
      this.route = rte.geometry.coordinates.map(x => new PathFromCoords(x));
    }
    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    // console.log(matchObject);
    this.params = matchObject.params;
    if (!this.stats) this.stats = matchObject.stats;
    
  } // constructor


  /**
   * Add a new track or array of tracks to the match
   * Converts each track to an instance of PathFromDocument class before invoking analyseMatch()
   * @param {MongoDocument} trks array of mongo documents from query
   */
  addTracks(trks) {

    if ( !(trks instanceof Array) ) trks=[trks];
    this.tracks = trks.map(trk => new PathFromDocument(trk));
    this.analyseMatch();

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


  /**
   * Updates match statistics, presumably after a change to class members
   */
  getMatchStats() {

    console.log('> Match.getMatchStats(): Start');
    let gapDist = 9999;
    let mDist = 0;
    let gapStart = 0;
    let lastPoint;

    // loop through each route segment
    this.route.forEach(segment => {

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

    console.log('> Match.getMatchStats(): Finished');
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
   *          > call function to loop through trackpoints
   *        > next if
   *      > next track point
   *    > next route point array
   *  > next track
   */
  analyseMatch() {
    for (let itrk = 0, n = this.tracks.length; itrk < n; itrk++) {
      for (let irseg = 0, n = this.route.length; irseg < n; irseg++) {
        for (let irp = 0, n = this.route[irseg].lngLat.length; irp < n; irp++) {

          if (isPointInBBox(this.route[irseg].getPoint(irp), this.boundingBoxFudger(this.tracks[itrk].bbox))) {
            this.compareTrackAgainstPoint(itrk, irseg, irp);
          };

        }
      }; // route.lngLat.forEach
    }; // tracks.forEach
    this.getMatchStats();
  }


  /**
   * Calculates distance of all track points to provided point, updating match
   * data if distance is within defined threshold
   * @param {number} it index of current track in this.tracks
   * @param {number} is index of current route segment in this.route
   * @param {number} ir index of current route point on current route segment
   * @returns nothing, just updates class variables
   */
  compareTrackAgainstPoint(it, is, irp) {

    const routePoint = this.route.getPoint(irp);

    // loop through each track point and finf distance to supplied route point
    // if less than threshold, save the match data
    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$');
    console.log(this.tracks);
    console.log(this.tracks[it]);
    console.log(this.tracks[it].length);

    for (let itp = 0, n = this.tracks[it].lngLat.length; itp < n; itp++) {

      const trackPoint = this.track[it].getPoint(itp);
      const d = Math.round(p2p(routePoint, trackPoint) * 100) / 100;
      console.log('######################');

      if ( d < MATCH_TOLERANCE ) {
        console.log('----------------');
        console.log(d);
        console.log(trkId);
        const trkId = this.tracks[it].id;
        console.log(this.params.tmatch);
        // console.log(this.params.tmatch[is]);

        const i = this.params.tmatch[is][irp].indexOf(trkId);
        if ( i === -1 ) {
          // if track is not found on current point, push it to array
          this.params.nmatch[is][irp]++;
          this.params.tmatch[is][irp].push(trkId);
          this.params.dmatch[is][irp].push(d);

        } else {
          // if track is found on current point, update distance in array
          this.params.dmatch[is][irp] = d < this.params.dmatch[is][irp] ? d : this.params.dmatch[is][irp];
        }

        // if track is not found in overall tracks list, push it
        if ( this.params.trksList.indexOf(trkId) === -1 ) {
          this.params.trksList.push(trkId);
        }

      } // if ( d < MATCH_TOLERANCE ) {
    } // for let(itp ...)

  }

  /**
   * Enlargens a bounding box by an arbitrary factor
   * @param {Array<number>} bbox bounding box as [minLng, minLat, maxLng, maxLat]
   * @returns bbox bounding box as [minLng, minLat, maxLng, maxLat]
   */
  boundingBoxFudger(bbox) {
    const minLng = bbox[0] < 0 ? bbox[0] * BBOX_FUDGE_FACTOR : bbox[0] / BBOX_FUDGE_FACTOR;
    const minLat = bbox[1] < 0 ? bbox[1] * BBOX_FUDGE_FACTOR : bbox[1] / BBOX_FUDGE_FACTOR;
    const maxLng = bbox[2] < 0 ? bbox[2] / BBOX_FUDGE_FACTOR : bbox[2] * BBOX_FUDGE_FACTOR;
    const maxLat = bbox[3] < 0 ? bbox[3] / BBOX_FUDGE_FACTOR : bbox[3] * BBOX_FUDGE_FACTOR;
    return [minLng, minLat, maxLng, maxLat];
  }


} // Match class

/**
 * NewMatch class
 * When no existing match is available --> intialises variables prior to invoking Match class
 */
class NewMatch extends Match {

  /**
   * Simply initialised a match object and initiates matching
   * @param {mongoDocument} rte mongo Path document containing route to match against
   * @param {MongoDocument} trks array of mongo documents from query
   */
  constructor(rte, trks) {
    const newMatchObject = getNewMatchObject(rte._id, rte.bbox, rte.geometry.coordinates);
    super(rte, newMatchObject);
    this.addTracks(trks);
  }
}


/**
 * Provides an intialised match object prior to matching algorithm
 * @param {string} id of the route that is being matched
 * @param {[number]} bbox of the route that is being matched
 * @param {[[[number]]]} lngLats coordinates of the route that is being matched
 */
function getNewMatchObject(id, bbox, lngLats) {
  return {
    challengeId: id,
    bbox: bbox,
    params: {
      trksList: [],
      nmatch: Array.from(lngLats, x => Array.from(x, y => 0)),
      tmatch: Array.from(lngLats, x => Array.from(x, y => [])),
      dmatch: Array.from(lngLats, x => Array.from(x, y => [])),
      // time: Array.from(rte.geometry.coordinates, x => []),
      // elev: Array.from(rte.geometry.coordinates, x => []),
    },
    stats: {}
  }
}



module.exports = {
  Match,
  NewMatch
};





