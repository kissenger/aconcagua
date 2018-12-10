import { EventEmitter, Injectable } from '@angular/core';


/**
 *
 * Facilitates data exchange between components
 *
 */

@Injectable()
export class DataService {

  // from load component to map component
  fromLoadToMap = new EventEmitter();

  // from map component to data component
  fromMapToData = new EventEmitter();

}
