import { Component, OnInit, Input } from '@angular/core';
import { componentNeedsResolution } from '@angular/core/src/metadata/resource_loading';
import { createInjectable } from '@angular/compiler/src/core';
import { getHostElement } from '@angular/core/src/render3';
import { Router } from '@angular/router';

@Component({
  selector: 'app-routes-map',
  templateUrl: './app-routes-map.component.html',
  styleUrls: ['./app-routes-map.component.css']
})

export class RoutesMapComponent implements OnInit {

  private map: google.maps.Map;

  // private placeIdArray = [];
  // private polylines = [];
  // private snappedCoordinates = [];
  // // map: google.maps.Map;

  constructor(
    ) {}

  ngOnInit() {

    // Create map
    this.map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: 51.4561, lng: -2.30486},
      mapTypeId: google.maps.MapTypeId.TERRAIN,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      mapTypeControlOptions: {
        mapTypeIds: ['terrain']
      },
      zoom: 11,
      draggableCursor: 'crosshair'
    });

    const mp = this.map;

    const poly = new google.maps.Polyline({
      map: mp,
      editable: false,
    });

    // const hoverMarker = new google.maps.Marker({
    //   map: mp,
    //   position: this.map.getCenter(),
    //   icon: {
    //     path: google.maps.SymbolPath.CIRCLE,
    //     scale: 5
    //     },
    //   visible: false
    // });

    const directionService = new google.maps.DirectionsService();
    const elevationService = new google.maps.ElevationService;
    let pathHistory = [];
    let startMarker;
    let isSnapOn = true;

    // poly.addListener('mouseover', function(event) {
    //   console.log(event);
    //   // hoverMarker.setOptions({
    //   //   position: path.getAt(event.vertex),
    //   //   visible: true
    //   // });
    // });

    mp.addListener('click', function(event) {

      const path = poly.getPath();

      // if path length is 0 then this is the first click, put up a marker
      if (path.getLength() === 0) {

        path.push(event.latLng);
        poly.setPath(path);
        startMarker = new google.maps.Marker({
          position: event.latLng,
          map: mp
        });

      // otherwise  define path depending on condition of snap button
      } else {
        if (isSnapOn === true) {

            directionService.route({
              origin: path.getAt(path.getLength() - 1),
              destination: event.latLng,
              travelMode: google.maps.TravelMode.WALKING
            }, function(result, status) {
              if (status === google.maps.DirectionsStatus.OK) {
                // pathHistory is array of number of points added in each step
                pathHistory.push(result.routes[0].overview_path.length);
                for (const point of result.routes[0].overview_path) {
                  path.push(point);
                }
              }
              updateRoutePropertiesBox(path);
          });

        } else {
          path.push(event.latLng);
          pathHistory.push(1);
          poly.setPath(path);
          updateRoutePropertiesBox(path);
        }

      }

    });

// TO DO: currently analyses the whole route on each click; should only analyse the increment
    function updateRoutePropertiesBox(a) {

      if (a.length > 0) {
        const d = google.maps.geometry.spherical.computeLength(a);
        document.getElementById('distance').innerHTML = (d / 1000 * 0.621371).toFixed(2) + 'mi';
      } else {
        document.getElementById('distance').innerHTML = 0.00 + 'mi';
      }

      if (a.length > 0) {
        elevationService.getElevationForLocations({
          'locations': a.getArray()
        }, function(elevationResult, elevationStatus) {
          if (elevationStatus.toString() === 'OK') {
            const elevStats = getElevationStats(elevationResult.map(x => x.elevation));
            document.getElementById('ascent').innerHTML = elevStats.totalAsc.toFixed(0) + 'm';
            document.getElementById('descent').innerHTML = elevStats.totalDes.toFixed(0) + 'm';
          } else {
            console.log('yompsy ERROR reported from elevation service -->');
            console.log(elevationStatus);
            console.log(elevationResult);
          }
        });
      }  else {
        document.getElementById('ascent').innerHTML = 0 + 'm';
        document.getElementById('descent').innerHTML = 0 + 'm';
      }


    }

    function getElevationStats(elevArr) {

      let ascSum = 0, desSum = 0;
      let lastPoint = -999;

      for (const thisPoint of elevArr) {

        if (lastPoint !== -999) {
          const delta = lastPoint - thisPoint;
          if (delta > 0) {
            ascSum += delta;
          } else {
            desSum += delta;
          }
          }

        lastPoint = thisPoint;
      }

      return {
        totalAsc: ascSum,
        totalDes: desSum
      };

    }



/**
 *
 * Define custom control buttons
 *
 */

    const btnDefinition = [
      { text: 'Undo',
        rollOver: 'Undo last action',
        clickFunction: pathUndo},
      { text: 'Clear',
        rollOver: 'Clear route',
        clickFunction: pathClear},
      { text: 'Close path',
        rollOver: 'Find route back to start',
        clickFunction: pathClose},
      { text: 'Road Snap',
        rollOver: 'Snap to route to roads or paths',
        clickFunction: pathToggleSnap},
      { text: 'Save',
        rollOver: 'Save route',
        func: pathSave,
        isEnabled: false}
    ];


    const controlDiv = document.createElement('div');
    for (const thisBtn of btnDefinition) {
      createButton(controlDiv, thisBtn);
    }


    function createButton(div, btn) {

      // Set CSS for the control border
      const controlUI = document.createElement('div');
      controlUI.style.backgroundColor = '#fff';
      controlUI.style.opacity = '0.8';
      controlUI.style.width = '100px';
      // controlUI.style.border = '2px solid #fff';
      controlUI.style.cursor = 'pointer';
      controlUI.style.marginBottom = '1px';
      controlUI.style.textAlign = 'center';
      controlUI.title = btn.rollOver;
      div.appendChild(controlUI);

// TO DO: convert snap btn to checkbox or slider
      // Set CSS for the control interior
      // const controlText = document.createElement('input');
      // controlText.type = 'checkbox';
      const controlText = document.createElement('div');
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

    mp.controls[google.maps.ControlPosition.LEFT_TOP].push(controlDiv);

/**
 *
 * Define route stats display boxes
 *
 */
    const displayDefinition = [
      { id: 'distance',
        text: 'Distance',
        rollOver: 'Undo last action',
        clickFunction: pathUndo},
      { id: 'ascent',
        text: 'Total Ascent',
        rollOver: 'Clear route',
        clickFunction: pathClear},
      { id: 'descent',
        text: 'Total Descent',
        rollOver: 'Clear route',
        clickFunction: pathClear},
    ];

    const displaysDiv = document.createElement('div');

    for (const thisDisplay of displayDefinition) {
      createDisplay(displaysDiv, thisDisplay);
    }

    function createDisplay(div, display) {
      // Set CSS for the control border
      const displayTitle = document.createElement('div');
      displayTitle.style.backgroundColor = '#fff';
      displayTitle.style.opacity = '0.8';
      displayTitle.style.width = '100px';
      // displayBox.style.border = '2px solid #fff';
      displayTitle.style.cursor = 'pointer';
      displayTitle.style.marginBottom = '0px';
      displayTitle.style.textAlign = 'center';
      // displayBox.title = btn.rollOver;
      displayTitle.style.color = 'black';
      displayTitle.style.fontFamily = 'Roboto,Arial,sans-serif';
      displayTitle.style.fontSize = '12px';
      displayTitle.style.lineHeight = '25px';
      displayTitle.style.paddingLeft = '5px';
      displayTitle.style.paddingRight = '5px';
      displayTitle.innerHTML = display.text;
      div.appendChild(displayTitle);

      const displayValue = document.createElement('div');
      displayValue.id = display.id;
      displayValue.style.backgroundColor = '#fff';
      displayValue.style.opacity = '0.8';
      displayValue.style.width = '100px';
      // displayBox.style.border = '2px solid #fff';
      displayValue.style.cursor = 'pointer';
      displayValue.style.marginBottom = '1px';
      displayValue.style.textAlign = 'center';
      // displayBox.title = btn.rollOver;
      displayValue.style.color = 'black';
      displayValue.style.fontFamily = 'Roboto,Arial,sans-serif';
      displayValue.style.fontSize = '12px';
      displayValue.style.lineHeight = '25px';
      displayValue.style.paddingLeft = '5px';
      displayValue.style.paddingRight = '5px';
      displayValue.innerHTML = '0';
      div.appendChild(displayValue);
    }

    mp.controls[google.maps.ControlPosition.LEFT_CENTER].push(displaysDiv);

/**
 *
 * Custom control button functions
 *
 */


    function pathUndo() {
      // console.log('click undo');

      const path = poly.getPath();
      if (pathHistory.length > 0) {
        for (let i = 0; i < pathHistory[pathHistory.length - 1]; i++) {
          path.pop();
        }
        pathHistory.pop();

        // check if undo action removes polyline from screen; if so re-centre
        const lastPoint = path.getAt(path.getLength() - 1);
        const mapBounds = mp.getBounds();
        if (!mapBounds.contains(lastPoint)) {
          mp.panTo(path.getAt(path.getLength() - 1));
        }
        updateRoutePropertiesBox(path);

      } else {
        path.clear();
        if (startMarker) {
          startMarker.setMap(null);
          startMarker = null;
        }
      }

    }

    function pathClear() {
      const path = poly.getPath();

      path.clear();
      pathHistory = [];
      if (startMarker) {
        startMarker.setMap(null);
        startMarker = null;
      }
      updateRoutePropertiesBox(path);

    }


    function pathClose() {
      const path = poly.getPath();
      if (isSnapOn) {
        directionService.route({
          origin: path.getAt(path.getLength() - 1),
          destination: path.getAt(0),
          travelMode: google.maps.TravelMode.WALKING
        }, function(result, status) {
          if (status === google.maps.DirectionsStatus.OK) {
            pathHistory.push(result.routes[0].overview_path.length);
            for (const point of result.routes[0].overview_path) {
              path.push(point);
            }
          }
          updateRoutePropertiesBox(path);
        });
      } else {
        path.push(path.getAt(0));
        poly.setPath(path);
        updateRoutePropertiesBox(path);
      }
    }


    function pathToggleSnap() {
      isSnapOn = !isSnapOn;
    }


    function pathSave() {
      // console.log('click save');

    }


  }
}



