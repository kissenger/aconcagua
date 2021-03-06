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
import { registerModuleFactory } from '@angular/core/src/linker/ng_module_factory_loader';
import { resolve } from 'dns';
import { UtilsService } from 'src/app/utils.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  encapsulation: ViewEncapsulation.None
})

export class MapComponent implements OnInit, OnDestroy {

  // url parameter subscription derived variables
  private paramSubs: any;
  private pathType: String;
  private pathId: String;
  private pageType: String;

  // arrays containing required controls for this page
  private menuItems: any;
  private isMenuSticky: Boolean;
  private checkBoxItems: any;
  private radioItems: any;
  private checkboxItems: any;
  private showPlotOptions = true;

  // google map instances
  private map: google.maps.Map;
  private polyLine: google.maps.Polyline;
  // private elevator: google.maps.ElevationService;

  // challenges
  private challengeType: string;


  // used in save path form popup
  private pathName: String;
  private description: String;
  private isBatch = false;

  // recieved geoJson files from the backend
  private path: any;               // route/track data
  private binary;                  // binary plot data
  private tracks;                  // all matched tracks
  private contour;                 // contour plot data
  private trackFeatures;

  // used in route create mode
  private markers = [];
  private elevArray = [];
  private activePathSegmentInstance: any;

  // other class variables used for flow control
  private subsActive: Boolean;
  private timer: NodeJS.Timer;

  private feedService: any;
  // private DEBUG = false;
  private DEBUG = true;

  constructor(
    private httpService: HttpService,
    private dataService: DataService,
    private geoService: GeoService,
    private initData: InitialisationData,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    private controls: Controls,
    private controlFunctions: ControlFunctions,
    private  utilService: UtilsService
    ) {
      this.router = router;
    }

  ngOnInit() {
    if (this.DEBUG) { console.log('-->map.component.ngOnInit()^^^^^^^^^^^^^^^^^'); }

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
      this.pathId = params.id;
      this.pathType = params.pathType;
      this.pageType = getPageType(this.pathId, params.pageType);

      // console.log(this.pathId);
      // console.log(this.pathType);
      // console.log(this.pageType);

      // get definition of controls for this page
      this.isMenuSticky = this.controls.getMenuButtons(this.pageType, this.pathType).isSticky;
      this.menuItems = this.controls.getMenuButtons(this.pageType, this.pathType).btnArray;
      this.radioItems = this.controls.getRadioButtons(this.pageType, this.pathType)[0];
      this.checkboxItems = this.controls.getCheckBoxes(this.pageType, this.pathType);
      if ( typeof this.radioItems === 'undefined' && typeof this.checkboxItems[0] === 'undefined' ) {
        this.showPlotOptions = false;
      } else {
        this.showPlotOptions = true;
      }

      // now we know page type, get data and call loadMap()
      console.log(this.pageType);
      if ( this.pageType === 'reload' ) {
        console.log('hekpove');
        this.router.navigate(['paths', this.pathType, this.pathId]);

      } else if ( this.pageType === 'review') {
        this.path = this.dataService.getStoredNewPath();
        this.pathId = this.path.properties.pathId;
        this.loadMap();

      } else if ( this.pageType === 'load-single' ||  this.pageType === 'load-batch') {
        document.getElementById('file-select').style.display = 'block';

      } else if ( this.pageType === 'normal' || this.pageType === 'create') {

        if (this.pathId) {   // required to prevent trying to recall a non-existant path when no id in url

          if (this.pathId === '0') {
            this.loadMap();
          } else {
            this.httpService.getPathById(this.pathType, this.pathId).subscribe( (result) => {
              // console.log(result);
              this.path = result.geoJson;

              if ( this.pathType === 'challenge' ) {
                // console.log(result);
                this.binary = result.geoBinary;
                this.contour = result.geoContour;
                this.feedService = this.dataService.newNotification.subscribe( (data) => {
                  // notification
                });

                // **NEED TO DETECT IF THIS IS A NEWLY UPLOADED CHALLENGE, IF SO DONT LOAD TRACKS (YET)
                this.httpService.getMatchedTracks(this.pathId).subscribe( (tracks) => {
  // console.log(tracks);
                  this.tracks = tracks.geoTracks;
                  // console.log(this.tracks);

                  // use timer to repeatedly attempt to trun checkbox active, until succesful
                  // this.subsActive = false;
                  // this.timer = setInterval( () => {
                  //   this.setInputEnabled(<HTMLElement>document.getElementById('Tracks'));
                  // }, 200);

                });

              } // if challenge page

              this.loadMap();
            }); // httpService subscription
          }
        }
        // this.loadMap();
        document.documentElement.style.cursor = 'default';
      }

    }); // url params subscription

    /**
     * Determines the type of page to display based on url parameters
     * @param id path id as string
     * @param page page type if provided as string
     */
    function getPageType(id: String, page: String) {
      if ( id === '-1' && typeof page === 'undefined' ) { return 'review'; }
      if ( page === 'reload' ) { return 'reload'; }
      if ( id === 'load-single') { return 'load-single'; }
      if ( id === 'load-batch' ) { return 'load-batch'; }
      if ( page === 'create' ) { return 'create'; }
      return 'normal';
    }

  } // ngOnInit

  loadMap() {

    // console.log(this.pageType);
    if (this.DEBUG) {
      console.log('-->map.component.loadMap(): this.path = ', this.path);
      console.log('-->map.component.loadMap(): this.binary = ', this.binary);
      console.log('-->map.component.loadMap(): this.contour = ', this.contour);
    }

    this.map = new google.maps.Map(document.getElementById('map'), this.initData.getMapOptions(this.pageType));

    if ( this.pathId === '0' ) {
      this.setMapBoundary();

    } else {

      // add set and set boundary
      this.map.data.addGeoJson(this.path);
      this.setMapBoundary(this.path.bbox);

      // set the proprties of the path, depending on what type of path is active
      // iterates through each feature in featurecollection
      this.map.data.setStyle( (feature) => {
        const featureType = feature.getProperty('plotType');
        const featureStyle = this.initData.getMapLineStyles(featureType);
        featureStyle.strokeColor = feature.getProperty('color');
        featureStyle.strokeOpacity = this.pageType === 'create' ? 0.5 : featureStyle.strokeOpacity;
        return featureStyle;
      });

      // put a start and finish marker on each displayed route
      const markerArray = [];
      this.path.features.forEach((feature) => {
        markerArray.push(feature.geometry.coordinates[0]);
        if ( this.path.properties.category !== 'Circular' ) {
          if (feature.geometry.coordinates[0] !== feature.geometry.coordinates[feature.geometry.coordinates.length - 1]) {
            markerArray.push(feature.geometry.coordinates[feature.geometry.coordinates.length - 1]);
          }
        }
      });

      let label = '@';
      markerArray.forEach( coords => {
        label = this.utilService.nextLetter(label);
        const marker = new google.maps.Marker({
          position: new google.maps.LatLng(coords[1], coords[0]),
          map: this.map,
          label: label
        });
      });




      // TODO - DATA FLOWS NEED REVIEWING - THIS CAN BE IMPROVED
      // const emitData = {
      //   path: this.path.properties,
      //   pathFeatures: this.path.features,
      //   match: this.binary ? this.binary.properties : 0
      // };
      // if (this.DEBUG) { console.log('map.component.loapMap(): emitData = ', emitData); }

      // this.dataService.fromMapToData.emit(emitData);
      // this.dataService.storeData(emitData);

      const emitData = {
        path: this.path,
        match: this.binary ? this.binary.properties : 0
      };
      if (this.DEBUG) { console.log('map.component.loapMap(): emitData = ', emitData); }

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
            console.log(this.elevArray);
            this.dataService.fromCreateToDetail.emit(

              this.geoService.pathStats(newPath.getArray(), this.elevArray)
            );
          });

        });
      }
    }
  } // loadMap()

  /**
   * sets the fitBounds property on the current map
   * @param boundingBox OPTIONAL bounding box as [minlng, minlat, maxlng, maxlat]
   * if not provided, will default to world view
   */
  private setMapBoundary(boundingBox = [-180, -90, 180, 90]) {
    this.map.fitBounds({
      north: boundingBox[3],
      south: boundingBox[1],
      east: boundingBox[2],
      west: boundingBox[0]
    });
  }

  /**
   * extends path to new destination, including snap to road if requested
   * @param path result of this.polyLine.getPath()
   * @param dest google maps LatLng object defining destination point
   * @returns path updated with additional points
   * side-effects:
   *   updates this.elev on the component class
   */
  private addToPath(path: google.maps.MVCArray<google.maps.LatLng>, dest: google.maps.LatLng) {

    return new Promise<google.maps.MVCArray<google.maps.LatLng>>( (resolveOuterPromise, rejectOuterPromise) => {

      const snapCheckbox = <HTMLInputElement>document.getElementById('inputRoad Snap');
      const simplifyCheckbox = <HTMLInputElement>document.getElementById('inputAuto Simplify');

      if ( snapCheckbox.checked === false || path.getLength() === 0 ) {

        // dont snap to roads
        this.pushPath(path, new google.maps.MVCArray([dest])).then( updatedPath => {
          resolveOuterPromise(updatedPath);
        });

      } else {

        // do snap to roads
        // get list of snapped coordinates from google
        this.geoService.snapToRoad(path.getAt(path.getLength() - 1), dest)
          .then( (result) => {
            const newSegment = new google.maps.MVCArray(result);

            if ( simplifyCheckbox.checked ) {
              // auto simplify is on, so need to send to backend for a simplified version of path
              // this line converts MVCArray to JSON which is needed for the backend to parse
              const geoPath = this.geoService.polylineToJson(newSegment, []);
              this.httpService.simplifyPath(geoPath).subscribe( (newSegmentSimplified) => {
                this.pushPath(path, this.geoService.coordsToMVCArray(newSegmentSimplified.lngLat)).then( updatedPath => {
                    resolveOuterPromise(updatedPath);
                });

              });

            } else {
              this.pushPath(path, newSegment).then( updatedPath => {
                resolveOuterPromise(updatedPath);
              });
            }
          });
      }

    });
  }

  /**
   * push new segment onto existing path
   * @param oldPath is the existing polyline
   * @param newSeg is the MVCArray defining the new segment to add to the path
   * @returns MVCArray defining new lengthened path
   */
  private pushPath(oldPath: google.maps.MVCArray<google.maps.LatLng>, newSeg: google.maps.MVCArray<google.maps.LatLng>) {

    return new Promise<google.maps.MVCArray<google.maps.LatLng>>( (res, rej) => {

      newSeg.getArray().forEach( p => oldPath.push(p) );
      this.geoService.getElevation(newSeg).then( (elevs) => {
        this.elevArray.push(elevs);
        res(oldPath);
      });

    });
  }


  /**
   * clear created path from map and reset all variables
   */
  private clearPath() {
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
  private undoLast() {

    const path = this.polyLine.getPath();
    const undoLength = this.elevArray[this.elevArray.length - 1].length;
    console.log(path);
    console.log(undoLength);
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
  private closePath() {

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
  // addToChallenges()      { this.controlFunctions.addToChallenges(this.pathId); }
  deletePath()           { this.controlFunctions.deletePath(this.pathType, this.pathId);   }
  createNewPath()        { this.controlFunctions.createNewPath(this.pathType, this.pathId);   }
  saveCreatedPath()      { this.controlFunctions.saveCreatedPath(this.pathType, this.polyLine.getPath(), this.elevArray);   }
  exportPathToFile()     {
    this.httpService.exportPath(this.pathType, this.pathId).subscribe( (r) => {
      window.location.href = 'http://localhost:3000/download';
    });
  }
  discardCreatedPath()   { this.controlFunctions.discardCreatedPath(this.pathType);    }
  discardImportedPath()  { this.controlFunctions.discardImportedPath(this.pathType);  }

  /**
   *
   */
  createPathsChallenge() {
    document.getElementById('list-popup').style.display = 'inline';
  }

  /**
   *
   */
  createPathCloudChallenge() {

    this.challengeType = 'pathCloud';
    document.documentElement.style.cursor = 'wait';

    class ClickBounds {
      public markers = [];
      public addClick(latLng: google.maps.LatLng) {
        if (this.markers.length === 2) {
          this.markers = [latLng];
        } else {
          this.markers.push(latLng);
          if (this.markers.length === 2) {

            const p1LatLng = this.markers[0].toString().replace(/[()]/g, '').split(', ');
            const p2LatLng = this.markers[1].toString().replace(/[()]/g, '').split(', ');

            const minLat = Number(Math.min( parseFloat(p1LatLng[0]), parseFloat(p2LatLng[0]) ).toFixed(4));
            const maxLat = Number(Math.max( parseFloat(p1LatLng[0]), parseFloat(p2LatLng[0]) ).toFixed(4));
            const minLng = Number(Math.min( parseFloat(p1LatLng[1]), parseFloat(p2LatLng[1]) ).toFixed(4));
            const maxLng = Number(Math.max( parseFloat(p1LatLng[1]), parseFloat(p2LatLng[1]) ).toFixed(4));
            return [minLng, minLat, maxLng, maxLat];

            // https://api.openstreetmap.org/api/0.6/map?bbox=11.54,48.14,11.543,48.145

          }
        }
        return null;
      }
    }

    const clickBounds = new ClickBounds();
    this.map.addListener('click', (event) => {
      const navigate = clickBounds.addClick(event.latLng);
      if (navigate) {
        // console.log('navigate');
        this.httpService.getOpenStreetMapData(navigate).subscribe( (result) => {
          // console.log(result.geoJson);
          this.dataService.storeNewPath(result.geoJson);
          this.router.navigate(['paths', this.pathType, '-1']);

          // this.map.data.addGeoJson(result.geoJson);

        });
      }
    });

  }



/*******************************************************************************************
 *
 *
 * enables user to select start and end of path segment, and searches databse for matches
 * call to navigation is performed in marker click listener in function addMarker()
 *
 *
 *******************************************************************************************/

  findPathOnChallenge() {

    class PathSegment {

      public lastPoint: google.maps.LatLng;

      private markers = [];
      private indices = [];
      private polyLine: google.maps.Polyline;
      private mapInstance: google.maps.Map;

      constructor(mapInstance: google.maps.Map) {

        this.polyLine = new google.maps.Polyline({
          map: mapInstance,
          editable: false,
        });

        this.mapInstance = mapInstance;
      }

      public countMarkers() {
        return this.markers.length;
      }

      public countClickedMarkers() {
        return this.markers.map( (m) => m.isClicked ? 1 : 2 ).reduce( (a, c) => a + c, 0 );
      }

      /**
       * sets the polyline content
       */
      private setSegment() {
        const minIndex = Math.min(this.indices[0], this.indices[1]);
        const maxIndex = Math.max(this.indices[0], this.indices[1]);
        const polyPath = targetPath.slice(minIndex, maxIndex + 1);
        this.polyLine.setPath(polyPath.map((p) => new google.maps.LatLng(p[1], p[0]) ));
      }

      /**
       * class entry point; determines what methods to action
       * @param point point on line that is closest to the current cursor position
       */
      public newPoint(point: any) {

        if ( this.lastPoint ) {

          if ( !point.latLng.equals(this.lastPoint) ) {

            this.removeUnclickedMarkers();

            if (this.countClickedMarkers() < 2) {
              this.addUnclickedMarker(point.latLng, point.index);
            }

            if (this.countMarkers() === 2) {
              this.setSegment();
            }

          }
        }
      }

      /**
       * flushes the markers and indices arrays of any unclicked points
       */
      public removeUnclickedMarkers() {

        // remove any markers from map that havent been clicked
        // dont change order of pop/shift or strange things happen
        if (this.markers[1] && this.markers[1].isClicked === false) {
          this.markers.pop().setMap(null);
          this.indices.pop();
        }

        if (!!this.markers[0] && this.markers[0].isClicked === false) {
          this.markers.shift().setMap(null);
          this.indices.shift();
        }

      }

      /**
       * returns marker point with click listener
       * @param latLng desired position as google.maps.Latlng
       * @param mapInstance instance of map on which to implement marker
       * @param marks array of existing point instances
       * @returns marker id
       */
      private addUnclickedMarker(latLng: google.maps.LatLng, index: Number) {

        // initialise marker
        const circle = new google.maps.Marker({
          position: latLng,
          clickable: true,
          map: this.mapInstance,
          zIndex: 10,
          icon: {
            strokeColor: '#000000',
            strokeWeight: 2,
            fillOpacity: 0,
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
          }
        });
        circle['isClicked'] = false;

        // update class properties
        this.markers.push(circle);
        this.indices.push(index);

        // add click listener
        circle.addListener('click', () => {
          this.toggleMarker(circle);
          this.navigate();
        });

      }

      /**
       * toggle the properties of a marker between clicked and unclicked states
       * @param marker target marker
       */
      private toggleMarker(marker: google.maps.Marker) {
        // change marker properties
        marker['isClicked'] = !marker['isClicked'];
        marker.setZIndex(marker['isClicked'] ? 20 : 10);
        marker.setIcon({
          strokeColor: '#000000',
          strokeWeight: 2,
          fillOpacity: marker['isClicked'] ? 1 : 0,
          fillColor: '#000000',
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
        });
      }

      /**
       *determine if navigation is required based on number of clicked points
        */
      private navigate() {
        if ( this.markers[1] && this.markers[1]['isClicked'] ) {
         // console.log('navigate');
        }
      }

    } // end of class definition

    const PROXIMITY_THRESHOLD = 500;
    const targetPath = this.path.features[0].geometry.coordinates;  // route to run algorithm on
    const pathSegment = new PathSegment(this.map);

    this.map.addListener('mousemove', (event) => {
      getNearestPoint(event.latLng, targetPath).then( (nearestPoint) => {

        const distance = google.maps.geometry.spherical.computeDistanceBetween(event.latLng, nearestPoint.latLng);

        if (pathSegment.countMarkers() <= 2 && distance < PROXIMITY_THRESHOLD) {
          pathSegment.newPoint(nearestPoint);
          pathSegment.lastPoint = nearestPoint.latLng;
        } else {

          if ( distance > PROXIMITY_THRESHOLD) {
            pathSegment.removeUnclickedMarkers();
          }
        }

      });
    });

  /**
   * returns the point in array than is closests to the current cursor position
   * @param cursorLatLng google.maps.Latlng cursor position from event
   * @param pointArray array of point coordinates in LNG, LAT order
   * @returns google.maps.LatLng position of nearest point
   */
    function getNearestPoint(cursorLatLng: google.maps.LatLng, pointArray: Array<number>) {

      return new Promise<any>( (res, rej) => {
        let closestDistance = 9999999;
        let index: number;

        // would be possible to implement point skipping if this algorithm needs speeding up
        for (let i = 0; i < pointArray.length; i++) {
          const currPoint = new google.maps.LatLng(pointArray[i][1], pointArray[i][0]);
          const currDistance = google.maps.geometry.spherical.computeDistanceBetween(cursorLatLng, currPoint);
          if ( currDistance < closestDistance ) {
            closestDistance = currDistance;
            index = i;
          }
        }

        res({
          latLng: new google.maps.LatLng(pointArray[index][1], pointArray[index][0]),
          index: index
        });
      });
    }

  }

/*******************************************************************************************
 *
 *
 *
 *
 *
 *
 *******************************************************************************************/

  /**
   * user wants to save a path that was imported, following review
   */
  saveImportedPath() {
    const data = this.dataService.getCreateRouteDetails();
    let payload: any;
    if (this.pathType === 'challenge') {
      payload = {
        type: this.challengeType,
        name: data.name,
        description: data.desc,
        // pathIds: this.challengeType = 'paths' ? this.pathIDs : null
      };
    } else {
      payload = data;
    }
    this.httpService.savePath(this.pathType, this.pathId, payload).subscribe( (result) => {
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


  /**
   * reads state of clickbox; adds or removes track data accordingly
   */
  showTracks () {

    const cb = <HTMLInputElement>document.getElementById('inputTracks');
    if (cb.checked) {
      this.trackFeatures = this.map.data.addGeoJson(this.tracks);
      // this.addCircleAroundPoints(this.path, 20);     // only for debugging
    } else {
      this.trackFeatures.forEach((feature: google.maps.Data.Feature) => {
        this.map.data.remove(feature);
      });
    }
  }

  /**
   * Debugging aide: prints circle around points of active path
   * @param radius redius of desired circle
   */
  addCircleAroundPoints(path, radius: number) {
    path.features.forEach( (feature) => {
      feature.geometry.coordinates.forEach( (c) => {
        const circle = new google.maps.Circle({
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillOpacity: 0,
          map: this.map,
          center: {'lat': c[1], 'lng': c[0]},
          radius: radius
        });
      });
    });
  }

  radioClick() {

    // console.log('click');

    const r = <HTMLInputElement>document.getElementById('inputRoute');
    const b = <HTMLInputElement>document.getElementById('inputBinary');
    const c = <HTMLInputElement>document.getElementById('inputContour');

    this.map.data.forEach(feature => this.map.data.remove(feature) );

    if (r.checked) { this.map.data.addGeoJson(this.path); }
    if (b.checked) { this.map.data.addGeoJson(this.binary); }
    if (c.checked) { this.map.data.addGeoJson(this.contour); }

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
        // console.log('file: ' + returnCount + ' of ' + numberOfFiles);

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
    if (this.DEBUG) { console.log('-->map.component.ngOnDestroy()'); }
    this.paramSubs.unsubscribe();
  }

} // export class

