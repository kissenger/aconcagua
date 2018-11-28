import { Component, OnInit } from '@angular/core';
import { DataService } from '../../data.service';
import { MapService } from '../../data.service';
import { NgControlStatus } from '@angular/forms';
import { waitForMap } from '@angular/router/src/utils/collection';
import { Router } from '@angular/router';
import { TryCatchStmt } from '@angular/compiler';

@Component({
  selector: 'app-tracks-map',
  templateUrl: './tracks-map.component.html',
  styleUrls: ['./tracks-map.component.css']
})

export class TracksMapComponent implements OnInit {

  // public pathAsGeoJson;
  // public selectedPath;

  constructor(
    private dataService: DataService,
    private mapService: MapService,
    private router: Router
    ) {}

  // onLoadBtnClick() {
  //   this.router.navigate(['app-new-paths']);
  // }

  ngOnInit() {

  const that = this;

  this.dataService.gotNewData.
    subscribe((pathAsGeoJson) => {

      // console.log(pathAsGeoJson);

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

      if (pathAsGeoJson.features.length !== 0) {
        map.data.addGeoJson(pathAsGeoJson);
      }
      map.data.setStyle(function(feature) {
        return ({
          clickable: true,
          strokeColor: feature.getProperty('color'),
          strokeWeight: 3,
          strokeOpacity: 0.6
        });
      });
      map.fitBounds({
        north: pathAsGeoJson.bbox[3],
        south: pathAsGeoJson.bbox[1],
        east:  pathAsGeoJson.bbox[2],
        west:  pathAsGeoJson.bbox[0]
      });

      // Set all paths to unclicked
      pathAsGeoJson.features.map(x => x.properties.isClicked = false);

      /**
       *
       * Define custom controls
       *
       */

      const btnDefinition = [
        { text: 'Delete',
          rollOver: 'Delete selected track',
          clickFunction: pathDelete,
          isEnabled: false},
        { text: 'Load',
          rollOver: 'Add more tracks',
          clickFunction: pathLoad,
          isEnabled: false},
        { text: 'Save',
          rollOver: 'Save selected track',
          clickFunction: pathSave,
          isEnabled: false},
        { text: 'Zoom In',
          rollOver: 'Zoom in on selected track',
          clickFunction: zoomIn,
          isEnabled: false},
        { text: 'Fit All',
          rollOver: 'Fit all tracks on screen',
          clickFunction: fitAll,
          isEnabled: false},
      ];


      const controlDiv = document.createElement('div');
      for (const thisBtn of btnDefinition) {
        createButton(controlDiv, thisBtn);
      }

      map.controls[google.maps.ControlPosition.LEFT_TOP].push(controlDiv);

      // Use callback function to ensure map.controls call is complete before setting state of buttons

      // pushControls(setBtnState);

      // function pushControls(cb) {
      //   console.log('hello');
      //   map.controls[google.maps.ControlPosition.LEFT_TOP].push(controlDiv);
      //   console.log('hello again');
      //   cb();
      // }


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

      const mapData = map.data;
      const mapService = this.mapService;

      if (pathAsGeoJson.features.length === 1) {
        mapService.newMapData.emit(getDataPackage(pathAsGeoJson.features[0]));
      } else {
        attachListeners();
      }

      /**
       *
       * Attach listeners to map
       *
       */

      function attachListeners() {

        let clickedPathData;
        clickedPathData = {'empty': true};

        mapData.addListener('mouseover', function(event) {
          mapData.overrideStyle(event.feature, {
            strokeOpacity: 1.0,
            strokeWeight: 5
          });
          mapService.newMapData.emit(getDataPackage(event.feature));
        });

        mapData.addListener('mouseout', function(event) {
          // revert line that was mouseovered to original style, if it wasnt clicked
          if (!event.feature.getProperty('isClicked')) {
            mapData.revertStyle(event.feature);
            mapService.newMapData.emit(clickedPathData);
          }
        });

        mapData.addListener('click', function(event) {

          if (event.feature.getProperty('isClicked')) {
            event.feature.setProperty('isClicked', false);
            clickedPathData = {'empty': true};
          } else {
            pathAsGeoJson.features.map(x => x.properties.isClicked = false);
            event.feature.setProperty('isClicked', true);
            clickedPathData = getDataPackage(event.feature);
            mapData.revertStyle();
            mapData.overrideStyle(event.feature, {
              strokeOpacity: 1.0,
              strokeWeight: 5
            });
          }

          // if any of the paths are clicked
          console.log('I\'m here');
          setBtnState();

        });

      }

      function setBtnState() {
        console.log('there');
        if (pathAsGeoJson.features.map(x => x.properties.isClicked)
                                  .find(function(y) {return y === true; }) === true) {

          const btnIDs = [
            document.getElementById('Zoom In'),
            document.getElementById('Load'),
            document.getElementById('Save'),
            document.getElementById('Delete')];

          for (const btn of btnIDs) {
            btn['isEnabled'] = true;
            setBtnEnabled(btn, true);
          }

        } else {

          const btnIDs = [
            document.getElementById('Zoom In'),
            document.getElementById('Load'),
            document.getElementById('Save'),
            document.getElementById('Delete')];

          console.log(btnIDs);
          for (const btn of btnIDs) {
            btn['isEnabled'] = false;
            setBtnEnabled(btn, false);
          }
        }

      }


      function getDataPackage(source) {
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

      /**
       *
       * Define button functions
       *
       */

      function setBtnEnabled(btn, boo) {
        if (boo === true) {
          btn.style.backgroundColor = '#fff';
        } else {
          btn.style.backgroundColor = 'rgb(235, 235, 235)';
        }
        btn.style.fontSize = '12px';
        btn.style.lineHeight = '25px';
        btn.style.paddingLeft = '5px';
        btn.style.paddingRight = '5px';
      }

      function pathSave() {
        const btnID = document.getElementById('Save');
        if (btnID['isEnabled'] === 'true') {
          mapService.newMapData.emit({'save': true});
        }

      }

      function pathLoad() {
        console.log('click load');
        that.router.navigate(['tracks-load']);
      }

      function pathDelete() {
        console.log('click delete');

        // map.data.remove(pathAsGeoJson.features[0]);
        // map.data.setStyle(function(feature) {
        //   return{
        //     visible: !feature.getProperty('isClicked'),
        //   };
        // });

      }

      function zoomIn() {
        console.log('click zoom');
        for (const path of pathAsGeoJson.features) {
          if (path.properties.isClicked) {
            map.fitBounds({
                north: path.bbox[3],
                south: path.bbox[1],
                east:  path.bbox[2],
                west:  path.bbox[0]
            });
          }
        }
      }

      function fitAll() {
        console.log('click fit');
        map.fitBounds({
          north: pathAsGeoJson.bbox[3],
          south: pathAsGeoJson.bbox[1],
          east:  pathAsGeoJson.bbox[2],
          west:  pathAsGeoJson.bbox[0]
        });

      }

    } // subscribe callback

  );  // subscribe




} // ngOnInit

} // OnInit

