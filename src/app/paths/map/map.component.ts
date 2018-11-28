import { Component, OnInit, OnDestroy } from '@angular/core';
import { MapService } from '../../data.service';
import { NgControlStatus } from '@angular/forms';
import { waitForMap } from '@angular/router/src/utils/collection';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { TryCatchStmt, BoundDirectivePropertyAst } from '@angular/compiler';
import { HttpClient, JsonpClientBackend } from '@angular/common/http';
import { DataService} from '../../data.service';
import { findLast } from '@angular/compiler/src/directive_resolver';
import { PromiseType } from 'protractor/built/plugins';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})

export class MapComponent implements OnInit, OnDestroy {

  public myService: any;
  public httpClient: any;
  public pathType: String;
  public pathID: String;
  public path: any;
  public paramSubs: any;
  public map: google.maps.Map;
  public pathName: String;
  public description: String;
  public routeDataId;
  public binary;
  public tracks;
  public isReviewPage: Boolean;
  public isMatchPage: Boolean;
  public contour;
  public subsActive: Boolean;
  public btnLooks = {
    'bgEnabled': '#e0e0e0',
    'bgDisabled': '#c0c0c0',
    'bgHover': '#ffffff',
    'txtEnabled': '#000000',
    'txtDisabled': '#808080'
  };
  public timer;

  constructor(
    private http: HttpClient,
    private dataService: DataService,
    private mapService: MapService,
    private router: Router,
    private activatedRouter: ActivatedRoute
    ) {}

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

          let httpString;
          httpString = 'http://localhost:3000/get-path-by-id/' + this.pathType + '/' + this.pathID + '/false';

          this.http
              .get(httpString)
              .subscribe( (dataIn) => {
                this.path = dataIn['geoJson'];
                this.loadMap();
                document.documentElement.style.cursor = 'default';
              });

          if ( this.pathType === 'route' ) {
            // get route match data in the background
            if ( !this.subsActive ) {
              console.log('match from db');
              this.http
                .get('http://localhost:3000/match-from-db/' + this.pathID)
                .subscribe( (dataIn) => {
                  this.binary = dataIn['geoBinary'];
                  this.contour = dataIn['geoContour'];
                  this.tracks = dataIn['geoTracks'];
                  console.log(this.binary);
                  console.log(this.tracks);
                  console.log(this.contour);

                  // timer calls setInputEnabled at intervals until elemntns are defined - in case
                  // this is happening too quick for the DOM
                  this.timer = setInterval( () => {
                    this.setInputEnabled(<HTMLElement>document.getElementById('Tracks'));
                    this.setInputEnabled(<HTMLElement>document.getElementById('Binary'));
                    this.setInputEnabled(<HTMLElement>document.getElementById('Contour'));
                  }, 200);

                });
            }
          }



        } else {
        // this is review page

          this.myService = this.dataService.gotNewData.
            subscribe( (dataIn) => {
              this.path = dataIn['geoJson'];
              this.pathID = this.path.features[0]._id;
              this.loadMap();
              document.documentElement.style.cursor = 'default';
            });
        }

      }

    });

  } // ngOnInit

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

  loadMap() {

    console.log(this.path);

    // launch map
    const that = this;
    const mapService = this.mapService;
    this.map = new google.maps.Map(document.getElementById('map'), {
      mapTypeId: google.maps.MapTypeId.TERRAIN,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      mapTypeControlOptions: {
        mapTypeIds: ['terrain']
      }
    });

    if ( typeof this.path.features[0] !== 'undefined' ) {
      that.path.features[0]['id'] = 'route';
      that.map.data.addGeoJson(that.path.features[0]);
    }


    this.map.data.setStyle(function(feature) {
      let props = {};
      const featureId = String(feature.getId());
      if ( featureId.indexOf('binary') !== -1) {
        props = {
          clickable: true,
          strokeColor: feature.getProperty('color'),
          strokeWeight: 3,
          strokeOpacity: 1.0
        };
      } else
      if ( featureId.indexOf('contour') !== -1) {
        props = {
          clickable: true,
          strokeColor: feature.getProperty('color'),
          strokeWeight: 5,
          strokeOpacity: 1.0
        };
      } else
      if ( featureId.indexOf('tracks') !== -1 ) {
        props = {
          clickable: true,
          strokeColor: feature.getProperty('color'),
          strokeWeight: 3,
          strokeOpacity: 0.4
        };
      } else
      if ( featureId.indexOf('route') !== -1 ) {
        props = {
          clickable: true,
          strokeColor: feature.getProperty('color'),
          strokeWeight: 3,
          strokeOpacity: 1.0
        };
      }

      return props;
    });


    this.map.fitBounds({
      north: this.path.bbox[3],
      south: this.path.bbox[1],
      east:  this.path.bbox[2],
      west:  this.path.bbox[0]
    });
    // Set all paths to unclicked
    this.path.features.map(x => x.properties.isClicked = false);





  /**
   *
   * Define embedded map controls
   *
   */


    const btnDelete   = { type: 'button',
                          text: 'Delete',
                          rollOver: 'Delete selected track',
                          clickFunction: pathDelete,
                          isEnabled: true};
    const btnLoad     = { type: 'button',
                          text: 'Import',
                          rollOver: 'Add more tracks',
                          clickFunction: pathLoad,
                          isEnabled: true};
    const btnCreate   = { type: 'button',
                          text: 'Create',
                          rollOver: 'Create a new route',
                          clickFunction: createNew,
                          isEnabled: false};
    const btnZoom     = { type: 'button',
                          text: 'Zoom In',
                          rollOver: 'Zoom in on selected track',
                          clickFunction: zoomIn,
                          isEnabled: false};
    const btnFit      = { type: 'button',
                          text: 'Fit All',
                          rollOver: 'Fit all tracks on screen',
                          clickFunction: fitAll,
                          isEnabled: false};

    const btnBatch    = { type: 'button',
                          text: 'Batch',
                          rollOver: 'Load a batch of tracks',
                          clickFunction: batchLoad,
                          isEnabled: true};
    const btnSave     = { type: 'button',
                          text: 'Save',
                          rollOver: 'Save selected track',
                          clickFunction: pathSave,
                          isEnabled: true};
    const btnDiscard  = { type: 'button',
                          text: 'Discard',
                          rollOver: 'Discard selected track',
                          clickFunction: pathDiscard,
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
                          clickFunction: radioClick
                        };
    const cbTracks    = { type: 'check',
                          text: 'Tracks',
                          rollOver: 'Show tracks plot',
                          clickFunction: cbShowTracks,
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

  /**
   *
   * Emit information to data component
   *
   */

    if ( this.pathID !== '0' ) {
      mapService.newMapData.emit(this.getDataPackage(this.path.features[0]));
    }


    function cbShowTracks () {
      const cb = <HTMLInputElement>document.getElementById('inputTracks');

      if ( cb.checked === true ) {
        that.tracks.features.forEach( (ftr, i) => {
          ftr.id = 'tracks' + i;
          that.map.data.addGeoJson(ftr);
        });
      } else {
        that.tracks.features.forEach( (ftr, i) => {
          that.map.data.remove(that.map.data.getFeatureById('tracks' + i));
        });
      }
    }

    function radioClick() {

      const r = <HTMLInputElement>document.getElementById('inputRoute');
      const b = <HTMLInputElement>document.getElementById('inputBinary');
      const c = <HTMLInputElement>document.getElementById('inputContour');

      if ( r.checked ) {
        // remove data
        try {
          that.binary.features.forEach( (ftr, i) => {
            that.map.data.remove(that.map.data.getFeatureById('binary' + i));
          });
        } catch {}
        try {
          that.contour.features.forEach( (ftr, i) => {
            that.map.data.remove(that.map.data.getFeatureById('contour' + i));
          });
        } catch {}
        // add route
        that.path.features[0]['id'] = 'route';
        that.map.data.addGeoJson(that.path.features[0]);
      } else

      if ( b.checked ) {
        // remove data
        try {
          that.map.data.remove(that.map.data.getFeatureById('route'));
        } catch {}
        try {
          that.contour.features.forEach( (ftr, i) => {
            that.map.data.remove(that.map.data.getFeatureById('contour' + i));
          });
        } catch {}
        // add binary
        that.binary.features.forEach( (ftr, i) => {
          ftr.id = 'binary' + i;
          that.map.data.addGeoJson(ftr);
        });
      } else

      if ( c.checked ) {
        // remove data
        try {
          that.map.data.remove(that.map.data.getFeatureById('route'));
        } catch {}
        try {
          that.binary.features.forEach( (ftr, i) => {
            that.map.data.remove(that.map.data.getFeatureById('binary' + i));
          });
        } catch {}
        // add contour
        that.contour.features.forEach( (ftr, i) => {
          ftr.id = 'contour' + i;
          that.map.data.addGeoJson(ftr);
        });
      }
    }

    // function cbShowRoute() {
    //   const cb = <HTMLInputElement>document.getElementById('cbRoute');

    //   if ( cb.checked === true ) {
    //     that.path.features[0]['id'] = 'route';
    //     that.map.data.addGeoJson(that.path.features[0]);
    //   } else {
    //     that.map.data.remove(that.map.data.getFeatureById('route'));
    //   }
    // }

    // function cbShowBinary() {
    //   const cb = <HTMLInputElement>document.getElementById('cbBinary');

    //   if ( cb.checked === true ) {
    //     that.binary.features.forEach( (ftr, i) => {
    //       ftr.id = 'binary' + i;
    //       that.map.data.addGeoJson(ftr);
    //     });
    //   } else {
    //     that.binary.features.forEach( (ftr, i) => {
    //       that.map.data.remove(that.map.data.getFeatureById('binary' + i));
    //     });
    //   }
    // }

    // function cbShowContour() {
    //   const cb = <HTMLInputElement>document.getElementById('cbContour');

    //   if ( cb.checked === true ) {
    //     that.contour.features.forEach( (ftr, i) => {
    //       ftr.id = 'contour' + i;
    //       that.map.data.addGeoJson(ftr);
    //     });
    //   } else {
    //     that.contour.features.forEach( (ftr, i) => {
    //       that.map.data.remove(that.map.data.getFeatureById('contour' + i));
    //     });
    //   }
    // }

  /**
   *
   * Button functions
   *
   */

    function pathLoad() {
      console.log('click load');
      that.router.navigate(['load-paths', that.pathType, 'single']);
    }

    function batchLoad () {
      console.log('click batch load');
      that.router.navigate(['load-paths', that.pathType, 'batch']);
    }

    function pathDelete() {
      console.log('click delete');
      that.http.get('http://localhost:3000/delete-path/' + that.pathType + '/' + that.pathID)
        .subscribe( () => {
          // that.updateListService.hasListChanged.emit(true);
          that.router.navigate(['paths', that.pathType]);
        });
    }

    function zoomIn() {
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

    function fitAll() {
      console.log('click fit');
      // needs reviewing:
      // this.map.fitBounds({
      //   north: this.pathAsGeoJson.bbox[3],
      //   south: this.pathAsGeoJson.bbox[1],
      //   east:  this.pathAsGeoJson.bbox[2],
      //   west:  this.pathAsGeoJson.bbox[0]
      // });
    }

    function createNew () {
      console.log('create new');
      that.router.navigate(['create-route']);
    }

    // function matchTracks () {
    //   console.log('match tracks');
    //   console.log(that.pathType);
    //   console.log(that.pathID);
    //   that.router.navigate(['paths', that.pathType,  that.pathID, 'match']);
    // }

    function pathSave() {
      console.log('click save');
      that.openForm();
    }

    function pathDiscard() {
      console.log('click discard');
      that.router.navigate(['paths', that.pathType]);
    }
  } // loadMap()

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

    // const controlDiv = document.createElement('div');
    // const checkBoxDiv = document.createElement('div');

    // r.forEach( (thisBtn) => {

    //   // create div elements
    //   const outerDiv = document.createElement('div');
    //   const innerDiv = document.createElement('div');
    //   const inputDiv = document.createElement('input');

    //   // apply formatting
    //   this.outerDivFormat(outerDiv, thisBtn);
    //   this.innerDivFormat(innerDiv, thisBtn);

    //   // join
    //   controlDiv.appendChild(outerDiv);
    //   outerDiv.appendChild(innerDiv);

    //   // Attach listeners
    //   innerDiv.addEventListener('click', thisBtn.clickFunction);
    //   innerDiv.addEventListener('mouseover', function() {
    //     if ( thisBtn.isEnabled ) {
    //       innerDiv.style.backgroundColor = that.btnLooks.bgHover;
    //     }
    //   });
    //   innerDiv.addEventListener('mouseout', function() {
    //     if ( thisBtn.isEnabled ) {
    //       innerDiv.style.backgroundColor = that.btnLooks.bgEnabled;
    //     }
    //     // innerDiv.style.opacity = '0.8';
    //   });

    // }); // forEach

    // cbs.forEach( (thisBox) => {

    //   // create div elements
    //   const outerDiv = document.createElement('div');
    //   const innerDiv = document.createElement('div');
    //   const checkBox = document.createElement('input');
    //   const radioBoxGroup = document.createElement('input');

    //   // apply formatting
    //   this.outerDivFormat(outerDiv, thisBox);
    //   this.innerDivFormat(innerDiv, thisBox);
    //   this.cbFormat(checkBox, thisBox);
    //   this.radioFormat(checkBox, thisBox);

    //   // join
    //   checkBoxDiv.appendChild(outerDiv);
    //   outerDiv.appendChild(innerDiv);
    //   innerDiv.appendChild(checkBox);

    //   // console.log(checkBox.nodeName);



    // });




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
  // formatOuter(div, ctrl) {

  //   const outerDiv = document.createElement('div');
  //   const innerDiv = document.createElement('div');
  //   const checkBox = document.createElement('input');

  //   outerDiv.style.backgroundColor = ctrl.isEnabled ? '#fff' : 'rgb(235, 235, 235)';
  //   outerDiv.style.opacity = '0.8';
  //   outerDiv.style.width = '100px';
  //   outerDiv.style.cursor = 'pointer';
  //   outerDiv.style.marginBottom = '1px';
  //   outerDiv.style.textAlign = 'center';

  //   innerDiv.setAttribute('isEnabled', ctrl.isEnabled);
  //   innerDiv.id = ctrl.text;
  //   innerDiv.style.color = 'black';
  //   innerDiv.style.fontFamily = 'Roboto,Arial,sans-serif';
  //   innerDiv.style.fontSize = '12px';
  //   innerDiv.style.lineHeight = '25px';
  //   innerDiv.style.paddingLeft = '5px';
  //   innerDiv.style.paddingRight = '5px';
  //   innerDiv.innerHTML = ctrl.text;

  //   div.appendChild(outerDiv);
  //   outerDiv.appendChild(innerDiv);
  //   innerDiv.appendChild(checkBox);

  //   // innerDiv.style.textAlign = 'left';

  //   checkBox.type = 'checkBox';
  //   checkBox.style.paddingLeft = '5px';
  //   checkBox.style.paddingRight = '5px';


  // }


  // createButtons(div, btn) {

  //   const outerDiv = document.createElement('div');
  //   const innerDiv = document.createElement('div');

  //   // Set CSS for the control border
  //   outerDiv.style.backgroundColor = btn.isEnabled ? '#fff' : 'rgb(235, 235, 235)';
  //   outerDiv.style.opacity = '0.8';
  //   outerDiv.style.width = '100px';
  //   outerDiv.style.cursor = 'pointer';
  //   outerDiv.style.marginBottom = '1px';
  //   outerDiv.style.textAlign = 'center';
  //   outerDiv.title = btn.rollOver;

  //   // Set CSS for the control interior
  //   innerDiv.setAttribute('isEnabled', btn.isEnabled);
  //   innerDiv.id = btn.text;
  //   innerDiv.style.color = 'black';
  //   innerDiv.style.fontFamily = 'Roboto,Arial,sans-serif';
  //   innerDiv.style.fontSize = '12px';
  //   innerDiv.style.lineHeight = '25px';
  //   innerDiv.style.paddingLeft = '5px';
  //   innerDiv.style.paddingRight = '5px';
  //   innerDiv.innerHTML = btn.text;

  //   // append divs
  //   div.appendChild(outerDiv);
  //   outerDiv.appendChild(innerDiv);

  //   // Attach listeners
  //   outerDiv.addEventListener('click', btn.clickFunction);
  //   outerDiv.addEventListener('mouseover', function() {
  //     outerDiv.style.backgroundColor = 'rgb(235, 235, 235)';
  //     outerDiv.style.opacity = '0.8';
  //   });
  //   outerDiv.addEventListener('mouseout', function() {
  //     outerDiv.style.backgroundColor = '#fff';
  //     outerDiv.style.opacity = '0.8';
  //   });

  // } // createButtons

  // attachListeners() {


  //   const mapData = this.map.data;
  //   let clickedPathData;

  //   if ( this.pathAsGeoJson.features.length === 1 ) {
  //     // only one path is selected, so emit this data. Simples.
  //     mapService.newMapData.emit(
  //       this.getDataPackage(this.pathAsGeoJson.features[0]));

  //   } else {

  //     clickedPathData = {'empty': true};

  //     mapData.addListener('mouseover', (event) => {
  //       mapData.overrideStyle(event.feature, {strokeOpacity: 1.0, strokeWeight: 5});
  //       mapService.newMapData.emit(this.getDataPackage(event.feature));
  //     });

  //     mapData.addListener('mouseout', (event) => {
  //       if (!event.feature.getProperty('isClicked')) {
  //         mapData.revertStyle(event.feature);
  //         mapService.newMapData.emit(clickedPathData);
  //       }
  //     });

  //     mapData.addListener('click', (event) => {
  //       if (event.feature.getProperty('isClicked')) {
  //         event.feature.setProperty('isClicked', false);
  //         clickedPathData = {'empty': true};
  //       } else {
  //         this.pathAsGeoJson.features.map(x => x.properties.isClicked = false);
  //         event.feature.setProperty('isClicked', true);
  //         clickedPathData = this.getDataPackage(event.feature);
  //         mapData.revertStyle();
  //         mapData.overrideStyle(event.feature, {strokeOpacity: 1.0, strokeWeight: 5});
  //       }

  //       // if any of the paths are clicked
  //       // setBtnState();
  //     });
  //   }
  // }

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
      // console.log('match-from-load');
      this.subsActive = true;
      this.setInputDisabled(<HTMLElement>document.getElementById('Tracks'));
      this.setInputDisabled(<HTMLElement>document.getElementById('Binary'));
      this.setInputDisabled(<HTMLElement>document.getElementById('Contour'));
      this.http
        .get('http://localhost:3000/match-from-load/' + this.pathID)
        .subscribe( (dataIn) => {
          this.binary = dataIn['geoBinary'];
          this.contour = dataIn['geoContour'];
          this.tracks = dataIn['geoTracks'];
          this.subsActive = false;
          console.log(this.binary);
          console.log(this.tracks);
          console.log(this.contour);
          this.setInputEnabled(<HTMLElement>document.getElementById('Tracks'));
          this.setInputEnabled(<HTMLElement>document.getElementById('Binary'));
          this.setInputEnabled(<HTMLElement>document.getElementById('Contour'));
      });
    }

    // console.log('save-path ' + this.pathType + ', ' + this.pathID);
    this.http.post('http://localhost:3000/save-path/' + this.pathType + '/' + this.pathID, payload)
      .subscribe( () => {
        this.router.navigate(['paths', this.pathType, this.pathID]);
      });

    // using update service means list is refreshed by there is a double take when the save button is pressed
    // this.router.navigate(['routes', this.pathType, this.pathID]);

  }

  getDataPackage(source) {
    try {
      return {
        'stats': source.properties.pathStats,
        'name': source.properties.name,
        'color': source.properties.color
      };
    } catch {
      return {
        'stats': source.getProperty('pathStats'),
        'name': source.getProperty('name'),
        'color': source.getProperty('color')
      };
    }
  }

  // setBtnState() {

  //   if (this.pathAsGeoJson.features
  //     .map(x => x.properties.isClicked)
  //     .find(function(y) {return y === true; }) === true) {

  //     const btnIDs = [
  //       document.getElementById('Zoom In'),
  //       document.getElementById('Load'),
  //       document.getElementById('Save'),
  //       document.getElementById('Delete')];

  //     for (const btn of btnIDs) {
  //       btn['isEnabled'] = true;
  //       this.setBtnEnabled(btn, true);
  //     }

  //   } else {

  //     const btnIDs = [
  //       document.getElementById('Zoom In'),
  //       document.getElementById('Load'),
  //       document.getElementById('Save'),
  //       document.getElementById('Delete')];

  //     // console.log(btnIDs);
  //     for (const btn of btnIDs) {
  //       btn['isEnabled'] = false;
  //       setBtnEnabled(btn, false);
  //     }
  //   }

  // }


  // setBtnEnabled(btn, boo) {
  //   if (boo === true) {
  //     btn.style.backgroundColor = '#fff';
  //   } else {
  //     btn.style.backgroundColor = 'rgb(235, 235, 235)';
  //   }
  //   btn.style.fontSize = '12px';
  //   btn.style.lineHeight = '25px';
  //   btn.style.paddingLeft = '5px';
  //   btn.style.paddingRight = '5px';
  // }

  ngOnDestroy() {
    console.log('unsubscribe');
    this.paramSubs.unsubscribe();
    if ( typeof this.myService !== 'undefined' ) {
      this.myService.unsubscribe();
    }
  }

} // export class

