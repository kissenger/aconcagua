import { Injectable } from '@angular/core';
import { InitialisationData } from './initialisationdata.model';

/**
 * provides an interface between components and the intialisationData store, ensuring
 * components get the controls specific to their needs
 */

@Injectable()
export class Controls {

  constructor(
    private initialisationData: InitialisationData
    ) {
  }

  getRadioButtons(pageType, pathType) {

    // get data from store
    const radioArray = [];
    const radioButtons = this.initialisationData.getRadioButtons();

    // determine button array depending on types of page and path
    if ( pageType === 'review' ) {

    } else if ( pageType === 'normal' ) {
      if ( pathType === 'route') {

      } else if ( pathType === 'track') {

      } else
      if ( pathType === 'challenge') {
        radioArray.push(radioButtons.radioPlotOptions);
      }

    } else if ( pageType === 'create' ) {
      if ( pathType === 'route') {
        radioArray.push(radioButtons.radioPlotOptions);
      }
      if ( pathType === 'challenge') {
        radioArray.push(radioButtons.radioPlotOptions);
      }

    }

    return radioArray;
  }

  getCheckBoxes(pageType, pathType) {

    // get data from store
    const cbArray = [];
    const checkBoxes = this.initialisationData.getCheckBoxes();

    // determine button array depending on types of page and path
    if ( pageType === 'review' ) {

    } else if ( pageType === 'normal' ) {
      if ( pathType === 'route') {
        cbArray.push(
          checkBoxes.cbMileMarkers
        );

      } else if ( pathType === 'track') {
        cbArray.push(
          checkBoxes.cbMileMarkers
        );

      } else
      if ( pathType === 'challenge') {
        cbArray.push(
          checkBoxes.cbTracks,
          checkBoxes.cbMileMarkers
        );
      }

    } else if ( pageType === 'create' ) {
      if ( pathType === 'route') {
        cbArray.push(
          checkBoxes.cbSnap,
          checkBoxes.cbSimplify
        );
      }
      if ( pathType === 'challenge') {
        cbArray.push(
          checkBoxes.cbSnap,
          checkBoxes.cbSimplify
        );
      }

    }

    return cbArray;
  }


  getMenuButtons(pageType, pathType) {

    // get data from store
    const btnArray = [];
    let isSticky = false;
    const menuBtns = this.initialisationData.getMenuBtns();

    // determine button array depending on types of page and path
    if ( pageType === 'review' ) {
      isSticky = true;
      btnArray.push(
        menuBtns.btnSaveImported, menuBtns.btnDiscardImported
      );

    } else if ( pageType === 'normal' ) {
      if ( pathType === 'route') {
        isSticky = false;
        btnArray.push(
          menuBtns.btnLoad,
          menuBtns.btnDelete,
          menuBtns.btnCreateRouteOnRoute,
          menuBtns.btnExport,
          // menuBtns.btnUseAsChallenge
        );

      } else if ( pathType === 'track') {
        isSticky = false;
        btnArray.push(
          menuBtns.btnLoad,
          menuBtns.btnBatch,
          menuBtns.btnDelete
        );

      } else
      if ( pathType === 'challenge') {
        isSticky = false;
        btnArray.push(
          menuBtns.btnCreateRouteOnChall,
          menuBtns.btnDeleteChallenge,
          menuBtns.btnMeasureDistance,
          menuBtns.btnFindRoutesOnChallenge,
          menuBtns.btnNewPathCloudChallenge,
          menuBtns.btnNewPathsChallenge
        );
      }

    } else if ( pageType === 'create' ) {
      if ( pathType === 'challenge') {
        isSticky = true;
        btnArray.push(
          menuBtns.btnUndo,
          menuBtns.btnClear,
          menuBtns.btnClose,
          menuBtns.btnSaveCreated,
          menuBtns.btnDiscardCreated );
      }
      if ( pathType === 'route') {
        isSticky = true;
        btnArray.push(
          menuBtns.btnUndo,
          menuBtns.btnClear,
          menuBtns.btnClose,
          menuBtns.btnSaveCreated,
          menuBtns.btnDiscardCreated );
      }

    }

    return { btnArray: btnArray, isSticky: isSticky};
  } // getMenuButtons

}

