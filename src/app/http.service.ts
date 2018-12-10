import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class HttpService {

  private getPathByIdUrl = 'http://localhost:3000/get-path-by-id/';
  private matchFromDbUrl = 'http://localhost:3000/match-from-db/';
  private deletePathUrl = 'http://localhost:3000/delete-path/';
  private matchFromLoadUrl = 'http://localhost:3000/match-from-load/';
  private savePathUrl = 'http://localhost:3000/save-path/';

  constructor( private http: HttpClient ) {}

  getPathById(type, id) {
    return this.http.get<any>(this.getPathByIdUrl + type + '/' + id + '/false');
  }

  matchFromDb(id) {
    return this.http.get<any>(this.matchFromDbUrl + id);
  }

  deletePath(type, id) {
    return this.http.get<any>(this.deletePathUrl + type + '/' + id);
  }

  matchFromLoad(id) {
   return this.http.get<any>(this.matchFromLoadUrl + id);
  }

  savePath(type, id, pyld) {
    return this.http.post<any>(this.savePathUrl + type + '/' + id, pyld);
  }

}
