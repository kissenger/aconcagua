import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { HttpService } from './http.service';

/**
 * provides an interface between components and the intialisationData store, ensuring
 * components get the controls specific to their needs
 */

@Injectable()
export class ControlFunctions {

  constructor(
    private router: Router,
    private dataService: DataService,
    private httpService: HttpService
    ) {
  }

  loadSinglePath(pathType) {
    this.router.navigate(['load-paths', pathType, 'single']);
  }

  loadMultiplePaths (pathType) {
    this.router.navigate(['load-paths', pathType, 'batch']);
  }

  addToChallenges(pathId) {
    this.httpService.movePath(pathId, 'route', 'challenge').subscribe( (r) => {
      this.router.navigate(['paths', 'challenge']);
    });
  }

  removeFromChallenges(pathId) {
    this.httpService.movePath(pathId, 'challenge', 'route').subscribe( (r) => {
      this.router.navigate(['paths', 'route']);
    });
  }

  deletePath(pathType, pathId) {
    this.httpService.deletePath(pathType, pathId).subscribe( () => {
        this.router.navigate(['paths', pathType]);
    });
  }

  createNewPath(pathType, pathId) {
    this.router.navigate(['paths', pathType, pathId, true]);
  }

  exportPathToFile(pathType, pathId) {
    this.httpService.exportPath(pathType, pathId).subscribe( (r) => {
      alert('Operation complete');
    });
  }

  discardImportedPath(pathType) {
    this.router.navigate(['paths', pathType]);
  }

  saveCreatedPath(pathType, polyline) {

    // test that path exists
    if ( polyline.getLength() === 0 ) {
      alert('Create some points before saving the route');
      return 0;
    }

    // convert to array, get path name and description and package up
    const c = polyline.getArray().map( (e) => (e.toString().replace(/[()]/g, '').split(', ')));
    const d = this.dataService.getCreateRouteDetails();
    d.geometry = {coordinates: c.map( (e) => [ parseFloat(e[1]), parseFloat(e[0]) ])};

    // send to the backend
    this.httpService.saveCreatedRoute(pathType, d).subscribe( (r) => {
      this.router.navigate(['paths', 'route', r.pathId]);
    });

  }

  discardCreatedPath(pathType) {
    this.router.navigate(['paths', pathType]);
  }



}

