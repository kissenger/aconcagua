import { EventEmitter, Injectable } from '@angular/core';
import { BrowserDynamicTestingModule } from '@angular/platform-browser-dynamic/testing';

/**
 *
 * Facilitates data exchange between components
 *
 */

@Injectable()
export class ButtonsService {

  constructor (
  ) {}

  private buttons = {
    btnMenu: {text: 'menu', id: 0, clickFunctionName: 'btnMenuClick', isEnabled: true },
    btnDelete: { text: 'delete this path', id: 1, clickFunctionName: 'pathDelete', isEnabled: true },
    btnLoad: { text: 'import single file', id: 2, clickFunctionName: 'pathLoad', isEnabled: true },
    btnBatch: { text: 'import Multiple files', id: 3, clickFunctionName: 'batchLoad', isEnabled: true},
    btnCreate: { text: 'create New Route', id: 4, clickFunctionName: 'createNew', isEnabled: true },
    btnCancel: { text: 'cancel', id: 5, clickFunctionName: 'cancel', isEnabled: true, isChecked: false },
    btnUndo: {text: 'undo', id: 6, clickFunctionName: 'pathUndo', isEnabled: true, isChecked: false},
    btnClear: { text: 'clear', id: 7, clickFunctionName: 'pathClear', isEnabled: true },
    btnClose: { text: 'close path', id: 8, clickFunctionName: 'pathClose', isEnabled: true },
    btnSaveCreated: { text: 'save route', id: 9, clickFunctionName: 'saveCreated', isEnabled: true },
    btnExport: { text: 'export .gpx', id: 10, clickFunctionName: 'pathExport', isEnabled: true},
    btnUseAsChallenge: { text: 'use as challenge', id: 11, clickFunctionName: 'btnUseAsChall', isEnabled: true },
    btnRemoveChallenge: { text: 'remove challenge', id: 12, clickFunctionName: 'btnRemoveChall', isEnabled: true},
    btnSave: { text: 'save', id: 14, clickFunctionName: 'pathSave', isEnabled: true },
    btnDiscard : { text: 'discard', id: 15, clickFunctionName: 'pathDiscard', isEnabled: true }
  };

  private checkboxes = {
    cbTracks: { text: 'Tracks', id: '100', clickFunctionName: 'cbShowTracks', isEnabled: false, isChecked: false },
    cbMileMarkers: { text: 'Mile Markers', id: 101, clickFunctionName: 'cbShowMileMarkers', isEnabled: true, isChecked: false },
    cbSnap: { text: 'Road Snap', id: 102, clickFunctionName: 'cbSnap', isEnabled: true, isChecked: true}
  };

  private routeRadio = [
      { text: 'Route', id: 103, isChecked: true, isEnabled: true, clickFunctionName: 'radioClick' },
      { text: 'Binary', id: 104, isChecked: false, isEnabled: true, clickFunctionName: 'radioClick' },
      { text: 'Contour', id: 105, isChecked: false, isEnabled: true, clickFunctionName: 'radioClick' }
  ];

  getMenuBtns(pageType, pathType) {

    const btnArray = [];
    const checkArray = [];
    const radioArray = [];

    if ( pageType === 'Review' ) {

      btnArray.push(this.buttons.btnMenu, this.buttons.btnSave, this.buttons.btnDiscard);


    } else if ( pageType === 'Normal' ) {

      if ( pathType === 'route') {
        btnArray.push(
          this.buttons.btnMenu,
          this.buttons.btnDelete,
          this.buttons.btnLoad,
          this.buttons.btnCreate,
          this.buttons.btnExport,
          this.buttons.btnUseAsChallenge);
          checkArray.push(
            this.checkboxes.cbMileMarkers);
          radioArray.push(
            []);

      } else if ( pathType === 'track') {
        btnArray.push(
          this.buttons.btnMenu,
          this.buttons.btnDelete,
          this.buttons.btnLoad,
          this.buttons.btnBatch);
          checkArray.push(
            this.checkboxes.cbMileMarkers);
          radioArray.push(
            []);

      } else
      if ( pathType === 'challenge') {
        btnArray.push(
          this.buttons.btnMenu,
          this.buttons.btnCreate,
          this.buttons.btnRemoveChallenge);
        checkArray.push(
          this.checkboxes.cbTracks,
          this.checkboxes.cbMileMarkers);
        radioArray.push(
          this.routeRadio);
      }

    } else if ( pageType === 'Create' ) {

      if ( pathType === 'route') {
        btnArray.push(
          this.buttons.btnUndo,
          this.buttons.btnClear,
          this.buttons.btnClose,
          this.buttons.btnSaveCreated,
          this.buttons.btnCancel );

      }

    }

    return { btns: btnArray, radios: radioArray, checks: checkArray};
  }

}
