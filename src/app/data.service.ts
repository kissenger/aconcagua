import { EventEmitter, Injectable } from '@angular/core';


/**
 *
 * Facilitates data exchange between components
 *
 */

@Injectable()
export class DataService {

  private storedData;
  private storedCreateRouteData;

  // data emitters
  fromLoadToMap = new EventEmitter();
  fromMapToData = new EventEmitter();
  fromCreateToDetail = new EventEmitter();

  storeData(data) {
    this.storedData = data;
  }

  getStoredData() {
    return this.storedData;
  }

  storeCreateRouteData(data) {
    this.storedCreateRouteData = data;
  }

  getCreateRouteData() {
    return this.storedCreateRouteData;
  }
}
