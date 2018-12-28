// import { EventEmitter, Injectable } from '@angular/core';
// import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';

// /**
//  *
//  * Facilitates data exchange between components
//  *
//  */

// @Injectable()
// export class ButtonsService {

//   constructor (
//   ) {}

//   private buttons = {
//     // btnMenu: {text: 'menu', id: 0, clickFunction: 'btnMenuClick', isEnabled: true },
//     // btnDelete: { text: 'delete this path', id: 1, clickFunction: 'pathDelete', isEnabled: true },
//     // btnLoad: { text: 'import single file', id: 2, clickFunction: 'pathLoad', isEnabled: true },
//     // btnBatch: { text: 'import Multiple files', id: 3, clickFunction: 'batchLoad', isEnabled: true},
//     // btnCreate: { text: 'create New Route', id: 4, clickFunction: 'createNew', isEnabled: true },
//     // btnCancel: { text: 'cancel', id: 5, clickFunction: 'cancel', isEnabled: true, isChecked: false },
//     // btnUndo: {text: 'undo', id: 6, clickFunction: 'pathUndo', isEnabled: true, isChecked: false},
//     // btnClear: { text: 'clear', id: 7, clickFunction: 'pathClear', isEnabled: true },
//     // btnClose: { text: 'close path', id: 8, clickFunction: 'pathClose', isEnabled: true },
//     // btnSaveCreated: { text: 'save route', id: 9, clickFunction: 'saveCreated', isEnabled: true },
//     // btnExport: { text: 'export .gpx', id: 10, clickFunction: 'pathExport', isEnabled: true},
//     // btnUseAsChallenge: { text: 'use as challenge', id: 11, clickFunction: 'btnUseAsChall', isEnabled: true },
//     // btnRemoveChallenge: { text: 'remove challenge', id: 12, clickFunction: 'btnRemoveChall', isEnabled: true},
//     // btnSave: { text: 'save', id: 14, clickFunction: 'pathSave', isEnabled: true },
//     // btnDiscard : { text: 'discard', id: 15, clickFunction: 'pathDiscard', isEnabled: true }

//     btnMenu:   { text: 'menu', clickFunction: 'btnMenuClick', isEnabled: true },
//     btnDelete: { text: 'delete this path', clickFunction: 'pathDelete', isEnabled: true },
//     btnLoad:   { text: 'import single file', clickFunction: 'pathLoad', isEnabled: true },
//     btnBatch:  { text: 'import Multiple files', clickFunction: 'batchLoad', isEnabled: true},
//     btnCreate: { text: 'create New Route', clickFunction: 'createNew', isEnabled: true },
//     btnCancel: { text: 'cancel', clickFunction: 'cancel', isEnabled: true, isChecked: false },
//     btnUndo:   { text: 'undo', clickFunction: 'pathUndo', isEnabled: true, isChecked: false},
//     btnClear:  { text: 'clear', clickFunction: 'pathClear', isEnabled: true },
//     btnClose:  { text: 'close path', clickFunction: 'pathClose', isEnabled: true },
//     btnSaveCreated:     { text: 'save route', clickFunction: 'saveCreated', isEnabled: true },
//     btnExport: { text: 'export .gpx', clickFunction: 'pathExport', isEnabled: true},
//     btnUseAsChallenge:  { text: 'use as challenge', clickFunction: 'btnUseAsChall', isEnabled: true },
//     btnRemoveChallenge: { text: 'remove challenge', clickFunction: 'btnRemoveChall', isEnabled: true},
//     btnSave:   { text: 'save', clickFunction: 'pathSave', isEnabled: true },
//     btnDiscard :        { text: 'discard', clickFunction: 'pathDiscard', isEnabled: true }
//   };

//   private checkboxes = {
//     cbTracks: { text: 'Tracks', id: '100', clickFunction: 'cbShowTracks', isEnabled: false, isChecked: false },
//     cbMileMarkers: { text: 'Mile Markers', id: 101, clickFunction: 'cbShowMileMarkers', isEnabled: true, isChecked: false },
//     cbSnap: { text: 'Road Snap', id: 102, clickFunction: 'cbSnap', isEnabled: true, isChecked: true}
//   };

//   private routeRadio = [
//       { text: 'Route', id: 103, isChecked: true, isEnabled: true, clickFunction: 'radioClick' },
//       { text: 'Binary', id: 104, isChecked: false, isEnabled: true, clickFunction: 'radioClick' },
//       { text: 'Contour', id: 105, isChecked: false, isEnabled: true, clickFunction: 'radioClick' }
//   ];

//   getMenuBtns(pageType, pathType) {

//     const btnArray = [];
//     const checkArray = [];
//     const radioArray = [];

//     if ( pageType === 'Review' ) {

//       btnArray.push(this.buttons.btnMenu, this.buttons.btnSave, this.buttons.btnDiscard);


//     } else if ( pageType === 'Normal' ) {

//       if ( pathType === 'route') {
//         btnArray.push(

//           this.buttons.btnDelete,
//           this.buttons.btnLoad,
//           this.buttons.btnBatch);
//         checkArray.push(
//           this.checkboxes.cbMileMarkers);
//         radioArray.push(
//           []);

//       } else if ( pathType === 'track') {
//         btnArray.push(
//           this.buttons.btnDelete,
//           this.buttons.btnLoad,
//           this.buttons.btnBatch);
//           checkArray.push(
//             this.checkboxes.cbMileMarkers);
//           radioArray.push(
//             []);

//       } else
//       if ( pathType === 'challenge') {
//         btnArray.push(
//           this.buttons.btnCreate,
//           this.buttons.btnRemoveChallenge);
//         checkArray.push(
//           this.checkboxes.cbTracks,
//           this.checkboxes.cbMileMarkers);
//         radioArray.push(
//           this.routeRadio);
//       }

//     } else if ( pageType === 'Create' ) {

//       if ( pathType === 'route') {
//         btnArray.push(
//           this.buttons.btnUndo,
//           this.buttons.btnClear,
//           this.buttons.btnClose,
//           this.buttons.btnSaveCreated,
//           this.buttons.btnCancel );

//       }

//     }
//     console.log(btnArray);
//     return btnArray;
//   }

// }
