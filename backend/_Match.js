const contourPalette = require('./utils.js').contourPalette;
const p2p = require('./geo.js').p2p;
const Path = require('./_Path.js').Path;

GAP_TOLERANCE = 500;  // in metres
FUDGE_FACTOR = 1.0001;
MATCH_TOLERANCE = 20;  // in metres


class Match {

  constructor(rte, matchObject) {

    // fill variables with incoming data

    if (rte) {
      this.routeId = rte._id,
      this.bbox = rte.stats.bbox,
      this.route = new Path('', rte.geometry.coordinates)
    }
    this.params = matchObject.params;
    if (!this.stats) this.stats = matchObject.stats;

    // create a route path


  }


  /**
   * Remove a track from the current match
   */
  removeTrack(trkId) {

    // remove track id from trksList
    this.params.trksList.splice(this.params.trksList.indexOf(trkId), 1)
    // loop through points and remove track id and dist where it exists
    this.params.tracks.forEach ( (t, index) => {
      let i = t.indexOf(trkId);
      if ( i !== -1 ) {
        this.params.tracks[index].splice(i, 1);
        this.params.dist[index].splice(i, 1);
        this.params.nmatch[index]--;
      }
    })

    // reanalyse stats
    this.matchStats();

  }

  createTrackPaths(trks) {

    // if trks isnt an array, make it one
    if ( !(trks instanceof Array) ) trks=[trks];

    return trks.map( (t) => {
      const a = new Path('', t.geometry.coordinates);
      a.injectKeyValuePair({'pathId': t._id});
      a.injectKeyValuePair({'bbox': t.stats.bbox});
      return a;
    });
  }

  /**
  * Add a new track to the current match
  */
  addTracks(trks) {

    this.analyseMatch(this.createTrackPaths(trks));

  }

  /**
  * Update the match statistics following a change
  */
  matchStats() {

    console.log('Match.updateStats()...')
    let gapDist = 9999;
    let mDist = 0;
    let gapStart = 0;
    let lastPoint;

    // loop though each route point and count matched distance, and fill if needed
    let index = 0;
    do  {
      const thisPoint = this.route.point(index);

      if ( index !== 0 ) {
        // skip the first point
        const d = p2p(thisPoint, lastPoint);

        if ( this.params.nmatch[index-1] > 0 && this.params.nmatch[index] > 0) {
          // if both this point and the previous one are matched, increment match distance
          mDist = mDist + d;

          if ( gapDist < GAP_TOLERANCE ) {
            // if length of gap was > tolerance then fill the gap and add dist
            const n = index - gapStart - 1;
            const f = new Array(n).fill(-1);
            this.params.nmatch.splice(gapStart, n, ...f)
            mDist = mDist + gapDist;
          }
          gapDist = 9999;

        } else {

          // otherwise measure gap length
          if ( gapDist === 9999 ) {
            gapStart = index;
            gapDist = 0;
          }
          gapDist = gapDist + d;

        }
      } // if ( index !== 0 )

      lastPoint = thisPoint;
      index++;

    } while (index <= this.route.pathSize)

    this.stats = {
      matchDistance: mDist,
      time: 0,
      nVisits: this.params.trksList.length + 1,
    }

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



  plotBinary() {

    let geomArr = [], i0 = 0, c0;
    let isMatched = false;
    let wasMatched = false;

    this.route.lngLat.forEach( (p, i) => {

      isMatched = this.params.nmatch[i] === 0 ? false : true;
      if ( i !== 0 ) {

        const colour = ( isMatched && wasMatched ) ?  '#0000FF' : '#000000';
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
    console.log(this.stats);
    return {
      'type': 'FeatureCollection',
      'plotType': 'binary',
      'stats': this.stats,
      'bbox': this.bbox,
      'features': geomArr
    }
  }



  analyseMatch(tracks) {

    console.log('Match.analyseMatch()...')

    // loop through each track
    tracks.forEach( (track) => {

      // find bounding box coords for current track
      const minLng = track.bbox[0] < 0 ? track.bbox[0] * FUDGE_FACTOR : track.bbox[0] / FUDGE_FACTOR;
      const minLat = track.bbox[1] < 0 ? track.bbox[1] * FUDGE_FACTOR : track.bbox[1] / FUDGE_FACTOR;
      const maxLng = track.bbox[2] < 0 ? track.bbox[2] / FUDGE_FACTOR : track.bbox[2] * FUDGE_FACTOR;
      const maxLat = track.bbox[3] < 0 ? track.bbox[3] / FUDGE_FACTOR : track.bbox[3] * FUDGE_FACTOR;

      // loop through each route point
      this.route.lngLat.forEach( (rp, irp) => {

        const routePoint = this.route.point(irp);

        if ( routePoint.lng < maxLng && routePoint.lng > minLng && routePoint.lat < maxLat && routePoint.lat > minLat ) {

          //  route point is within tracks bounding box
         track.lngLat.forEach( (tp, itp) => {

            const trackPoint = track.point(itp);

            let d = Math.round(p2p(routePoint, trackPoint)*100)/100;
            // if dist < tol then update matched arrays
            if ( d < MATCH_TOLERANCE ) {

              // thisTime = new Date(tp.time) / 1000;
              // if ( lastTime !== '' ) {
              //   // been through loop before, so mush be a previous point to compare with
              //   this.params.time[irp][i] = thisTime - lastTime;
              // }
              const i = this.params.tracks[irp].indexOf(track.pathId);

              if ( i === -1 ) {
                // if track is not found on current point, push it to array
                this.params.tracks[irp].push(track.pathId);
                this.params.nmatch[irp]++;
                this.params.dist[irp].push(d);

              } else {
                // if track is found on current point, update distance in array
                this.params.dist[irp][i] = d < this.params.dist[irp][i] ? d : this.params.dist[irp][i];
              }

              // if track is not found in overall tracks list, push it
              if ( this.params.trksList.indexOf(track.pathId) === -1 ) {
                this.params.trksList.push(track.pathId);
              }
            }
            // } else { // if ( dist ...
              // lastTime = '';
            // }
            // lastTime = thisTime;
          }) //track.forEach

        } // if ( rtePt[0] ...

      }) // rteCoords.forEach

    }) // t.forEach
    this.matchStats();
  }

}


class NewMatch extends Match {

  constructor(rte, trks) {

    //set up blank match object
    const mObj = {
      routeId: rte._id,
      bbox: rte.bbox,
      params: {
        trksList: [],
        nmatch: Array.from(rte.geometry.coordinates, x => 0),
        tracks: Array.from(rte.geometry.coordinates, x => []),
        dist: Array.from(rte.geometry.coordinates, x => []),
        // time: Array.from(rte.geometry.coordinates, x => []),
        // elev: Array.from(rte.geometry.coordinates, x => []),
      },
      stats: {}
    }

    super(rte, mObj);

    // create tracks paths

    const tracks = this.createTrackPaths(trks);
    this.analyseMatch(tracks);

  }



}



/**
   * Activate route matching logic
   */


module.exports = {
  Match,
  NewMatch
};





