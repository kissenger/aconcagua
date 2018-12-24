import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../../data.service';
import { HttpService } from '../../http.service';
import { GeoService } from '../../geo.service';
import { ButtonsService } from '../../buttons.service';
import { NgControlStatus } from '@angular/forms';
import { waitForMap } from '@angular/router/src/utils/collection';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TryCatchStmt, BoundDirectivePropertyAst } from '@angular/compiler';
import { findLast } from '@angular/compiler/src/directive_resolver';
import { PromiseType } from 'protractor/built/plugins';
import { mapChildrenIntoArray } from '@angular/router/src/url_tree';
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  encapsulation: ViewEncapsulation.None
})

export class MapComponent implements OnInit, OnDestroy {

  public myService: any;
  public paramSubs: any;
  public httpClient: any;
  public pathType: String;
  public pathId: String;
  public path: any;

  public map: google.maps.Map;
  public pathName: String;
  public description: String;
  public routeDataId;
  public poly: google.maps.Polyline;
  public pathHistory = [];
  public createdPath;

  public ctrls;

  public binary;
  public tracks;
  public contour;
  public match;
  public markers = [];
  public isSnapOn = true;

  // public isReviewPage: Boolean;
  // public isCreatePage: Boolean;
  public pageType: String;
  public subsActive: Boolean;

  public btnLooks = {
    'bgEnabled': '#e0e0e0',
    'bgDisabled': '#c0c0c0',
    'bgHover': '#ffffff',
    'txtEnabled': '#000000',
    'txtDisabled': '#808080'
  };
  public lineStyle = {
    'binary':  { 'clickable': false, 'strokeColor': null, 'strokeWeight': 5, 'strokeOpacity': 1.0 },
    'contour': { 'clickable': false, 'strokeColor': null, 'strokeWeight': 5, 'strokeOpacity': 1.0 },
    'route':   { 'clickable': false, 'strokeColor': null, 'strokeWeight': 3, 'strokeOpacity': 1.0 },
    'tracks':  { 'clickable': false, 'strokeColor': null, 'strokeWeight': 3, 'strokeOpacity': 0.4 }
  };
  public timer: NodeJS.Timer;


  constructor(
    private httpService: HttpService,
    private dataService: DataService,
    private geoService: GeoService,
    private buttonsService: ButtonsService,
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
      this.pathId = params.id;

      if ( params.id === '-1' ) {
        if ( typeof params.isCreate === 'undefined' ) {
          this.pageType = 'Review';
        }
      } else
      if ( params.isCreate === 'true' ) {
        this.pageType = 'Create';
      } else {
        this.pageType = 'Normal';
      }

      // Determine page type

      document.documentElement.style.cursor = 'wait';

      if ( typeof this.pathId !== 'undefined') {

        if ( this.pageType === 'Normal' || this.pageType === 'Create') {
          // this is NOT review page

            this.httpService.getPathById(this.pathType, this.pathId, false)
              .subscribe( (result) => {

                this.path = result.geoJson;
                if ( this.pathType === 'challenge' ) {
                  // only load matched data if this is a challenge

                  this.binary = result.geoBinary;
                  this.contour = result.geoContour;

                  this.httpService.getMatchedTracks(this.pathId).subscribe( (r) => {
                    this.processMatchData(r);
                  });

                }
                this.loadMap();
                document.documentElement.style.cursor = 'default';
            });

            // if ( this.pageType === 'Create') {
            //   // let data component know we need to have single column
            //   this.dataService.fromMapToData.emit({isCreatePage: true});
            // }

        } else if ( this.pageType === 'Review' ) {
        // this is review page

          this.path = this.dataService.getStoredNewPath();
          this.pathId = this.path.features[0].properties.pathId;

          this.loadMap();
          document.documentElement.style.cursor = 'default';
          // this.myService = this.dataService.fromLoadToMap.
          //   subscribe( (result) => {
          //     this.path = result['geoJson'];
          //     this.pathId = this.path.features[0].properties.pathId;
          //     this.loadMap();
          //     document.documentElement.style.cursor = 'default';
          // });

        }

      }

    });

  } // ngOnInit

  hello() {
    console.log('hello');
  }

  loadMap() {

    console.log(this.path);
    console.log(this.binary);
    console.log(this.contour);
    const that = this;
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
        {'featureType': 'road.local', 'stylers': [{'visibility': 'on'}]},
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
      },
      draggableCursor: this.pageType === 'Create' ? 'crosshair' : 'default'

    });

    // determine if data is available and act accordingly
    if ( this.pathId !== '0' ) {

      // const that = this;
      // plot route data
      this.path.features[0]['id'] = 'route-';
      this.map.data.addGeoJson(that.path.features[0]);

      // fit map bounds
      this.map.fitBounds({
        north: this.path.bbox[3],
        south: this.path.bbox[1],
        east:  this.path.bbox[2],
        west:  this.path.bbox[0]
      });

      // set all paths to unclicked
      // this.path.features.map(x => x.isClicked = false);

      // set style of plotted paths
      this.map.data.setStyle( (feature) => {

        const featureId = String(feature.getId());
        const featureType = featureId.substring(0, featureId.indexOf('-'));
        that.lineStyle[featureType]['strokeColor'] = feature.getProperty('color');
        if ( this.pageType === 'Create' ) {
          that.lineStyle[featureType]['strokeOpacity'] = 0.5;
        }
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
    if ( this.pathId !== '0' ) {

      const emitData = {
        path: this.path.features[0].properties,
        match: this.binary ? this.binary.stats : 0
      };

      this.dataService.fromMapToData.emit(emitData);
      this.dataService.storeData(emitData);

      /**
       *
       */
      if ( this.pageType === 'Create' ) {

        this.poly = new google.maps.Polyline({
          map: this.map,
          editable: false,
        });


        this.map.addListener('click', function(event) {

          that.createdPath = that.poly.getPath();

          if (that.createdPath.getLength() === 0) {
            // this is the first point, so put a marker on it

            that.createdPath.push(event.latLng);
            that.poly.setPath(that.createdPath);

            const startMarker = new google.maps.Marker({
              position: that.createdPath[0],
              map: that.map
            });

            const circle = new google.maps.Circle({
              strokeColor: '#FF0000',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillOpacity: 0,
              map: that.map,
              center: that.createdPath[0],
              radius: 20
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

  pathClear() {
    const createdPath = this.poly.getPath();

    createdPath.clear();
    this.pathHistory = [];
    // if (startMarker) {
    //   startMarker.setMap(null);
    //   startMarker = null;
    // }

  }

  pathUndo() {

    console.log('click undo');

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

  pathClose() {

    const firstPoint = this.createdPath.getAt(this.createdPath.getLength() - 1);
    const lastPoint = this.createdPath.getAt(0);
    this.geoService.snapToRoad(firstPoint, lastPoint).then( (np) => {
      np.map( (x) => this.createdPath.push(x) );
      this.pathHistory.push(np.length);
      this.dataService.fromCreateToDetail.emit(
        this.geoService.pathStats(this.createdPath)
      );
    });


  }

/**
 * DEFINE MAP CONTROLS
 */


  pushControls() {

    // get controls from button service
    this.ctrls = this.buttonsService.getMenuBtns(this.pageType, this.pathType);

    // add click functions into the buttons array
    this.ctrls.btns.forEach( b => { b.clickFunction = this[b.clickFunctionName].bind(this); });
    this.ctrls.checks.forEach( b => { b.clickFunction = this[b.clickFunctionName].bind(this); });
    this.ctrls.radios[0].forEach( b => {b.clickFunction = this[b.clickFunctionName].bind(this); });

    // create the menus and push to map
    this.createDropDownMenu(this.ctrls.btns, 'LEFT_TOP');
    this.createRadiosAndCheckBoxes(this.ctrls.checks, this.ctrls.radios[0], 'LEFT_BOTTOM');

  }

  createDropDownMenu(ctrls, position) {

    const that = this;
    const masterDiv = document.createElement('div');

    ctrls.forEach( (thisCtrl) => {

      // create outer div, apply formatting
      const outerDiv = document.createElement('div');
      const innerDiv = document.createElement('div');

      // set some attributes
      outerDiv.id = thisCtrl.id;
      if ( thisCtrl.id !== 0 ) {
        thisCtrl.isDisplayed = false;
        outerDiv.style.display = 'none';
      }

      // apply formatting
      if ( thisCtrl.id === 0 ) {
        this.outerDivFormatMenu(outerDiv, thisCtrl);
        this.innerDivFormatMenu(innerDiv, thisCtrl);
      } else {
        // this.outerDivFormat(outerDiv, thisCtrl);
        this.outerDivFormat(outerDiv, thisCtrl);
        this.innerDivFormat(innerDiv, thisCtrl);
      }

      // assemble
      masterDiv.appendChild(outerDiv);
      outerDiv.appendChild(innerDiv);

      // attach listeners
      if ( thisCtrl.isEnabled ) {
        innerDiv.addEventListener('click', thisCtrl.clickFunction);
        innerDiv.addEventListener('mouseover', () => { innerDiv.style.backgroundColor = that.btnLooks.bgHover; });
        innerDiv.addEventListener('mouseout', () => { innerDiv.style.backgroundColor = that.btnLooks.bgEnabled; });
      }

    });
    this.map.controls[google.maps.ControlPosition[position]].push(masterDiv);

  }

  btnMenuClick() {
    this.ctrls.btns.forEach( ctrl => {
      if ( ctrl.id !== 0 ) {
        // not menu button
        document.getElementById(ctrl.id).style.display = ctrl.isDisplayed ? 'none' : 'block';
        ctrl.isDisplayed = !ctrl.isDisplayed;
      }
    });
  }

  createRadiosAndCheckBoxes(cbs, rds, position) {

    const masterDiv = document.createElement('div');

    cbs.forEach( (checkbox) => {

      // apply div formatting - this is the same regardless of control type
      const outerDiv = document.createElement('div');
      const innerDiv = document.createElement('div');
      const inputDiv = document.createElement('input');

      this.outerDivFormat(outerDiv, checkbox);
      this.innerDivFormat(innerDiv, checkbox);
      this.cbFormat(inputDiv, checkbox);

      masterDiv.appendChild(outerDiv);
      outerDiv.appendChild(innerDiv);
      innerDiv.appendChild(inputDiv);

      inputDiv.addEventListener('click', checkbox.clickFunction);

    });

    rds.forEach( (radio) => {

      // apply div formatting - this is the same regardless of control type
      const outerDiv = document.createElement('div');
      const innerDiv = document.createElement('div');
      const inputDiv = document.createElement('input');

      this.outerDivFormat(outerDiv, radio);
      this.innerDivFormat(innerDiv, radio);
      this.radioFormat(inputDiv, radio);

      masterDiv.appendChild(outerDiv);
      outerDiv.appendChild(innerDiv);
      innerDiv.appendChild(inputDiv);

      inputDiv.addEventListener('click', radio.clickFunction);

    });

    this.map.controls[google.maps.ControlPosition[position]].push(masterDiv);

  }

  outerDivFormat(div, def) {
    div.style.opacity = '0.8';
    div.style.width = '150px';
    div.style.cursor = 'pointer';
    div.style.marginTop = '-1px';
    div.style.textAlign = 'left';
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

  outerDivFormatMenu(div, def) {
    div.style.opacity = '0.8';
    div.style.width = '50px';
    div.style.cursor = 'pointer';
    div.style.marginTop = '2px';
    div.style.marginBottom = '5px';
    div.style.textAlign = 'center';
    div.style.marginLeft = '2px';
    div.style.border = '#808080 1px solid';
  }

  innerDivFormatMenu(div, def) {
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

// /**
//  * DEFINE BUTTON CLICK FUNCTIONS
//  */

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

  cbShowMileMarkers() {
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
        // this.markers.push(new google.maps.Marker({
        //   position: {'lat': coord[1], 'lng': coord[0]},
        //   label: (i + 1).toString(),
        //   map: this.map
        // }) );
      });
    } else {

      this.markers.forEach( (m) => { m.setMap(null); });
    }

  }

  cbSnap () {

    const cb = <HTMLInputElement>document.getElementById('inputRoad Snap');

    console.log('click snap');
    if ( cb.checked === true ) {
      this.isSnapOn = true;
    } else {
      this.isSnapOn = false;
    }

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

  saveCreated () {

    // get polyline
    const p = this.poly.getPath();

    // test that path exists
    if ( p.getLength() === 0 ) {
      alert('Create some points before saving the route');
      return;
    }

    // convert to array, get path name and description and package up
    const c = p.getArray().map( (e) => (e.toString().replace(/[()]/g, '').split(', ')));
    const d = this.dataService.getCreateRouteData();
    d.geometry = {coordinates: c.map( (e) => [ parseFloat(e[1]), parseFloat(e[0]) ])};

    // send to the backend
    this.httpService.saveCreatedRoute(d).subscribe( (r) => {
      this.router.navigate(['paths', 'route', r.pathId]);
    });
  }

  pathLoad() {
    this.router.navigate(['load-paths', this.pathType, 'single']);
  }

  batchLoad () {
    this.router.navigate(['load-paths', this.pathType, 'batch']);
  }

  btnUseAsChall() {
    console.log(this.pathId);
    document.documentElement.style.cursor = 'wait';
    this.httpService.movePath(this.pathId, 'route', 'challenge').subscribe( (r) => {
      document.documentElement.style.cursor = 'default';
      this.router.navigate(['paths', 'challenge']);
    });
  }

  btnRemoveChall() {
    console.log('click');
    document.documentElement.style.cursor = 'wait';
    this.httpService.movePath(this.pathId, 'challenge', 'route').subscribe( (r) => {
      document.documentElement.style.cursor = 'default';
      this.router.navigate(['paths', 'route']);
    });
  }

  pathDelete() {
    this.httpService.deletePath(this.pathType, this.pathId).subscribe( () => {
        this.router.navigate(['paths', this.pathType]);
    });
  }

  zoomIn() {
     // needs reviewing:
    // for (const path of this.pathAsGeoJson.features) {
    //   if (path.isClicked) {
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
    // needs reviewing:
    // this.map.fitBounds({
    //   north: this.pathAsGeoJson.bbox[3],
    //   south: this.pathAsGeoJson.bbox[1],
    //   east:  this.pathAsGeoJson.bbox[2],
    //   west:  this.pathAsGeoJson.bbox[0]
    // });
  }

  createNew() {
    this.router.navigate(['paths', this.pathType, this.pathId, true]);
  }

  pathExport() {
    // send to the backend
    this.httpService.exportPath(this.pathType, this.pathId).subscribe( (r) => {
      alert('Operation complete');
    });
  }

  pathSave() {
    this.openForm();
  }

  pathDiscard() {
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

    this.httpService.savePath(this.pathType, this.pathId, payload).subscribe( (result) => {
      this.router.navigate(['paths', this.pathType, this.pathId]);
    });

  }

processMatchData(d) {

  this.tracks = d['geoTracks'];
  console.log(this.tracks);

  this.subsActive = false;
  this.timer = setInterval( () => {
    this.setInputEnabled(<HTMLElement>document.getElementById('Tracks'));
  }, 200);

}

// cancel() {
//   this.router.navigate(['paths', this.pathType, this.pathId]);
// }


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

