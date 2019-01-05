
import { EventEmitter, Injectable } from '@angular/core';
import { resolve } from 'dns';


/**
 *
 * Facilitates data exchange between components
 *
 */

@Injectable()
export class GeoService {


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
      descent: descent
    };

  }
}
