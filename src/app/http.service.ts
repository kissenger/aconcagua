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
  private getMatchedTracksUrl = 'http://localhost:3000/get-matched-tracks/';
  private importRouteUrl = 'http://localhost:3000/import-route/';
  private importTracksUrl = 'http://localhost:3000/import-tracks/';
  private saveCreatedRouteUrl = 'http://localhost:3000/save-created-route/';
  public exportPathUrl = 'http://localhost:3000/export-path/';

  constructor( private http: HttpClient ) {}

  exportPath(type, id) {
    return this.http.get<any>(this.exportPathUrl + type + '/' + id);
  }

  saveCreatedRoute(pathData) {
    return this.http.post<any>(this.saveCreatedRouteUrl, pathData);
  }
  importRoute(formData) {
    return this.http.post<any>(this.importRouteUrl, formData);
  }

  importTracks(formData, sob) {
    return this.http.post<any>(this.importTracksUrl + sob, formData);
  }

  getMatchedTracks(routeId) {
    return this.http.get<any>(this.getMatchedTracksUrl + routeId);
  }

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


  getPathsList(type, offset) {
    return this.http.get(this.getPathsListUrl + type + '/' + offset);
  }

  getPathAuto(type) {
    return this.http.get(this.getPathAutoUrl + type);
  }

}
