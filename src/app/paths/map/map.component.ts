import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../../data.service';
import { HttpService } from '../../http.service';
import { NgControlStatus } from '@angular/forms';
import { waitForMap } from '@angular/router/src/utils/collection';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TryCatchStmt, BoundDirectivePropertyAst } from '@angular/compiler';
import { findLast } from '@angular/compiler/src/directive_resolver';
import { PromiseType } from 'protractor/built/plugins';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})

export class MapComponent implements OnInit, OnDestroy {

  public myService: any;
  public paramSubs: any;

  public httpClient: any;
  public pathType: String;
  public pathID: String;
  public path: any;

  public map: google.maps.Map;
  public pathName: String;
  public description: String;
  public routeDataId;

  public binary;
  public tracks;
  public contour;
  public match;

  public isReviewPage: Boolean;
  public isMatchPage: Boolean;
  public subsActive: Boolean;

  public btnLooks = {
    'bgEnabled': '#e0e0e0',
    'bgDisabled': '#c0c0c0',
    'bgHover': '#ffffff',
    'txtEnabled': '#000000',
    'txtDisabled': '#808080'
  };
  public lineStyle = {
    'binary':  { 'clickable': true, 'strokeColor': null, 'strokeWeight': 3, 'strokeOpacity': 1.0 },
    'contour': { 'clickable': true, 'strokeColor': null, 'strokeWeight': 5, 'strokeOpacity': 1.0 },
    'route':   { 'clickable': true, 'strokeColor': null, 'strokeWeight': 3, 'strokeOpacity': 1.0 },
    'tracks':  { 'clickable': true, 'strokeColor': null, 'strokeWeight': 3, 'strokeOpacity': 0.4 }
  };
  public timer;
  public that = this;

  constructor(
    private httpService: HttpService,
    private dataService: DataService,
    private router: Router,
    private activatedRouter: ActivatedRoute
    ) {
      this.router = router;
    }

  ngOnInit() {

    // List for changes in url params
    this.paramSubs = this.activatedRouter.params.subscribe(params => {

      // get url params
      this.pathType = params.type;
      this.pathID = params.id;

      // Determine page type
      this.isReviewPage = params.id === '-1' ? true : false;
      // this.isMatchPage = params.match === 'match' ? true : false;

      // if path id is specified in the url, then request path data from backend
      document.documentElement.style.cursor = 'wait';

      if ( typeof this.pathID !== 'undefined') {

        if ( !this.isReviewPage ) {
          // this is NOT review page

          if ( !this.subsActive ) {
            // previous subscription is not open

            this.httpService.getPathById(this.pathType, this.pathID)
              .subscribe( (result) => {
                this.path = result['geoJson'];
                this.loadMap();
                document.documentElement.style.cursor = 'default';
            });

          }

          if ( this.pathType === 'route' ) {
            // this is a route

            if ( !this.subsActive ) {
              this.httpService.matchFromDb(this.pathID)
                .subscribe( (result) => {
                  this.processMatchData(result);
                });

            }
          }

        } else {
        // this is review page

          this.myService = this.dataService.fromLoadToMap.
            subscribe( (result) => {
              this.path = result['geoJson'];
              this.pathID = this.path.features[0]._id;
              this.loadMap();
              document.documentElement.style.cursor = 'default';
            });
        }

      }

    });

  } // ngOnInit

  loadMap() {

    console.log(this.path);

    // launch map

    // const mapService = this.mapService;
    this.map = new google.maps.Map(document.getElementById('map'), {
      styles: [
        {'elementType': 'geometry', 'stylers': [{ 'color': '#ebe3cd' } ]},
        {'elementType': 'labels.text.fill', 'stylers': [{ 'color': '#523735' }]},
        {'elementType': 'labels.text.stroke', 'stylers': [{ 'color': '#f5f1e6'}]},
        {'featureType': 'administrative', 'elementType': 'geometry.stroke', 'stylers': [{ 'color': '#c9b2a6'}]},
        {'featureType': 'administrative.land_parcel', 'stylers': [{ 'visibility': 'off'}]},
        {'featureType': 'administrative.land_parcel', 'elementType': 'geometry.stroke', 'stylers': [{ 'color': '#dcd2be'}]},
        {'featureType': 'administrative.land_parcel', 'elementType': 'labels.text.fill', 'stylers': [{ 'color': '#ae9e90'}]},
        {'featureType': 'administrative.neighborhood', 'stylers': [{ 'visibility': 'off'}]},
        {'featureType': 'landscape.natural', 'elementType': 'geometry', 'stylers': [{'color': '#dfd2ae'}]},
        {'featureType': 'poi', 'elementType': 'geometry', 'stylers': [{'color': '#dfd2ae'}]},
        {'featureType': 'poi', 'elementType': 'labels.text', 'stylers': [{'visibility': 'off'}]},
        {'featureType': 'poi', 'elementType': 'labels.text.fill', 'stylers': [{'color': '#93817c'}]},
        {'featureType': 'poi.business', 'stylers': [{'visibility': 'off'}]},
        {'featureType': 'poi.park', 'elementType': 'geometry.fill', 'stylers': [{'color': '#a5b076'}]},
        {'featureType': 'poi.park', 'elementType': 'labels.text.fill', 'stylers': [{'color': '#447530'}]},
        {'featureType': 'road', 'elementType': 'geometry', 'stylers': [{'color': '#f5f1e6'}]},
        {'featureType': 'road', 'elementType': 'labels', 'stylers': [{'visibility': 'off'}]},
        {'featureType': 'road', 'elementType': 'labels.icon', 'stylers': [{'visibility': 'off'}]},
        {'featureType': 'road.arterial', 'elementType': 'geometry', 'stylers': [{'color': '#fdfcf8'}]},
        {'featureType': 'road.arterial', 'elementType': 'geometry.fill', 'stylers': [{'color': '#efebdc'}]},
        {'featureType': 'road.arterial', 'elementType': 'labels', 'stylers': [{'visibility': 'off'}]},
        {'featureType': 'road.highway', 'elementType': 'geometry', 'stylers': [{'color': '#f8c967'}]},
        {'featureType': 'road.highway', 'elementType': 'geometry.stroke', 'stylers': [{'color': '#e9bc62'}]},
        {'featureType': 'road.highway', 'elementType': 'labels', 'stylers': [{'visibility': 'off'}]},
        {'featureType': 'road.highway.controlled_access', 'elementType': 'geometry', 'stylers': [{'color': '#e98d58'}]},
        {'featureType': 'road.highway.controlled_access', 'elementType': 'geometry.stroke', 'stylers': [{'color': '#db8555'}]},
        {'featureType': 'road.local', 'stylers': [{'visibility': 'off'}]},
        {'featureType': 'road.local', 'elementType': 'labels.text.fill', 'stylers': [{'color': '#806b63'}]},
        {'featureType': 'transit', 'stylers': [{'visibility': 'off'}]},
        {'featureType': 'transit.line', 'elementType': 'geometry', 'stylers': [{'color': '#dfd2ae'}]},
        {'featureType': 'transit.line', 'elementType': 'labels.text.fill', 'stylers': [{'color': '#8f7d77'}]},
        {'featureType': 'transit.line', 'elementType': 'labels.text.stroke', 'stylers': [{'color': '#ebe3cd'}]},
        {'featureType': 'transit.station', 'elementType': 'geometry', 'stylers': [{'color': '#dfd2ae'}]},
        {'featureType': 'water', 'elementType': 'geometry.fill', 'stylers': [{'color': '#b9d3c2'}]},
        {'featureType': 'water', 'elementType': 'labels.text', 'stylers': [{'visibility': 'off'}]},
        {'featureType': 'water', 'elementType': 'labels.text.fill', 'stylers': [{'color': '#92998d'}]}
      ],
      mapTypeId: google.maps.MapTypeId.TERRAIN,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      mapTypeControlOptions: {
        mapTypeIds: ['terrain']
      }

    });

    // determine if data is available and act accordingly
    if ( this.pathID !== '0' ) {

      const that = this;
      // plot route data
      this.path.features[0]['id'] = 'route-';
      this.map.data.addGeoJson(this.that.path.features[0]);

      // fit map bounds
      this.map.fitBounds({
        north: this.path.bbox[3],
        south: this.path.bbox[1],
        east:  this.path.bbox[2],
        west:  this.path.bbox[0]
      });

      // set all paths to unclicked
      this.path.features.map(x => x.properties.isClicked = false);

      // set style of plotted paths
      this.map.data.setStyle( (feature) => {

        const featureId = String(feature.getId());
        const featureType = featureId.substring(0, featureId.indexOf('-'));
        that.lineStyle[featureType]['strokeColor'] = feature.getProperty('color');
        return that.lineStyle[featureType];

      });

    /**
     * DEBUG BLOCK
     * puts a red circle of radius 20m around each route point
     * */
      // this.path.features[0].geometry.coordinates.forEach( (c) => {
      //   const circle = new google.maps.Circle({
      //     strokeColor: '#FF0000',
      //     strokeOpacity: 0.8,
      //     strokeWeight: 2,
      //     fillOpacity: 0,
      //     map: this.map,
      //     center: {'lat': c[1], 'lng': c[0]},
      //     radius: 20
      //   });
      // });

    } else {

      // default fit map bounds
      this.map.fitBounds({
        north: 90,
        south: -90,
        east:  180,
        west:  -180
      });

    }

    // define controls
    this.pushControls();

    // emit data to data component
    if ( this.pathID !== '0' ) {
      this.dataService.fromMapToData.emit(
        this.getDataPackage(this.path.features[0])
      );
    }


  } // loadMap()

/**
 * DEFINE MAP CONTROLS
 */

  pushControls() {
    const btnDelete   = { type: 'button',
                          text: 'Delete',
                          rollOver: 'Delete selected track',
                          clickFunction: this.pathDelete.bind(this),
                          isEnabled: true};
    const btnLoad     = { type: 'button',
                          text: 'Import',
                          rollOver: 'Add more tracks',
                          clickFunction: this.pathLoad.bind(this),
                          isEnabled: true};
    const btnCreate   = { type: 'button',
                          text: 'Create',
                          rollOver: 'Create a new route',
                          clickFunction: this.createNew.bind(this),
                          isEnabled: false};
    const btnZoom     = { type: 'button',
                          text: 'Zoom In',
                          rollOver: 'Zoom in on selected track',
                          clickFunction: this.zoomIn.bind(this),
                          isEnabled: false};
    const btnFit      = { type: 'button',
                          text: 'Fit All',
                          rollOver: 'Fit all tracks on screen',
                          clickFunction: this.fitAll.bind(this),
                          isEnabled: false};
    const btnBatch    = { type: 'button',
                          text: 'Batch',
                          rollOver: 'Load a batch of tracks',
                          clickFunction: this.batchLoad.bind(this),
                          isEnabled: true};
    const btnSave     = { type: 'button',
                          text: 'Save',
                          rollOver: 'Save selected track',
                          clickFunction: this.pathSave.bind(this),
                          isEnabled: true};
    const btnDiscard  = { type: 'button',
                          text: 'Discard',
                          rollOver: 'Discard selected track',
                          clickFunction: this.pathDiscard.bind(this),
                          isEnabled: true};
    const radioBtns   = { type: 'radio',
                          btns:
                            [ { text: 'Route',
                                rollOver: 'Show route',
                                isChecked: true,
                                isEnabled: true },
                              { text: 'Binary',
                                rollOver: 'Show binary plot',
                                isChecked: false,
                                isEnabled: false },
                              { text: 'Contour',
                                rollOver: 'Show contour plot',
                                isChecked: false,
                                isEnabled: false }
                            ],
                          clickFunction: this.radioClick.bind(this)
                        };
    const cbTracks    = { type: 'check',
                          text: 'Tracks',
                          rollOver: 'Show tracks plot',
                          clickFunction: this.cbShowTracks.bind(this),
                          isEnabled: false,
                          isChecked: false};

    const ctrlsTopLeft = [];
    const ctrlsMiddleLeft = [];

    if ( this.isReviewPage ) {

      // review page btns
      ctrlsTopLeft.push(btnSave, btnDiscard);

    } else {

      // not a review page
      if ( this.pathType === 'route') {
        ctrlsTopLeft.push(btnDelete, btnLoad, btnCreate, btnZoom, btnFit);
        ctrlsMiddleLeft.push(radioBtns, cbTracks);
      } else
      if ( this.pathType === 'track') {
        ctrlsTopLeft.push(btnDelete, btnLoad, btnBatch, btnZoom, btnFit);
      }
    }

    this.createControls(ctrlsTopLeft, 'LEFT_TOP');
    this.createControls(ctrlsMiddleLeft, 'LEFT_CENTER');
  }

  createControls(ctrls, position) {

    const that = this;
    const masterDiv = document.createElement('div');

    ctrls.forEach( (thisCtrl) => {

      // apply div formatting - this is the same regardless of control type
      const outerDiv = document.createElement('div');
      this.outerDivFormat(outerDiv, thisCtrl);
      masterDiv.appendChild(outerDiv);

      // then do some stuff depending on which ctrl we have
      if ( thisCtrl.type === 'button') {

        const innerDiv = document.createElement('div');
        this.innerDivFormat(innerDiv, thisCtrl);
        outerDiv.appendChild(innerDiv);

        // attach button listeners
        if ( thisCtrl.isEnabled ) {
          console.log(that);
          innerDiv.addEventListener('click', thisCtrl.clickFunction);
          innerDiv.addEventListener('mouseover', () => { innerDiv.style.backgroundColor = that.btnLooks.bgHover; });
          innerDiv.addEventListener('mouseout', () => { innerDiv.style.backgroundColor = that.btnLooks.bgEnabled; });
        }
        // innerDiv.addEventListener('mouseover', () => {
        //   if ( thisCtrl.isEnabled ) {
        //     innerDiv.style.backgroundColor = that.btnLooks.bgHover;
        //   }
        // });
        // innerDiv.addEventListener('mouseout', () => {
        //   if ( thisCtrl.isEnabled ) {
        //     innerDiv.style.backgroundColor = that.btnLooks.bgEnabled;
        //   }
        // });

      } else

      // deal with radio btns
      if ( thisCtrl.type === 'radio') {

        thisCtrl.btns.forEach( ( radio ) => {

          const innerDiv = document.createElement('div');
          const inputDiv = document.createElement('input');

          this.innerDivFormat(innerDiv, radio);
          this.radioFormat(inputDiv, radio);

          outerDiv.appendChild(innerDiv);
          innerDiv.appendChild(inputDiv);

          inputDiv.addEventListener('click', thisCtrl.clickFunction);

        }

      );


        // const inputDiv = document.createElement('input');
        // this.radioFormat(inputDiv, thisCtrl);
        // innerDiv.appendChild(inputDiv);
        // outerDiv.addEventListener('click', thisCtrl.clickFunction);

      } else

      // deal with checkboxes
      if ( thisCtrl.type === 'check' ) {

        const innerDiv = document.createElement('div');
        const inputDiv = document.createElement('input');

        this.innerDivFormat(innerDiv, thisCtrl);
        this.cbFormat(inputDiv, thisCtrl);

        outerDiv.appendChild(innerDiv);
        innerDiv.appendChild(inputDiv);

        inputDiv.addEventListener('click', thisCtrl.clickFunction);

      }

    });

    this.map.controls[google.maps.ControlPosition[position]].push(masterDiv);

  }

  outerDivFormat(div, def) {
    div.style.opacity = '0.8';
    div.style.width = '70px';
    div.style.cursor = 'pointer';
    div.style.marginTop = '2px';
    div.style.textAlign = 'center';
    div.style.marginLeft = '2px';
    div.style.border = '#808080 1px solid';
  }

  innerDivFormat(div, def) {
    div.setAttribute('isEnabled', def.isEnabled);
    div.id = def.text;
    div.style.backgroundColor = def.isEnabled ? this.btnLooks.bgEnabled : this.btnLooks.bgDisabled;
    div.style.color = def.isEnabled ? this.btnLooks.txtEnabled : this.btnLooks.txtDisabled;
    div.style.fontFamily = 'Roboto,Arial,sans-serif';
    div.style.fontSize = '12px';
    div.style.lineHeight = '25px';
    div.style.paddingLeft = '5px';
    div.style.paddingRight = '5px';
    div.innerHTML = def.text;
  }

  cbFormat(cb, def) {
    cb.type = 'checkbox';
    cb.id = 'input' + def.text;
    cb.disabled = !def.isEnabled;
    cb.checked = def.isChecked;
    cb.style.paddingLeft = '5px';
    cb.style.paddingRight = '5px';
  }

  radioFormat(cb, def) {
    cb.type = 'radio';
    cb.name = 'radioGroup';
    cb.id = 'input' + def.text;
    cb.disabled = !def.isEnabled;
    cb.checked = def.isChecked;
    cb.style.paddingLeft = '5px';
    cb.style.paddingRight = '5px';
  }

/**
 * DEFINE BUTTON CLICK FUNCTIONS
 */

  setInputEnabled(div) {

    if ( !div ) { return false; }

    const cb = <HTMLInputElement>document.getElementById('input' + div.id);
    cb.disabled = false;
    div.style.backgroundColor =  '#e0e0e0';
    div.style.color = 'black';
    clearInterval(this.timer);

  }

  setInputDisabled(div) {

    if ( !div ) { return false; }

    const cb = <HTMLInputElement>document.getElementById('input' + div.id);
    cb.disabled = false;
    div.style.backgroundColor =  '#e0e0e0';
    div.style.color = 'black';
    clearInterval(this.timer);

  }

  cbShowTracks () {
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
      // this.path.features[0].geometry.coordinates.forEach( (c) => {
      //   const circle = new google.maps.Circle({
      //     strokeColor: '#FF0000',
      //     strokeOpacity: 0.8,
      //     strokeWeight: 2,
      //     fillOpacity: 0,
      //     map: this.map,
      //     center: {'lat': c[1], 'lng': c[0]},
      //     radius: 20
      //   });
      // });

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

    const r = <HTMLInputElement>document.getElementById('inputRoute');
    const b = <HTMLInputElement>document.getElementById('inputBinary');
    const c = <HTMLInputElement>document.getElementById('inputContour');

    if ( r.checked ) {
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

  pathLoad() {
    console.log('click load');
    this.router.navigate(['load-paths', this.pathType, 'single']);
  }

  batchLoad () {
    console.log('click batch load');
    this.router.navigate(['load-paths', this.pathType, 'batch']);
  }

  pathDelete() {
    this.httpService.deletePath(this.pathType, this.pathID)
      .subscribe( () => {
        this.router.navigate(['paths', this.pathType]);
      });
  }

  zoomIn() {
    console.log('click zoom');
     // needs reviewing:
    // for (const path of this.pathAsGeoJson.features) {
    //   if (path.properties.isClicked) {
    //     this.map.fitBounds({
    //         north: path.bbox[3],
    //         south: path.bbox[1],
    //         east:  path.bbox[2],
    //         west:  path.bbox[0]
    //     });
    //   }
    // }
  }

  fitAll() {
    console.log('click fit');
    // needs reviewing:
    // this.map.fitBounds({
    //   north: this.pathAsGeoJson.bbox[3],
    //   south: this.pathAsGeoJson.bbox[1],
    //   east:  this.pathAsGeoJson.bbox[2],
    //   west:  this.pathAsGeoJson.bbox[0]
    // });
  }

  createNew () {
    console.log('create new');
    this.router.navigate(['create-route']);
  }

  pathSave() {
    console.log('click save');
    this.openForm();
  }

  pathDiscard() {
    console.log('click discard');
    this.router.navigate(['paths', this.pathType]);
  }

/**
 * ON SAVE FORM
 */

 showGetFilesUI() {

 }

  openForm() {
    this.pathName = this.path.features[0].name;
    if ( !this.description ) {
      this.description = 'Say something fab about your activity...';
    } else {
      this.description = this.path.features[0].name;
    }
    document.getElementById('myForm').style.display = 'block';
  }

  onCancel() {
    document.getElementById('myForm').style.display = 'none';
  }

  onSave() {

    const nameElement: HTMLInputElement = document.getElementById('name') as HTMLInputElement;
    const descElement: HTMLInputElement = document.getElementById('description') as HTMLInputElement;
    const payload = {};

    document.getElementById('myForm').style.display = 'none';

    // Only return data to the backend if it has changed
    if ( nameElement.value !== this.pathName ) {
      payload['newName'] = nameElement.value;
    }
    if ( descElement.value !== this.description ) {
      payload['newDesc'] = descElement.value;
    }

    if ( this.pathType === 'route' ) {
      // Return changed values to backend and set saved flag to true
      this.subsActive = true;
      this.setInputDisabled(<HTMLElement>document.getElementById('Tracks'));
      this.setInputDisabled(<HTMLElement>document.getElementById('Binary'));
      this.setInputDisabled(<HTMLElement>document.getElementById('Contour'));
      this.httpService.matchFromLoad(this.pathID)
        .subscribe( (dataIn) => {
          this.processMatchData(dataIn);
      });
    }

    this.httpService.savePath(this.pathType, this.pathID, payload)
      .subscribe( () => {
        this.router.navigate(['paths', this.pathType, this.pathID]);
      });

  }

processMatchData(d) {
  // called by onSave() and ngInit()
  // sorts incoming data and enables buttons

  this.binary = d['geoBinary'];
  this.contour = d['geoContour'];
  this.tracks = d['geoTracks'];
  // this.match = d['geoMatch'];

  this.subsActive = false;

  console.log(this.binary);
  console.log(this.tracks);
  console.log(this.contour);
  // console.log(this.match);

  this.timer = setInterval( () => {
    this.setInputEnabled(<HTMLElement>document.getElementById('Tracks'));
    this.setInputEnabled(<HTMLElement>document.getElementById('Binary'));
    this.setInputEnabled(<HTMLElement>document.getElementById('Contour'));
  }, 200);

  // emit data to data component
  if ( this.pathID !== '0' ) {
    this.dataService.fromMapToData.emit({
      'stats': this.binary.stats,
    });
  }

}

/**
 * DATA TRANSFER
 */

  getDataPackage(source) {
    try {
      return {
        'stats': source.properties.pathStats,
        'name': source.name,
        'description': source.description,
        'color': source.properties.color
      };
    } catch {
      return {
        'stats': source.getProperty('pathStats'),
        'name': source.getProperty('name'),
        'description': source.getProperty('description'),
        'color': source.getProperty('color')
      };
    }
  }







/**
 *CLEAR UP
 */

  ngOnDestroy() {
    console.log('unsubscribe from paramSubs and myService');
    this.paramSubs.unsubscribe();
    if ( typeof this.myService !== 'undefined' ) {
      this.myService.unsubscribe();
    }
  }

} // export class

