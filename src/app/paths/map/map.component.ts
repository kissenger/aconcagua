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
  private elevator: google.maps.ElevationService;

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

  // used in route create mode
  private markers = [];
  private elevArray = [];
  private activePathSegmentInstance: any;

  // other class variables used for flow control
  private subsActive: Boolean;
  private timer: NodeJS.Timer;

  private feedService: any;

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
      if ( this.pageType === 'review') {
        this.path = this.dataService.getStoredNewPath();
        this.pathId = this.path.properties.pathId;
        this.loadMap();

      } else if ( this.pageType === 'load-single' ||  this.pageType === 'load-batch') {
        document.getElementById('file-select').style.display = 'block';

      } else if ( this.pageType === 'normal' || this.pageType === 'create') {

        if (this.pathId) {   // required to prevent trying to recall a non-existant path when no id in url
          this.httpService.getPathById(this.pathType, this.pathId).subscribe( (result) => {
            console.log(result);
            this.path = result.geoJson;

            if ( this.pathType === 'challenge' ) {
              console.log(result);
              this.binary = result.geoBinary;
              this.contour = result.geoContour;
              this.feedService = this.dataService.newNotification.subscribe( (data) => {
                // notification
              });

              // **NEED TO DETECT IF THIS IS A NEWLY UPLOADED CHALLENGE, IF SO DONT LOAD TRACKS (YET)
              this.httpService.getMatchedTracks(this.pathId).subscribe( (tracks) => {
console.log(tracks);
                this.tracks = tracks.tracks;
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
      if ( id === 'load-single') { return 'load-single'; }
      if ( id === 'load-batch' ) { return 'load-batch'; }
      if ( page === 'create' ) { return 'create'; }
      return 'normal';
    }

  } // ngOnInit

  loadMap() {

    // console.log(this.pageType);
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

      this.path.features.forEach((x, i) => x['id'] = 'route-' + i);
      this.map.data.addGeoJson(this.path);
      this.map.fitBounds({
        north: this.path.bbox[3],
        south: this.path.bbox[1],
        east: this.path.bbox[2],
        west: this.path.bbox[0]
      });

      // set style of plotted paths
      // think about doing this in a more readble manner, even if it take more lines.
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



      // TODO - DATA FLOWS NEED REVIEWING - THIS CAN BE IMPROVED
      const emitData = {
        path: this.path.properties,
        match: this.binary ? this.binary.properties : 0
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
  // addToChallenges()      { this.controlFunctions.addToChallenges(this.pathId); }
  deletePath()           { this.controlFunctions.deletePath(this.pathType, this.pathId);   }
  createNewPath()        { this.controlFunctions.createNewPath(this.pathType, this.pathId);   }
  saveCreatedPath()      { this.controlFunctions.saveCreatedPath(this.pathType, this.polyLine.getPath());   }
  exportPathToFile()     {
    this.httpService.exportPath(this.pathType, this.pathId).subscribe( (r) => {
      window.location.href = 'http://localhost:3000/download';
    });
  }
  discardCreatedPath()   { this.controlFunctions.discardCreatedPath(this.pathType);    }
  discardImportedPath()  { this.controlFunctions.discardImportedPath(this.pathType);  }

  /**
   * Developer function to get bounding box from two points clicked on screen
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
        console.log('navigate');
        this.httpService.getOpenStreetMapData(navigate).subscribe( (result) => {
          console.log(result.geoJson);
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
          console.log('navigate');
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

