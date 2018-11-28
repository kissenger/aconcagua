import { EventEmitter, Injectable } from '@angular/core';
// import { BehaviorSubject } from 'rxjs/BehaviorSubject';

@Injectable()
export class DataService {
// DataService facilitates data exchange between
  gotNewData = new EventEmitter();

}

@Injectable()
export class MapService {
// MapService facilitates data exchange between clicked path and data element
  newMapData = new EventEmitter();

}

@Injectable()
export class UpdateListService {

  // private myData = new BehaviorSubject(null);
  hasListChanged = new EventEmitter();

}

