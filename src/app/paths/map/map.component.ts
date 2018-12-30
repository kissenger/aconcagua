import { Component, OnInit, OnDestroy } from '@angular/core';
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
  public poly: google.maps.Polyline;

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
  public pathHistory = [];
  public createdPath;
  public markers = [];
  public isSnapOn = true;

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
              // this.httpService.getMatchedTracks(this.pathId).subscribe( (res) => {

              //   this.tracks = res['geoTracks'];
              //   console.log(this.tracks);

              //   // use timer to repeatedly attempt to trun checkbox active, until succesful
              //   // this.subsActive = false;
              //   // this.timer = setInterval( () => {
              //   //   this.setInputEnabled(<HTMLElement>document.getElementById('Tracks'));
              //   // }, 200);

              // });

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

    const that = this;
    this.map = new google.maps.Map(document.getElementById('map'), this.initData.getMapOptions(this.pageType));

    if ( this.pathId === '0' ) {
    // path id is not known
      this.map.fitBounds( { north: 90, south: -90, east:  180, west:  -180});

    } else {
    // path id is known

      // plot route data
      this.path.features[0]['id'] = 'route-';
      this.map.data.addGeoJson(that.path.features[0]);

      // fit map bounds
      this.map.fitBounds({ north: this.path.bbox[3], south: this.path.bbox[1], east: this.path.bbox[2], west: this.path.bbox[0] });

      // set style of plotted paths
      let lineStyles = {};
      lineStyles = that.initData.getMapLineStyles();
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

      // emit data to data component and save to storage -- DATA FLOWS NEED REVIEWING
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

        this.poly = new google.maps.Polyline({
          map: this.map,
          editable: false,
        });

        this.map.addListener('click', function(event) {

          that.createdPath = that.poly.getPath();

          if (that.createdPath.getLength() === 0) {
            // this is the first point, so put a marker on it - NOT WORKING BUT DONT KNOW WHY

            that.createdPath.push(event.latLng);
            that.poly.setPath(that.createdPath);

            const startMarker = new google.maps.Marker({
              position: that.createdPath[0],
              map: that.map
            });

          } else {
            // not the first point, do stuff depending on state of snap bcheckbox

            if (that.isSnapOn === true) {
              // snap to roads

              const firstPoint = that.createdPath.getAt(that.createdPath.getLength() - 1);
              const lastPoint = event.latLng;
              that.geoService.snapToRoad(firstPoint, lastPoint).then( (np) => {
                np.map( (x) => that.createdPath.push(x) );
                that.pathHistory.push(np.length);
                that.dataService.fromCreateToDetail.emit(
                  that.geoService.pathStats(that.createdPath)
                );
              });

            } else {
              // dont snap to roads

              that.createdPath.push(event.latLng);
              that.pathHistory.push(1);
              that.poly.setPath(that.createdPath);

            } // if (that.isSnapOn === true)
          } // if (that.createdPath.getLength() === 0) {

          // emit path length to data component
          that.dataService.fromCreateToDetail.emit(
            that.geoService.pathStats(that.createdPath)
          );

        });
      }
    }

  } // loadMap()


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
  exportPathToFile()     { this.controlFunctions.exportPathToFile(this.pathType, this.pathId);   }
  saveCreatedPath()      { this.controlFunctions.saveCreatedPath(this.pathType, this.poly.getPath());   }
  discardCreatedPath()   { this.controlFunctions.discardCreatedPath(this.pathType);    }
  // saveImportedPath()     { this.controlFunctions.saveCreatedPath(this.pathType, this.poly.getPath());  }
  discardImportedPath()  { this.controlFunctions.discardImportedPath(this.pathType);   }


  saveImportedPath() {

    const d = this.dataService.getCreateRouteDetails();
    console.log(d);

    this.httpService.savePath(this.pathType, this.pathId, d).subscribe( (result) => {
      this.router.navigate(['paths', this.pathType, this.pathId]);
    });
  }


/**
 *
 * CREATE PATH ACTIONS
 *
 */

  clearPath() {
    const createdPath = this.poly.getPath();

    createdPath.clear();
    this.pathHistory = [];

  }

  undoLast() {

    this.createdPath = this.poly.getPath();
    if (this.pathHistory.length > 0) {
      for (let i = 0; i < this.pathHistory[this.pathHistory.length - 1]; i++) {
        this.createdPath.pop();
      }
      this.pathHistory.pop();

      // check if undo action removes polyline from screen; if so re-centre
      const lastPoint = this.createdPath.getAt(this.createdPath.getLength() - 1);
      const mapBounds = this.map.getBounds();
      if (!mapBounds.contains(lastPoint)) {
        this.map.panTo(this.createdPath.getAt(this.createdPath.getLength() - 1));
      }

    } else {
      this.createdPath.clear();
      // if (startMarker) {
      //   startMarker.setMap(null);
      //   startMarker = null;
      // }
    }

    this.dataService.fromCreateToDetail.emit(
      this.geoService.pathStats(this.createdPath)
    );
  }

  closePath() {
    if ( this.isSnapOn === true ) {

      const firstPoint = this.createdPath.getAt(this.createdPath.getLength() - 1);
      const lastPoint = this.createdPath.getAt(0);
      this.geoService.snapToRoad(firstPoint, lastPoint).then( (np) => {
        np.map( (x) => this.createdPath.push(x) );
        this.pathHistory.push(np.length);
        this.dataService.fromCreateToDetail.emit(
          this.geoService.pathStats(this.createdPath)
        );
      });
    } else {
      this.createdPath.push(this.createdPath.getAt(0));
      this.pathHistory.push(1);
    }
  }

  snapToRoads () {

    const cb = <HTMLInputElement>document.getElementById('inputRoad Snap');

    console.log('click snap');
    if ( cb.checked === true ) {
      this.isSnapOn = true;
    } else {
      this.isSnapOn = false;
    }
  }

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



//   }

//   cbShowTracks () {
//     const cb = <HTMLInputElement>document.getElementById('inputTracks');

//     if ( cb.checked === true ) {
//       this.tracks.features.forEach( (ftr, i) => {
//         ftr.id = 'tracks-' + i;
//         this.map.data.addGeoJson(ftr);
//       });


//     /**
//      * DEBUG BLOCK
//      * puts a red circle of radius 20m around each route point
//      * */
//       // this.path.features[0].geometry.coordinates.forEach( (c) => {
//       //   const circle = new google.maps.Circle({
//       //     strokeColor: '#FF0000',
//       //     strokeOpacity: 0.8,
//       //     strokeWeight: 2,
//       //     fillOpacity: 0,
//       //     map: this.map,
//       //     center: {'lat': c[1], 'lng': c[0]},
//       //     radius: 20
//       //   });
//       // });

//     /**
//      * DEBUG BLOCK
//      * puts a small black circle at each track point to help visualisation
//      * */
//       // this.tracks.features.forEach( (f) => {
//       //   f.geometry.coordinates.forEach( (c) => {
//       //     const circle = new google.maps.Circle({
//       //       strokeColor: '#000000',
//       //       strokeOpacity: 0.8,
//       //       strokeWeight: 2,
//       //       fillColor: '#000000',
//       //       fillOpacity: 0.35,
//       //       map: this.map,
//       //       center: {'lat': c[1], 'lng': c[0]},
//       //       radius: 0.5
//       //     });
//       //   });
//       // });

//     /**
//      * DEBUG BLOCK
//      * puts a blue circle of radius equal to closest matched track point, around each route point
//      * */
//       // this.match.features[0].geometry.coordinates.forEach( (c, i) => {
//       //   const circle = new google.maps.Circle({
//       //     strokeColor: '#0000FF',
//       //     strokeOpacity: 0.8,
//       //     strokeWeight: 2,
//       //     fillOpacity: 0,
//       //     map: this.map,
//       //     center: {'lat': c[1], 'lng': c[0]},
//       //     radius: this.match.features[0].properties.dist[i].length === 0 ? 0 : Math.min(...this.match.features[0].properties.dist[i])
//       //   });
//       // });

//     } else {
//       this.tracks.features.forEach( (ftr, i) => {
//         this.map.data.remove(this.map.data.getFeatureById('tracks-' + i));
//       });
//     }
//   }

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

onFilePicked(event: Event, type: String) {

  // Get multiple file names
  const files = (event.target as HTMLInputElement).files;        // multiple files
  document.documentElement.style.cursor = 'wait';

  console.log(type);
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

