import { EventEmitter, Injectable } from '@angular/core';


/**
 *
 * Facilitates data exchange between components
 *
 */

@Injectable()
export class DataService {

  private storedData;

  // data emitters
  fromLoadToMap = new EventEmitter();
  fromMapToData = new EventEmitter();

  storeData(data) {
      this.storedData = data;
  }

  getStoredData() {
    return this.storedData;
  }



}
