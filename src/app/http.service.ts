import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class HttpService {

  private getPathByIdUrl = 'http://localhost:3000/get-path-by-id/';
  private matchFromDbUrl = 'http://localhost:3000/match-from-db/';
  private deletePathUrl = 'http://localhost:3000/delete-path/';
  private matchFromLoadUrl = 'http://localhost:3000/match-from-load/';
  private savePathUrl = 'http://localhost:3000/save-path/';
  private getPathsListUrl = 'http://localhost:3000/get-paths-list/';
  private getPathAutoUrl = 'http://localhost:3000/get-path-auto/';

  constructor( private http: HttpClient ) {}

  getPathById(type, id, returnIdOnly) {
    return this.http.get<any>(this.getPathByIdUrl + type + '/' + id + '/' + returnIdOnly);
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


  getPathsList(type) {
    return this.http.get(this.getPathsListUrl + type);
  }

  getPathAuto(type) {
    return this.http.get(this.getPathAutoUrl + type);
  }

}
