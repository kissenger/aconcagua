
import { EventEmitter, Injectable } from '@angular/core';
import { resolve } from 'dns';


/**
 *
 * Facilitates data exchange between components
 *
 */

@Injectable()
export class GeoService {

  snapToRoad(firstLngLat, lastLngLat) {

    return new Promise<Array<Object>>( (res, rej) => {

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


  pathStats(a) {
    // a is array of [lng, lat] points from create component

    const d = google.maps.geometry.spherical.computeLength(a);
    const dist = a.length === 0 ? 0 : d;

    return {
      distance: dist
    };

    // if (a.length > 0) {
    //   elevationService.getElevationForLocations({
    //     'locations': a.getArray()
    //   }, function(elevationResult, elevationStatus) {
    //     if (elevationStatus.toString() === 'OK') {
    //       const elevStats = getElevationStats(elevationResult.map(x => x.elevation));
    //       document.getElementById('ascent').innerHTML = elevStats.totalAsc.toFixed(0) + 'm';
    //       document.getElementById('descent').innerHTML = elevStats.totalDes.toFixed(0) + 'm';
    //     } else {
    //       console.log('yompsy ERROR reported from elevation service -->');
    //       console.log(elevationStatus);
    //       console.log(elevationResult);
    //     }
    //   });
    // }  else {
    //   document.getElementById('ascent').innerHTML = 0 + 'm';
    //   document.getElementById('descent').innerHTML = 0 + 'm';
    // }


  }
}
