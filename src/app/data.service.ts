import { EventEmitter, Injectable } from '@angular/core';


/**
 *
 * Facilitates data exchange between components
 *
 */

@Injectable()
export class DataService {

  private pathData;
  private matchData;

  // data emitters
  fromLoadToMap = new EventEmitter();
  fromMapToData = new EventEmitter();

  storeData(data) {

      this.pathData = data;
      console.log(data);
  }

  getStoredData() {
    return {
      'pathData': this.pathData,
      'matchData': this.matchData
    };
  }



}
