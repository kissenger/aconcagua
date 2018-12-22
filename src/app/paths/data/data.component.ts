import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../../data.service';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@NgModule({
  imports: [
    FormsModule
  ]
})

@Component({
  selector: 'app-data',
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.css']
})

export class DataComponent implements OnInit, OnDestroy {

  public activeTab;
  public nTabs = 2;
  public tabNameLeft;
  public tabNameRight;
  public tabNameSingle;
  public tabHighlightColour;
  private paramsSubs;

  constructor(
    private activatedRouter: ActivatedRoute,
    ) {}

  ngOnInit(

  ) {

    this.paramsSubs = this.activatedRouter.params.subscribe(params => {
      if ( params.isCreate === 'true' ) {
        this.nTabs = 1;
      } else {
        this.nTabs = 2;
      }
    });


    if ( this.nTabs === 1 ) {
      this.tabNameSingle = 'New Route Detail';
    } else
    if ( this.nTabs === 2 ) {
      this.activeTab = 'left';
      this.tabNameLeft = 'List';
      this.tabNameRight = 'Detail';
    }

    this.tabHighlightColour = '#E9E2CB';


  } // ngOnInit

  menuClick(item) {

    this.activeTab = item;

    if ( this.nTabs === 1 ) {

    } else

    if ( this.nTabs === 2 ) {
      const leftDiv = document.getElementById('left');
      const rightDiv = document.getElementById('right');
      if ( item === 'left' ) {
        leftDiv.style.backgroundColor = this.tabHighlightColour;
        rightDiv.style.backgroundColor = '#FFFFFF';
      } else if ( item === 'right' ) {
        leftDiv.style.backgroundColor = '#FFFFFF';
        rightDiv.style.backgroundColor = this.tabHighlightColour;
      }
    }
  }

  ngOnDestroy() {

  }

}


