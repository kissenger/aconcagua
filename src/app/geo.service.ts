
import { EventEmitter, Injectable } from '@angular/core';
import { resolve } from 'dns';
import { DataService } from './data.service';
import { HttpService } from './http.service';


/**
 *
 * Facilitates data exchange between components
 *
 */

@Injectable()

export class GeoService {

  // private DEBUG = true;
  private DEBUG = false;

  constructor(
    private dataService: DataService,
    private httpService: HttpService
  ) {}


  /**
   * coordsToMVCArray
   * Converts an array of [lng, lat] coordinates (from the backend perhaps) to
   * an MVCArray of google.maps.LatLng instances
   * @lnglatArray array of [lng, lat] coordinates
   * @returns MVCArray of google.maps.LatLng instances
   */
  public coordsToMVCArray(lnglatArray: Array<Number>) {

    // create an array of google.maps.LatLng instances
    const googleLatLngArray = lnglatArray.map(p => new google.maps.LatLng(p[1], p[0]));

    // return MVCArray instance
    return new google.maps.MVCArray(googleLatLngArray);
  }


  public reversePath() {

    // need a promise so component can update when finished
    return new Promise<Array<Number>>( (resolveRevPath, rej) => {
      if (this.DEBUG) { console.log('-->GeoService.reversePath()'); }

      // get date for active path and send request to the backend
      const pathProps = this.dataService.getStoredData().path.properties;
      this.httpService.reversePath(pathProps.pathType, pathProps.pathId)
        .subscribe( (newPath) => {

          // emit the data so the view can update, and resolve the promise
          this.dataService.fromMapToData.emit(
            { path: newPath.geoJson,
              match: 0 });
          resolveRevPath();

        });
      });
  }

  /**
   * addElevationToPath
   * Does the work to
   */
  public addElevationToPath() {

    // return new Promise<Array<Number>>( (resolveAddElev, rej) => {
      if (this.DEBUG) { console.log('-->GeoService.addElevationToPath()'); }

      // retrieve current path data from the store and convert to MVCArray
      const pathProps = this.dataService.getStoredData().path.properties;
      const pathCoords = this.dataService.getStoredData().path.features[0].geometry.coordinates;
      const path: google.maps.MVCArray<google.maps.LatLng> = this.coordsToMVCArray(pathCoords);

      // request elevations then send to packened, waiting for a confirmation of success
      this.getElevation(path).then( (elevs) => {
        this.httpService.addElevationToPath(pathProps.pathType, pathProps.pathId, elevs)
          .subscribe( (newPath) => {

            // emit the data so the view can update
            this.dataService.fromMapToData.emit({
              path: newPath.geoJson,
              match: 0
            });

          });
      });
    // });
  }


  /**
   * provides array of elevations for provided list of points
   * @param path MVCArray of google.maps.latlng instances
   * @returns array of elevations at provided points
   */
  public getElevation(path: google.maps.MVCArray<google.maps.LatLng>) {

    return new Promise<Array<Number>>( (resolveOuter, rej) => {

      // note that we move from MVCArray to Array of google.LatLngs
      const pathLatLngs: Array<google.maps.LatLng> = path.getArray();
      const spliceArray: Array<Array<google.maps.LatLng>> = [];

      // create an array of coord arrays with each sub array max 512 elements
      do {
        spliceArray.push(pathLatLngs.splice(0, 512));
      } while (pathLatLngs.length > 512);
      if (this.DEBUG) { console.log('-->GeoService.getElevation(): spliceArray = ', spliceArray); }

      // loop through arrays and request elevation data
      let outArray = [];
      const delay = spliceArray.length === 1 ? 0 : 4000;
      let p = Promise.resolve();
      spliceArray.forEach(arr => {
        p = p.then( () => this.googleElevationQuery(arr, delay)
            .then(elevs => { outArray = outArray.concat(elevs); })
            .catch(err => console.log(err))
            );

        });

      // wait for all the p promises to resolve before returning the outer promise
      Promise.all([p]).then( () => {
        if (this.DEBUG) { console.log('-->GeoService.getElevation(): elevations = ', outArray); }
        resolveOuter(outArray.map(n => n.toFixed(2)));
      });

      });
  }

  /**
   * createGeojsonFromCoords
   * @param polyline a google.maps.Polyline defining the required path
   * @param elevs as array of elevations of the same length of coords array (not checked)
   * @returns json object in the correct format for sending to the backend
   */

  polylineToJson(polyline: google.maps.MVCArray<google.maps.LatLng>, elevs) {
    // convert to array, get path name and description and package up
    const c = polyline.getArray().map( (e) => (e.toString().replace(/[()]/g, '').split(', ')));
    const d = this.dataService.getCreateRouteDetails();
    d.geometry = {coordinates: c.map( (e) => [ parseFloat(e[1]), parseFloat(e[0]) ])};
    d.params = {'elev': elevs.flat()};
    return  d;
  }



  /**
   * googleElevationQuery
   * Executes the elevation query
   * @param p array of locations as an array of google.maps.LatLng instances
   */
  private googleElevationQuery(p: Array<google.maps.LatLng>, del: number) {

    if (this.DEBUG) { console.log('-->GeoService.googleElevationQuery()'); }

    return new Promise<Array<Number>>( (res, rej) => {

      const elevator = new google.maps.ElevationService;
      setTimeout(() => {


        elevator.getElevationForLocations( {'locations': p}, (elevResults, status) => {
            if (this.DEBUG) {
              console.log('-->GeoService.getElevation: Status Code = ', status);
              console.log('-->GeoService.getElevation: Elevations = ', elevResults);
            }
            if (status === google.maps.ElevationStatus.OK) {
                res(elevResults.map(e => e.elevation ));
            } else {
              rej(google.maps.ElevationStatus);
            }
          }
        );

      }, del);
    });
  }

  /**
   * Takes start and end points on line and returns MVCArray of snapped path
   *
   * @param firstLngLat start point of path to snap
   * @param lastLngLat end point of path to snap
   * @returns overview_polyline containing snapped points
   *
   * https://developers.google.com/maps/documentation/javascript/directions
   */

  snapToRoad(firstLngLat: google.maps.LatLng, lastLngLat: google.maps.LatLng) {

    return new Promise<Array<google.maps.LatLng>>( (res, rej) => {

      const directionService = new google.maps.DirectionsService();

      directionService.route(

        // direction service options
        { origin: firstLngLat,
          destination: lastLngLat,
          travelMode: google.maps.TravelMode.WALKING
        },

        // direction service call-back function
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            // result.routes[0].overview_path
            res(result.routes[0].overview_path);
          } else {
            res([]);
          }

        } // callback function
      ); // directionService

    });
  }

  /**
   * returns statistics for provided path
   * @param path array of google.maps.LatLng instances defining the full path
   * @param elevs array of array of elevations at each point
   * @returns object containing path statistics
   */

  pathStats(path: Array<google.maps.LatLng>, elevs: Array<Array<number>>) {

    const d = google.maps.geometry.spherical.computeLength(path);
    const dist = path.length === 0 ? 0 : d;
    const nPoints = path.length;

    let lastElev: number;
    let ascent = 0;
    let descent = 0;
    let dElev: number;

    if (elevs) {

      for (let i = 0; i < elevs.length; i++) {
        for (let j = 0; j < elevs[i].length; j++) {
          const thisElev = elevs[i][j];

          if (i === 0 && j === 0) {
          } else {
            dElev = thisElev - lastElev;
          }
          ascent = dElev > 0 ? ascent + dElev : ascent;
          descent = dElev < 0 ? descent + dElev : descent;
          lastElev = thisElev;
        }
      }

    }

    return {
      distance: dist,
      ascent: ascent,
      descent: descent,
      nPoints: nPoints
    };

  }




//   /**
//     * function simplifyPath
//     * simplify path using perpendicular distance method
//     * http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.95.5882&rep=rep1&type=pdf
//     */
//   simplify(pathToSimplify) {

//     const TOLERANCE: Number = 10;     // tolerance value in metres; the higher the value to greater the simplification
//     const origLength: Number = pathToSimplify.length - 1;
//     // let i: number;
//     let flag: Boolean = true;

//     // create array of indexes - what remains at end are points remaining after simplification
//     const j = Array.from(pathToSimplify, (x, i) => i);

//     // Repeat loop until no nodes are deleted
//     while ( flag === true ) {
//       let k = 0;
//       flag = false;   // if remains true then simplification is complete; loop will break
//       while ( k < ( j.length - 2 ) ) {
//         const pd = p2l( pathToSimplify(j[k]), pathToSimplify(j[k + 2]), pathToSimplify(j[k + 1]) );
//         if ( Math.abs(pd) < TOLERANCE ) {
//           j.splice(k + 1, 1);
//           flag = true;
//         }
//         k++;
//       }
//     }

//     // strip out points from class using whats left of j
//     this.lngLat = j.map( x => this.lngLat[x] );
//     if ( typeof this.elev !== 'undefined') {
//       if ( this.elev.length !== 0 ) this.elev = j.map( x => this.elev[x] );
//     }
//     if ( typeof this.time !== 'undefined') {
//       if ( this.time.length !== 0 ) this.time = j.map( x => this.time[x] );
//     }

//     // update path length
//     this.pathSize = this.lngLat.length - 1;
//     console.log( '>> Path.simplify(): simplified to: ' + ((j.length/origLength)*100.0).toFixed(1) + '%');

//   }



//   /**
//    * function p2p
//    * returns distance in meters between two GPS points
//    *
//    * Implements the Haversine formula
//    * https://en.wikipedia.org/wiki/Haversine_formula
//    * Vincenty's formula is more accurate but more expensive
//    * https://en.wikipedia.org/wiki/Vincenty's_formulae
//    *
//    * lngLat1 is lng/lat of point 1 in decimal degrees
//    * lngLat2 is lng/lat of point 1 in decimal degrees
//    *
//    * https://www.movable-type.co.uk/scripts/latlong.html
//    * can be sped up: https://stackoverflow.com/questions/27928
//    *
//    */
//   p2p(p1, p2) {


//     const R = 6378.137;     // radius of earth

//     const lat1 = degs2rads(p1.lat);
//     const lat2 = degs2rads(p2.lat);
//     const lng1 = degs2rads(p1.lng);
//     const lng2 = degs2rads(p2.lng);

//     const dlat = lat1 - lat2;
//     const dlng = lng1 - lng2;

//     const a = (Math.sin(dlat/2.0) ** 2.0 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng/2.0) ** 2.0) ** 0.5;
//     const c = 2.0 * Math.asin(a);

//     return d = R * c * 1000.0;  // distance in metres

//   }

//   function degs2rads(degs) {
//     return degs * Math.PI / 180.0;
//   };


// /**
// * returns distance in meters between a line and a point
// *
// * @param {Point} p1 lng/lat of line start in decimal degrees as instance of Point class
// * @param {Point} p2 lng/lat of line end in decimal degrees as instance of Point class
// * @param {Point} p3 lng/lat of mid-point in decimal degrees as instance of Point class
// *
// * https://www.movable-type.co.uk/scripts/latlong.html
// */

// function p2l(p1, p2, p3) {

//   if ( !(p1 instanceof Point) || !(p2 instanceof Point) || !(p3 instanceof Point)) {
//     console.log("Error from p2l: arguments should be of Points class");
//     return 0;
//   }

//   const d13 = p2p(p1, p3) / 1000.0;
//   const brg12 = bearing(p1, p2);
//   const brg13 = bearing(p1, p3);

//   return Math.asin( Math.sin( d13/6378.137 ) * Math.sin( brg13-brg12 ) ) * 6378.137 * 1000.0;

// }

// /**
//  * ---------------------------------------------------
//  * returns bearing in radians between two GPS points
//  * ---------------------------------------------------
//  * latLng1 is lat/lng of point 1 in decimal degrees
//  * latLng2 is lat/lng of point 2 in decimal degrees
//  *---------------------------------------------------
//  * https://www.movable-type.co.uk/scripts/latlong.html
//  *---------------------------------------------------
//  */
// function bearing(p1, p2) {

//   const lat1 = degs2rads(p1.lat);
//   const lat2 = degs2rads(p2.lat);
//   const lng1 = degs2rads(p1.lng);
//   const lng2 = degs2rads(p2.lng);

// 	x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2)* Math.cos(lng2 - lng1)
// 	y = Math.sin(lng2 - lng1) * Math.cos(lat2)

// 	return Math.atan2(y, x)

// }


//  /**
//    * Returns point class for node of given index
//    * @param {number} index
//    */
//   getPoint(index) {
//     let thisPoint = [];
//     if ( this.lngLat ) thisPoint.push(this.lngLat[index]);
//     if ( this.elev ) thisPoint.push(this.elev[index]);
//     if ( this.time ) thisPoint.push(this.time[index]);
//     if ( this.heartRate ) thisPoint.push(this.heartRate[index]);
//     if ( this.cadence ) thisPoint.push(this.cadence[index]);
//     return (new Point(thisPoint));
//   }


// }


}
