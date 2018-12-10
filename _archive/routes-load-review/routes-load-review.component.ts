import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { componentNeedsResolution } from '@angular/core/src/metadata/resource_loading';
import { createInjectable } from '@angular/compiler/src/core';
import { getHostElement } from '@angular/core/src/render3';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../../../data.service';
// import { MapService } from '../../../data.service';
// import { UpdateListService } from '../../../data.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-routes-load-review',
  templateUrl: './routes-load-review.component.html',
  styleUrls: ['./routes-load-review.component.css']
})

export class RoutesLoadReviewComponent implements OnInit, OnDestroy {

  private map: google.maps.Map;
  private myService: any;
  httpClient: any;
  private pathType: String;
  private pathID: String;
  private path: any;
  private pathName: String;
  private description: String;

  constructor(
    private http: HttpClient,
    private router: Router,
    private dataService: DataService,
    // private mapService: MapService,
    // private updateListService: UpdateListService,
    private activatedRouter: ActivatedRoute,
    ) {}

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

    // document.getElementById('myForm').style.display = 'none';

    // Only return data to the backend if it has changed
    if ( nameElement.value !== this.pathName ) {
      payload['newName'] = nameElement.value;
    }
    if ( descElement.value !== this.description ) {
      payload['newDesc'] = descElement.value;
    }
    console.log(payload);

    // Return changed values to backend and set saved flag to true
    this.http.post('http://localhost:3000/save-path/' + this.pathType + '/' + this.pathID, payload)
      .subscribe( () => {
        // this.dataService.gotNewData.emit({
        //   'geoJson': this.pathAsGeoJson,
        //   'mongoID': this.pathID});
        // this.updateListService.hasListChanged.emit(false);
        this.router.navigate(['paths', this.pathType, this.pathID]);
      });

    // using update service means list is refreshed by there is a double take when the save button is pressed
    // this.router.navigate(['routes', this.pathType, this.pathID]);

  }

  ngOnInit() {

    this.activatedRouter.params.subscribe(params => {
      this.pathType = params.type;
    });

    const that = this;

    this.myService = this.dataService.gotNewData.
      subscribe((receivedData) => {

        this.path = receivedData.geoJson;
        console.log(this.path);

        this.pathID = receivedData.mongoID;
        console.log(this.pathID);

      /**
       *
       * Create the basic map
       *
       */

      const map = new google.maps.Map(document.getElementById('map'), {
        mapTypeId: google.maps.MapTypeId.TERRAIN,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        mapTypeControlOptions: {
          mapTypeIds: ['terrain']
        }
      });

      // if (this.pathAsGeoJson.features.length !== 0) {
        map.data.addGeoJson(this.path.features[0]);

      // }

      map.data.setStyle(function(feature) {
        return ({
          clickable: true,
          strokeColor: feature.getProperty('color'),
          strokeWeight: 3,
          strokeOpacity: 0.6
        });
      });
      map.fitBounds({
        north: this.path.bbox[3],
        south: this.path.bbox[1],
        east:  this.path.bbox[2],
        west:  this.path.bbox[0]
      });

      // Set all paths to unclicked
      this.path.features.map(x => x.properties.isClicked = false);

      /**
       *
       * Define custom controls
       *
       */

      const btnDefinition = [

        { text: 'Save',
          rollOver: 'Save selected track',
          clickFunction: pathSave,
          isEnabled: false},
          { text: 'Discard',
          rollOver: 'Discard selected track',
          clickFunction: pathDiscard,
          isEnabled: false},
      ];


      const controlDiv = document.createElement('div');
      for (const thisBtn of btnDefinition) {
        createButton(controlDiv, thisBtn);
      }

      map.controls[google.maps.ControlPosition.LEFT_TOP].push(controlDiv);


      function createButton(div, btn) {

        // Set CSS for the control border
        const controlUI = document.createElement('div');
        if (btn.isEnabled) {
          controlUI.style.backgroundColor = '#fff';
        } else {
          controlUI.style.backgroundColor = 'rgb(235, 235, 235)';
        }
        controlUI.style.opacity = '0.8';
        controlUI.style.width = '100px';
        controlUI.style.cursor = 'pointer';
        controlUI.style.marginBottom = '1px';
        controlUI.style.textAlign = 'center';
        controlUI.title = btn.rollOver;
        div.appendChild(controlUI);

        // Set CSS for the control interior
        const controlText = document.createElement('div');
        controlText.setAttribute('isEnabled', btn.isEnabled);
        controlText.id = btn.text;
        controlText.style.color = 'black';
        controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
        controlText.style.fontSize = '12px';
        controlText.style.lineHeight = '25px';
        controlText.style.paddingLeft = '5px';
        controlText.style.paddingRight = '5px';
        controlText.innerHTML = btn.text;

        controlUI.appendChild(controlText);

        controlUI.addEventListener('click', btn.clickFunction);
        controlUI.addEventListener('mouseover', function() {
          controlUI.style.backgroundColor = 'rgb(235, 235, 235)';
          controlUI.style.opacity = '0.8';
        });
        controlUI.addEventListener('mouseout', function() {
          controlUI.style.backgroundColor = '#fff';
          controlUI.style.opacity = '0.8';
        });
      }


      /**
       *
       * Add listeners
       *
       */

      function pathSave() {
        console.log('click save');
        // const btnID = document.getElementById('Save');

        that.openForm();

      }

      function pathDiscard() {
        console.log('click discard');
        that.router.navigate(['paths', that.pathType]);

      }

    } // subscribe callback

  );  // subscribe

  } // ngOnInit

  ngOnDestroy() {
    this.myService.unsubscribe();
  }

}



