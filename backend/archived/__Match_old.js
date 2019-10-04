
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



  

  /**
   * Prepares a GeoJson plot of path coloured for frequency each segment has been visited
   * TODO: see if this can be incorporated into a more generis GeoJson class
   */
  // plotContour() {

  //   // get colour palette for contours
  //   let geomArr = [];
  //   const nColours = 9;
  //   const colours = contourPalette(nColours);

  //   // find min and max number of matches for contour plot
  //   // find the max of (minimum for each two adjacent numbers)
  //   let min = 9999, max = -1;
  //   this.route.lngLat.forEach( (p, i) => {
  //     if ( i !== 0 ) {
  //       if ( this.params.nmatch[i] !== -1 && this.params.nmatch[i-1] !== -1 ) {
  //           const mintemp = Math.max(this.params.nmatch[i], this.params.nmatch[i-1]);
  //           const maxtemp = Math.min(this.params.nmatch[i], this.params.nmatch[i-1]);
  //           min = mintemp < min ? mintemp : min;
  //           max = maxtemp > max ? maxtemp : max;
  //       }
  //     }
  //   })

  //   // define some stuff, then loop through points applying style
  //   const shift = (max - min) / (nColours - 1) * 0.5;
  //   let i0 = 0, c0;

  //   this.route.lngLat.forEach( (p, i) => {
  //     if ( i !== 0 ) {
  //       const nMatches = Math.min(
  //         this.params.nmatch[i] == -1 ? 0 : this.params.nmatch[i],
  //         this.params.nmatch[i-1] == -1 ? 0 : this.params.nmatch[i-1]
  //       );
  //       const cIndex = Math.ceil((nMatches - min + shift) / (max - min + 2*shift) * nColours);

  //       // only check on 2nd pass through we we need access to first line's colour (via cIndex)
  //       if ( (i > 1 && cIndex !== c0) || i === this.route.pathSize ) {
  //         geomArr.push({
  //           'type': 'Feature',
  //           'geometry':
  //             {'coordinates' : this.route.lngLat.slice(i0, i === this.route.pathSize ? i+2 : i),
  //               'type': 'LineString'},
  //           'properties':
  //             {'color': colours[c0-1]}
  //         });

  //         i0 = i - 1;
  //       } // if ( (i > 1 && c...

  //       c0 = cIndex;
  //     } // if ( i !
  //   }) // forEach

  //   return {
  //     'type': 'FeatureCollection',
  //     'plotType': 'contour',
  //     'stats': this.stats,
  //     'bbox': this.bbox,
  //     'features': geomArr
  //   }

  // } // plotContour


  // /**
  //  * Prepares a GeoJson plot of path coloured for whether segment has been visited or not
  //  * TODO: see if this can be incorporated into a more generis GeoJson class
  //  */
  // plotBinary() {

  //   let geomArr = [], i0 = 0, c0;
  //   let isMatched = false;
  //   let wasMatched = false;

  //   this.route.lngLat.forEach( (p, i) => {

  //     isMatched = this.params.nmatch[i] === 0 ? false : true;
  //     if ( i !== 0 ) {

  //       const colour = ( isMatched && wasMatched ) ?  '#0000FF' : '#FF0000';
  //       if ( i > 1 && colour !== c0 || i === this.route.pathSize ) {
  //         // colour has changed or its the last data point
  //         geomArr.push({
  //           'type': 'Feature',
  //           'geometry':
  //             {'coordinates' : this.route.lngLat.slice(i0, i===this.route.pathSize ? i+2 : i),
  //               'type': 'LineString'},
  //           'properties':
  //             {'color': c0}
  //         });
  //         i0 = i - 1;

  //       }
  //       c0 = colour;

  //     }
  //     wasMatched = isMatched;
  //   })

  //   return {
  //     'type': 'FeatureCollection',
  //     'plotType': 'binary',
  //     'stats': this.stats,
  //     'bbox': this.bbox,
  //     'features': geomArr
  //   }
  // }



  
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