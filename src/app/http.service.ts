import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class HttpService {

  private DEBUG = true;

  // If using Gordons laptop, this will work, otherwise uncomment the line below
  private hostName = '192.168.0.12';
  // private hostname = 'localhost';

  private getPathByIdUrl             = 'http://' + this.hostName + ':3000/get-path-by-id/';
  private matchFromDbUrl             = 'http://' + this.hostName + ':3000/match-from-db/';
  private deletePathUrl              = 'http://' + this.hostName + ':3000/delete-path/';
  private matchFromLoadUrl           = 'http://' + this.hostName + ':3000/match-from-load/';
  private savePathUrl                = 'http://' + this.hostName + ':3000/save-path/';
  private getPathsListUrl            = 'http://' + this.hostName + ':3000/get-paths-list/';
  private getPathAutoUrl             = 'http://' + this.hostName + ':3000/get-path-auto/';
  private getMatchedTracksUrl        = 'http://' + this.hostName + ':3000/get-matched-tracks/';
  private importRouteUrl             = 'http://' + this.hostName + ':3000/import-route/';
  private importTracksUrl            = 'http://' + this.hostName + ':3000/import-tracks/';
  private saveCreatedRouteUrl        = 'http://' + this.hostName + ':3000/save-created-route/';
  private exportPathUrl              = 'http://' + this.hostName + ':3000/export-path/';
  private movePathUrl                = 'http://' + this.hostName + ':3000/move-path/';
  private createChallengefromPathUrl = 'http://' + this.hostName + ':3000/create-challenge-from-path/';
  private findMatchingPathsUrl       = 'http://' + this.hostName + ':3000/download/';
  private getOpenStreetMapDataUrl    = 'http://' + this.hostName + ':3000/get-osm-data/';
  private addElevationToPathUrl      = 'http://' + this.hostName + ':3000/add-elev-to-path/';
  private simplifyPathUrl            = 'http://' + this.hostName + ':3000/simplify-path/';
  private reversePathUrl             = 'http://' + this.hostName + ':3000/reverse-path/';


  // private getPathByIdUrl             = 'http://localhost:3000/get-path-by-id/';
  // private matchFromDbUrl             = 'http://localhost:3000/match-from-db/';
  // private deletePathUrl              = 'http://localhost:3000/delete-path/';
  // private matchFromLoadUrl           = 'http://localhost:3000/match-from-load/';
  // private savePathUrl                = 'http://localhost:3000/save-path/';
  // private getPathsListUrl            = 'http://localhost:3000/get-paths-list/';
  // private getPathAutoUrl             = 'http://localhost:3000/get-path-auto/';
  // private getMatchedTracksUrl        = 'http://localhost:3000/get-matched-tracks/';
  // private importRouteUrl             = 'http://localhost:3000/import-route/';
  // private importTracksUrl            = 'http://localhost:3000/import-tracks/';
  // private saveCreatedRouteUrl        = 'http://localhost:3000/save-created-route/';
  // private exportPathUrl              = 'http://localhost:3000/export-path/';
  // private movePathUrl                = 'http://localhost:3000/move-path/';
  // private createChallengefromPathUrl = 'http://localhost:3000/create-challenge-from-path/';
  // private findMatchingPathsUrl       = 'http://localhost:3000/download/';
  // private getOpenStreetMapDataUrl    = 'http://localhost:3000/get-osm-data/';
  // private addElevationToPathUrl      = 'http://localhost:3000/add-elev-to-path/';
  // private simplifyPathUrl            = 'http://localhost:3000/simplify-path/';
  // private reversePathUrl             = 'http://localhost:3000/reverse-path/';

  constructor( private http: HttpClient ) {}

  reversePath(type: String, id: String) {
    if (this.DEBUG) { console.log('-->HttpService.reversePath: type = ', type); }
    return this.http.get<any>(this.reversePathUrl + type + '/' + id);
  }

  simplifyPath(pathData: Object) {
    if (this.DEBUG) { console.log('-->HttpService.simplifyPath: pathData = ', pathData); }
    return this.http.post<any>(this.simplifyPathUrl, pathData);
  }


  getOpenStreetMapData(boundingBox: Array<number>) {
    if (this.DEBUG) { console.log('-->HttpService.getOpenStreetMapData: boundingBox = ', boundingBox); }
    return this.http.post<any>(this.getOpenStreetMapDataUrl, boundingBox);
  }


  addElevationToPath(type: String, id: String, elevArray) {
    if (this.DEBUG) { console.log('-->HttpService.addElevationToPath: type = ', type); }
    return this.http.post<any>(this.addElevationToPathUrl + type + '/' + id, elevArray);
  }


  /**
   * Not in use
   * @param pathSegment path segment to match against routes
   */
  findMatchingPaths(pathSegment: Array<number>) {
    return this.http.post<any>(this.findMatchingPathsUrl, pathSegment);
  }

  movePath(id: String, from: String, to: String) {
    return this.http.get<any>(this.movePathUrl + id + '/' + from + '/' + to);
  }

  createChallengeFromPath(idArray: Array<String>) {
    console.log(idArray);
    return this.http.get<any>(this.createChallengefromPathUrl + idArray);
  }
  // getDownload() {
  //   return this.http.get<any>(this.getDownloadUrl);
  // }

  exportPath(type: String, id: String) {
    return this.http.get<any>(this.exportPathUrl + type + '/' + id);
  }

  saveCreatedRoute(type: String, pathData: Object) {
    return this.http.post<any>(this.saveCreatedRouteUrl + type, pathData);
  }

  importRoute(formData) {
    return this.http.post<any>(this.importRouteUrl, formData);
  }

  importTracks(formData, sob) {
    return this.http.post<any>(this.importTracksUrl + sob, formData);
  }

  getMatchedTracks(routeId: String) {
    return this.http.get<any>(this.getMatchedTracksUrl + routeId);
  }

  getPathById(type: String, id: String) {
    return this.http.get<any>(this.getPathByIdUrl + type + '/' + id );
  }

  matchFromDb(id: String) {
    return this.http.get<any>(this.matchFromDbUrl + id);
  }

  deletePath(type: String, id: String) {
    return this.http.get<any>(this.deletePathUrl + type + '/' + id);
  }

  matchFromLoad(id: String) {
   return this.http.get<any>(this.matchFromLoadUrl + id);
  }

  savePath(type: String, id: String, pyld) {
    return this.http.post<any>(this.savePathUrl + type + '/' + id, pyld);
  }


  getPathsList(type: String, offset: Number) {
    return this.http.get(this.getPathsListUrl + type + '/' + offset);
  }

  getPathAuto(type: String) {
    return this.http.get(this.getPathAutoUrl + type);
  }

}
