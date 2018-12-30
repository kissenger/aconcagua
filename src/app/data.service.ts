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
  private storedPath;

  // data emitters
  fromLoadToMap = new EventEmitter();
  fromMapToData = new EventEmitter();
  fromCreateToDetail = new EventEmitter();
  newNotification = new EventEmitter();
  notificationsRead = new EventEmitter();

  storeNewPath(data) {
    this.storedPath = data;
  }

  getStoredNewPath() {
   return this.storedPath;
  }


  storeData(data) {
    this.storedData = data;
  }

  getStoredData() {
    return this.storedData;
  }

  storeCreatedRouteDetails(data) {
    this.storedCreateRouteData = data;
  }

  getCreateRouteDetails() {
    return this.storedCreateRouteData;
  }
}
