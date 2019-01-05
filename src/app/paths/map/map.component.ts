import { Component, OnInit, OnDestroy, EventEmitter } from '@angular/core';
import { DataService } from '../../data.service';
import { HttpService } from '../../http.service';
import { GeoService } from '../../geo.service';
import { InitialisationData } from '../../initialisationdata.model';
import { Controls } from '../../controls.model';
import { ControlFunctions } from '../../controlfunctions.service';
import { NgControlStatus } from '@angular/forms';
import { waitForMap } from '@angular/router/src/utils/collection';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TryCatchStmt, BoundDirectivePropertyAst } from '@angular/compiler';
import { findLast } from '@angular/compiler/src/directive_resolver';
import { PromiseType } from 'protractor/built/plugins';
import { mapChildrenIntoArray } from '@angular/router/src/url_tree';
import { ViewEncapsulation } from '@angular/core';
import { Services } from '@angular/core/src/view';
import { Observable } from 'rxjs';
import { markParentViewsForCheck } from '@angular/core/src/view/util';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  encapsulation: ViewEncapsulation.None
})

export class MapComponent implements OnInit, OnDestroy {

  // url parameter subscription derived variables
  public paramSubs: any;
  public pathType: String;
  public pathId: String;
  public pageType: String;

  // arrays containing required controls for this page
  public menuItems: any;
  public isMenuSticky: Boolean;
  public checkBoxItems: any;
  public radioItems: any;
  public checkboxItems: any;
  public showPlotOptions = true;

  // google map instances
  public map: google.maps.Map;
  public polyLine: google.maps.Polyline;
  public elevator: google.maps.ElevationService;


  // used in save path form popup
  public pathName: String;
  public description: String;
  public isBatch = false;

  // recieved geoJson files from the backend
  public path: any;               // route/track data
  public binary;                  // binary plot data
  public tracks;                  // all matched tracks
  public contour;                 // contour plot data

  // used in route create mode
  public markers = [];
  public elevArray = [];

  // other class variables used for flow control
  public subsActive: Boolean;
  public timer: NodeJS.Timer;

  public feedService: any;

  constructor(
    private httpService: HttpService,
    private dataService: DataService,
    private geoService: GeoService,
    private initData: InitialisationData,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private controls: Controls,
    private controlFunctions: ControlFunctions
    ) {
      this.router = router;
    }

  ngOnInit() {

  /**
   * Listen for changes to URL parameters
   * Determine page type requested and handle flow accordingly
   * Request menu buttons and other controls
   * Call load map function
   */

    // List for changes in url params
    this.paramSubs = this.activatedRouter.params.subscribe(params => {

      // initialise
      document.documentElement.style.cursor = 'wait';
      this.pathType = params.type;
      this.pathId = params.id;

      // Determine page type
      if ( params.id === '-1' ) {
        if ( typeof params.pageType === 'undefined' ) { this.pageType = 'review'; }

      } else if (params.id === 'load-single') {
        this.pageType = 'load-single';

      } else if ( params.id === 'load-batch' ) {
        this.pageType = 'load-batch';

      } else {

        if ( params.pageType === 'create' ) {
          this.pageType = 'create';
        } else {
          this.pageType = 'normal';
        }

      }

      // get definition of controls for this page
      const menu =  this.controls.getMenuButtons(this.pageType, this.pathType);
      this.menuItems = menu.btnArray;
      this.isMenuSticky = menu.isSticky;
      this.radioItems = this.controls.getRadioButtons(this.pageType, this.pathType)[0];
      this.checkboxItems = this.controls.getCheckBoxes(this.pageType, this.pathType);
      if ( typeof this.radioItems === 'undefined' && typeof this.checkboxItems[0] === 'undefined' ) {
        this.showPlotOptions = false;
      }

      // now do stuff depending on the types of path and path
      if ( typeof this.pathId !== 'undefined') {

        if ( this.pageType === 'load-single' ||  this.pageType === 'load-batch') {
          document.getElementById('file-select').style.display = 'block';

        } else if ( this.pageType === 'normal' || this.pageType === 'create') {
          // this is NOT review page

          this.httpService.getPathById(this.pathType, this.pathId, false).subscribe( (result) => {

            this.path = result.geoJson;
            if ( this.pathType === 'challenge' ) {
              // only load matched data if this is a challenge

              this.binary = result.geoBinary;
              this.contour = result.geoContour;


              this.feedService = this.dataService.newNotification.subscribe( (data) => {

              });

              // **NEED TO DETECT IF THIS IS A NEWLY UPLOADED CHALLENGE, IF SO DONT LOAD TRACKS (YET)
              this.httpService.getMatchedTracks(this.pathId).subscribe( (res) => {

                this.tracks = res['geoTracks'];
                console.log(this.tracks);

                // use timer to repeatedly attempt to trun checkbox active, until succesful
                // this.subsActive = false;
                // this.timer = setInterval( () => {
                //   this.setInputEnabled(<HTMLElement>document.getElementById('Tracks'));
                // }, 200);

              });

            } // if challenge page

            this.loadMap();

          }); // httpService subscription

        } else if ( this.pageType === 'review' ) {
        // this is review page

          this.path = this.dataService.getStoredNewPath();
          this.pathId = this.path.features[0].properties.pathId;
          this.loadMap();

        } // if ( this.pageType ...

        document.documentElement.style.cursor = 'default';

      } // if ( typeof this.pathId !== 'undefined') {

    }); // url params subscription

  } // ngOnInit

  loadMap() {

    console.log(this.path);
    console.log(this.binary);
    console.log(this.contour);

    this.map = new google.maps.Map(document.getElementById('map'), this.initData.getMapOptions(this.pageType));

    if ( this.pathId === '0' ) {
    // path id is not known
      this.map.fitBounds({
        north: 90,
        south: -90,
        east:  180,
        west:  -180
      });

    } else {
    // path id is known

      this.path.features[0]['id'] = 'route-';

      this.map.data.addGeoJson(this.path.features[0]);

      this.map.fitBounds({
        north: this.path.bbox[3],
        south: this.path.bbox[1],
        east: this.path.bbox[2],
        west: this.path.bbox[0]
      });

      // set style of plotted paths
      const lineStyles = this.initData.getMapLineStyles();
      this.map.data.setStyle( (feature) => {
        const featureId = String(feature.getId());
        const featureType = featureId.substring(0, featureId.indexOf('-'));
        lineStyles[featureType]['strokeColor'] = feature.getProperty('color');
        if ( this.pageType === 'create' ) {
          lineStyles[featureType]['strokeOpacity'] = 0.5;
        } else {
          // THIS SHOULD NOT BE NEEDED, but somehow opacity=0.5 is persistant even with return call to getMapLineStyles
          // needs debugging
          lineStyles[featureType]['strokeOpacity'] = 1.0;
        }
        return lineStyles[featureType];
      });

      this.map.data.addListener('mousedown', (event) => {
        console.log('mouseover');
        this.map.data.revertStyle();
        this.map.data.remove(event.feature);
      });

      // TODO - DATA FLOWS NEED REVIEWING - THIS CAN BE IMPROVED
      const emitData = {
        path: this.path.features[0].properties,
        match: this.binary ? this.binary.stats : 0
      };
      this.dataService.fromMapToData.emit(emitData);
      this.dataService.storeData(emitData);

      /**
       * Specific to path create page only
       */
      if ( this.pageType === 'create' ) {

        this.polyLine = new google.maps.Polyline({
          map: this.map,
          editable: false,
        });

        this.map.addListener('click', (event) => {

          const polyPath = this.polyLine.getPath();
          const destination: google.maps.LatLng = event.latLng;

          if (polyPath.getLength() === 0) {
            this.markers.push(
              new google.maps.Marker( { position: destination, map: this.map })
            );
          }

          this.addToPath(polyPath, destination).then( (newPath) => {
            this.dataService.fromCreateToDetail.emit(
              this.geoService.pathStats(newPath.getArray(), this.elevArray)
            );
          });

        } );
      }
    }

  } // loadMap()

  /**
   * extends path to new destination, including snap to road if requested
   * @param path result of this.polyLine.getPath()
   * @param dest google maps LatLng object defining destination point
   * @returns path updated with additional points
   * side-effects:
   *   updates this.elev on the component class
   */
  addToPath(path: google.maps.MVCArray<google.maps.LatLng>, dest: google.maps.LatLng) {

    return new Promise<google.maps.MVCArray<google.maps.LatLng>>( (res, rej) => {

      const snapCheckbox = <HTMLInputElement>document.getElementById('inputRoad Snap');

      if ( snapCheckbox.checked === false || path.getLength() === 0 ) {

        path.push(dest);
        this.getElevation([dest]).then( (elevs) => {
          this.elevArray.push(elevs);
          res(path);
        });


      } else {

        this.geoService.snapToRoad(path.getAt(path.getLength() - 1), dest)
          .then( (snappedPath) => {
            snappedPath.map( (p) => path.push(p) );
            this.getElevation(snappedPath).then( (elevs) => {
              this.elevArray.push(elevs);
              res(path);
            });

          });

      }
    });
  }

  /**
   * provides array of elevations for provided list of points
   * @param path array of google.maps.latlng instances
   * @returns array of elevations at provided points
   */
  getElevation(path: Array<google.maps.LatLng>) {

    return new Promise<Array<Number>>( (res, rej) => {

      this.elevator = new google.maps.ElevationService;
      this.elevator.getElevationForLocations(
        {'locations': path},
        (elevResults, status) => {
          if (status === google.maps.ElevationStatus.OK) {
            if (elevResults[0]) {
              res(elevResults.map(e => e.elevation));
            }
          }
        }
      );

    });

  }

  /**
   * clear created path from map and reset all variables
   */
  clearPath() {
    const path = this.polyLine.getPath();
    path.clear();
    this.markers.forEach(x => x.setMap(null));
    this.markers = [];
    this.elevArray = [];
    this.dataService.fromCreateToDetail.emit(
      this.geoService.pathStats(path.getArray(), this.elevArray)
    );
  }

  /**
  * Undo last section of path added
  * Uses the length of the last element of the elevArray to determine
  * number of points to pop from path, meaning seperate record of points
  * added is not needed.
  */
  undoLast() {

    const path = this.polyLine.getPath();
    const undoLength = this.elevArray[this.elevArray.length - 1].length;

    if (path.getLength() > 1) {

      for (let i = 0; i < undoLength; i++) { path.pop(); }
      this.elevArray.pop();

      // if undo action removes polyline from screen, then re-centre
      const lastPoint = path.getAt(path.getLength() - 1);
      if (!this.map.getBounds().contains(lastPoint)) {
        this.map.panTo(lastPoint);
      }

      this.dataService.fromCreateToDetail.emit(
        this.geoService.pathStats(path.getArray(), this.elevArray)
      );

    } else {
      // no more path to pop, so just clear everything
      this.clearPath();
    }

  }

  /**
  * Auto fill final segment back to start of path
  */
  closePath() {

    const path = this.polyLine.getPath();
    const destination = path.getAt(0);

    this.addToPath(path, destination).then( (newPath) => {
      this.dataService.fromCreateToDetail.emit(
        this.geoService.pathStats(newPath.getArray(), this.elevArray)
      );
    });

  }

/**
 *
 * DEFINE BUTTON CLICK FUNCTIONS
 *
 */

  loadSinglePath()       { document.getElementById('file-select-single').click(); }
  loadMultiplePaths()    { document.getElementById('file-select-multiple').click(); }
  addToChallenges()      { this.controlFunctions.addToChallenges(this.pathId); }
  removeFromChallenges() { this.controlFunctions.removeFromChallenges(this.pathId); }
  deletePath()           { this.controlFunctions.deletePath(this.pathType, this.pathId);   }
  createNewPath()        { this.controlFunctions.createNewPath(this.pathType, this.pathId);   }
  exportPathToFile()     {
    this.httpService.exportPath(this.pathType, this.pathId).subscribe( (r) => {
      window.location.href = 'http://localhost:3000/download';
    });
  }
  saveCreatedPath()      { this.controlFunctions.saveCreatedPath(this.pathType, this.polyLine.getPath());   }
  discardCreatedPath()   { this.controlFunctions.discardCreatedPath(this.pathType);    }
  discardImportedPath()  { this.controlFunctions.discardImportedPath(this.pathType);   }

  /**
   * enables user to select start and end of path segment, and searches databse for matches
   */
  findPathOnChallenge() {
    console.log('click');
    const dataLayerId = this.map.data;
    this.map.data.addListener('click', (event) => {

      console.log('blah');
    });
  }

  /**
   * user wants to save a path that was imported, following review
   */
  saveImportedPath() {
    const data = this.dataService.getCreateRouteDetails();
    this.httpService.savePath(this.pathType, this.pathId, data).subscribe( (result) => {
      this.router.navigate(['paths', this.pathType, this.pathId]);
    });
  }

  measureDistance() {

    const polyLine = new google.maps.Polyline({
      map: this.map,
      editable: false,
    });

    this.map.addListener('click', (event) => {

      const marker = new google.maps.Marker({
        position: event.latLng,
        map: this.map
      });

      const line = polyLine.getPath();
      line.push(event.latLng);
      this.markers.push(marker);

      if ( line.getLength() === 2 ) {
        // on second click, show text box

        const infoWindow = new google.maps.InfoWindow({
          content: 'distance = ' + this.geoService.pathStats(line.getArray(), null).distance,
          position: event.latLng
        });

        this.markers.push(infoWindow);
        infoWindow.open(this.map);

      } else if ( line.getLength() > 2 ) {
        // clear the map on third click

        line.clear();
        this.markers.forEach(x => x.setMap(null));
        this.markers = [];
      }


    });

  }

/**
 * CREATE PATH ACTIONS
 *
 *
 */

/**
 *
 * CREATE PATH ACTIONS
 *
 */

  setInputEnabled(div) {

    // if ( !div ) { return false; }

    // const cb = <HTMLInputElement>document.getElementById('input' + div.id);
    // cb.disabled = false;
    // div.style.backgroundColor =  '#e0e0e0';
    // div.style.color = 'black';
    // clearInterval(this.timer);

  }

  setInputDisabled(div) {

    // if ( !div ) { return false; }

    // const cb = <HTMLInputElement>document.getElementById('input' + div.id);
    // cb.disabled = false;
    // div.style.backgroundColor =  '#e0e0e0';
    // div.style.color = 'black';
    // clearInterval(this.timer);

  }

  /**
   *
   * Set click functions for checkboxes and radio buttons
   *
   *
   */

  showMileMarkers() {
    const cb = <HTMLInputElement>document.getElementById('inputMile Markers');

    if ( cb.checked === true ) {
      this.path.features[0].properties.stats.kmSplits.forEach( (c, i) => {
        const coord = this.path.features[0].geometry.coordinates[c[0]];
          this.markers.push(new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 0,
            fillColor: '#FF0000',
            fillOpacity: 0.5,
            map: this.map,
            center: {'lat': coord[1], 'lng': coord[0]},
            radius: 100
          }));
      });
    } else {

      this.markers.forEach( (m) => { m.setMap(null); });
    }

  }



  showTracks () {

    const cb = <HTMLInputElement>document.getElementById('inputTracks');

    if ( cb.checked === true ) {
      this.tracks.features.forEach( (ftr, i) => {
        ftr.id = 'tracks-' + i;
        this.map.data.addGeoJson(ftr);
      });


    /**
     * DEBUG BLOCK
     * puts a red circle of radius 20m around each route point
     * */
      this.path.features[0].geometry.coordinates.forEach( (c) => {
        const circle = new google.maps.Circle({
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillOpacity: 0,
          map: this.map,
          center: {'lat': c[1], 'lng': c[0]},
          radius: 25
        });
      });

    /**
     * DEBUG BLOCK
     * puts a small black circle at each track point to help visualisation
     * */
      // this.tracks.features.forEach( (f) => {
      //   f.geometry.coordinates.forEach( (c) => {
      //     const circle = new google.maps.Circle({
      //       strokeColor: '#000000',
      //       strokeOpacity: 0.8,
      //       strokeWeight: 2,
      //       fillColor: '#000000',
      //       fillOpacity: 0.35,
      //       map: this.map,
      //       center: {'lat': c[1], 'lng': c[0]},
      //       radius: 0.5
      //     });
      //   });
      // });

    /**
     * DEBUG BLOCK
     * puts a blue circle of radius equal to closest matched track point, around each route point
     * */
      // this.match.features[0].geometry.coordinates.forEach( (c, i) => {
      //   const circle = new google.maps.Circle({
      //     strokeColor: '#0000FF',
      //     strokeOpacity: 0.8,
      //     strokeWeight: 2,
      //     fillOpacity: 0,
      //     map: this.map,
      //     center: {'lat': c[1], 'lng': c[0]},
      //     radius: this.match.features[0].properties.dist[i].length === 0 ? 0 : Math.min(...this.match.features[0].properties.dist[i])
      //   });
      // });

    } else {
      this.tracks.features.forEach( (ftr, i) => {
        this.map.data.remove(this.map.data.getFeatureById('tracks-' + i));
      });
    }
  }

  radioClick() {

    console.log('click');

    const r = <HTMLInputElement>document.getElementById('inputRoute');
    const b = <HTMLInputElement>document.getElementById('inputBinary');
    const c = <HTMLInputElement>document.getElementById('inputContour');

    if ( r.checked ) {
      console.log('click route');
      // Route button is active

      // remove data
      try {
        this.binary.features.forEach( (ftr, i) => {
          this.map.data.remove(this.map.data.getFeatureById('binary-' + i));
        });
      } catch {}
      try {
        this.contour.features.forEach( (ftr, i) => {
          this.map.data.remove(this.map.data.getFeatureById('contour-' + i));
        });
      } catch {}
      // add route
      this.path.features[0]['id'] = 'route-';
      this.map.data.addGeoJson(this.path.features[0]);

    } else

    if ( b.checked ) {
      // Binary button is active

      // remove data
      try {
        this.map.data.remove(this.map.data.getFeatureById('route-'));
      } catch {}
      try {
        this.contour.features.forEach( (ftr, i) => {
          this.map.data.remove(this.map.data.getFeatureById('contour-' + i));
        });
      } catch {}
      // add binary
      this.binary.features.forEach( (ftr, i) => {
        ftr.id = 'binary-' + i;
        this.map.data.addGeoJson(ftr);
      });
    } else

    if ( c.checked ) {
      // Contour button is active

      // remove data
      try {
        this.map.data.remove(this.map.data.getFeatureById('route-'));
      } catch {}
      try {
        this.binary.features.forEach( (ftr, i) => {
          this.map.data.remove(this.map.data.getFeatureById('binary-' + i));
        });
      } catch {}
      // add contour
      this.contour.features.forEach( (ftr, i) => {
        ftr.id = 'contour-' + i;
        this.map.data.addGeoJson(ftr);
      });
    }
  }


/**
 *
 * Action on import file clicker
 *
 */
// onFilePickedExport(event: Event) {

//   const files = (event.target as HTMLInputElement).files;

//   const pathName = files[0].name;
//   console.log(pathName);
//   // this.controlFunctions.exportPathToFile(this.pathType, this.pathId, pathName);


// }

onFilePickedImport(event: Event, type: String) {

  // Get multiple file names
  const files = (event.target as HTMLInputElement).files;        // multiple files
  document.documentElement.style.cursor = 'wait';

  if ( type === 'single' ) {
    const fileData = new FormData();
    fileData.append('filename', files[0], files[0].name);

    // TODO: this can be smartened up but requires combining import functions on backend
    if ( this.pathType === 'route' ) {
      this.httpService.importRoute(fileData).subscribe( (a) => {
        document.documentElement.style.cursor = 'default';
        this.dataService.storeNewPath(a.geoJson);
        this.router.navigate(['paths', this.pathType, '-1']);
      });
    } else {
      this.httpService.importTracks(fileData, 'single').subscribe( (a) => {
        document.documentElement.style.cursor = 'default';
        this.dataService.storeNewPath(a.geoJson);
        this.router.navigate(['paths', this.pathType, '-1']);
      });
    }

  } else {

    let returnCount = -1;
    const numberOfFiles = (files.length - 1);

    for (let i = 0; i <= numberOfFiles; i++) {

      const fileData = new FormData();
      fileData.append('filename', files[i], files[i].name);

      this.httpService.importTracks(fileData, 'batch').subscribe( (a) => {

        returnCount++;
        console.log('file: ' + returnCount + ' of ' + numberOfFiles);

        if ( returnCount === numberOfFiles ) {
          // had back the number of files sent

          document.documentElement.style.cursor = 'default';
          this.router.navigate(['paths', this.pathType]);
        }

      });
    }


  }

}




// cancel() {
//   this.router.navigate(['paths', this.pathType, this.pathId]);
// }


/**
 *CLEAR UP
 */

  ngOnDestroy() {
    console.log('unsubscribe from paramSub');
    this.paramSubs.unsubscribe();
  }

} // export class

