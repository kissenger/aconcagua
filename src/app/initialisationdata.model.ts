import { Injectable } from '@angular/core';

/**
 *
 * static data required for initialisation of components
 *
 */

@Injectable()
export class InitialisationData {

  private mapStyle: google.maps.MapTypeStyle[] = [
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
  ];

  private mapOptions: google.maps.MapOptions = {
    mapTypeId: google.maps.MapTypeId.TERRAIN,
    styles: this.mapStyle,
    fullscreenControl: false,
    streetViewControl: false,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
      position: google.maps.ControlPosition.TOP_RIGHT,
      mapTypeIds: ['terrain', 'satellite'] }
  };

  private mapLineStyles = {
    'binary':  { 'clickable': false, 'strokeColor': null, 'strokeWeight': 5, 'strokeOpacity': 1.0 },
    'contour': { 'clickable': false, 'strokeColor': null, 'strokeWeight': 5, 'strokeOpacity': 1.0 },
    'route':   { 'clickable': false, 'strokeColor': null, 'strokeWeight': 3, 'strokeOpacity': 1.0 },
    'tracks':  { 'clickable': false, 'strokeColor': null, 'strokeWeight': 3, 'strokeOpacity': 0.8 }
  };

  private menuButtons = {
    btnMenu:   { text: 'menu', isEnabled: true }, // click actions are handled in the html
    btnDelete: { text: 'delete this path', clickFunction: 'deletePath', isEnabled: true },
    btnLoad:   { text: 'import single file', clickFunction: 'loadSinglePath', isEnabled: true },
    btnBatch:  { text: 'import multiple files', clickFunction: 'loadMultiplePaths', isEnabled: true},
    btnExport: { text: 'export .gpx', clickFunction: 'exportPathToFile', isEnabled: true},
    // btnUseAsChallenge:  { text: 'use as challenge', clickFunction: 'addToChallenges', isEnabled: true },
    btnDeleteChallenge: { text: 'delete challenge', clickFunction: 'deletePath', isEnabled: true},
    btnSaveImported:   { text: 'save', clickFunction: 'saveImportedPath', isEnabled: true },
    btnDiscardImported:        { text: 'discard', clickFunction: 'discardImportedPath', isEnabled: true },
    btnCreateRouteOnChall: { text: 'create route on this challenge', clickFunction: 'createNewPath', isEnabled: true },
    btnCreateRouteOnRoute: { text: 'create a new route', clickFunction: 'createNewPath', isEnabled: true },
    btnFindRoutesOnChallenge: {text: 'find a route on this challenge', clickFunction: 'findPathOnChallenge', isEnabled: true},
    btnUndo:   { text: 'undo', clickFunction: 'undoLast', isEnabled: true},
    btnClear:  { text: 'clear', clickFunction: 'clearPath', isEnabled: true },
    btnClose:  { text: 'close path', clickFunction: 'closePath', isEnabled: true },
    btnSaveCreated:     { text: 'save route', clickFunction: 'saveCreatedPath', isEnabled: true },
    btnDiscardCreated:   { text: 'discard', clickFunction: 'discardCreatedPath', isEnabled: true },
    btnMeasureDistance: {text: 'measure distance', clickFunction: 'measureDistance', isEnabled: true},
    // btnGetBoundingBox: {text: 'get bounding box', clickFunction: 'getBoundingBox', isEnabled: true},
    btnNewPathCloudChallenge: {text: 'create new challenge: path cloud', clickFunction: 'createPathCloudChallenge', isEnabled: true},
    btnNewPathsChallenge: {text: 'create new challenge: routes', clickFunction: 'createPathsChallenge', isEnabled: true}
  };

  private checkBoxes = {
    cbTracks: { text: 'Tracks', id: 'cbTracks', clickFunction: 'showTracks', isEnabled: false, isChecked: false },
    cbMileMarkers: { text: 'Mile Markers', id: 'cbMileMarkers', clickFunction: 'showMileMarkers', isEnabled: true, isChecked: false },
    cbSnap: { text: 'Road Snap', id: 'cbSnap', clickFunction: 'snapToRoads', isEnabled: true, isChecked: true}
  };

  // object of arrays of radio buttons groups. each sub arra is treated as a group
  private radioButtons = {
    radioPlotOptions: [
      { text: 'Route',   id: 'route',   isChecked: true,  isEnabled: true, clickFunction: 'radioClick' },
      { text: 'Binary',  id: 'binary',  isChecked: false, isEnabled: true, clickFunction: 'radioClick' },
      { text: 'Contour', id: 'contour', isChecked: false, isEnabled: true, clickFunction: 'radioClick' }
    ]
  };




getMapOptions(pageType) {
    const options = this.mapOptions;
    options['draggableCursor'] = pageType === 'Create' ? 'crosshair' : 'default';
    return options;
  }

  getMapLineStyles(featureType: string) {
    return this.mapLineStyles[featureType];
  }

  getMenuBtns() {
    return this.menuButtons;
  }

  getCheckBoxes() {
    return this.checkBoxes;
  }

  getRadioButtons() {
    return this.radioButtons;
  }

}
