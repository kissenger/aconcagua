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
  public nTabs = 3;
  public tabNameLeft;
  public tabNameMid;
  public tabNameRight;
  public tabNameSingle;
  public tabHighlightColour;
  private paramsSubs;
  private myService;
  private notificationsWaiting = false;

  constructor(
    private activatedRouter: ActivatedRoute,
    private dataService: DataService
    ) {}

  ngOnInit() {

    console.log('ngOnInit%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    this.myService = this.dataService.newNotification.subscribe( (data) => {
      this.notificationsWaiting = true;
    });

    this.paramsSubs = this.activatedRouter.params.subscribe(params => {
      if ( params.pageType === 'create' || params.id === '-1' ) {
        this.nTabs = 1;
      } else {
        this.nTabs = 3;
      }

      if ( this.nTabs === 1 ) {
        this.tabNameSingle = 'New Path Details';
      } else
      // if ( this.nTabs === 2 ) {
      //   this.activeTab = 'left';
      //   this.tabNameLeft = 'List';
      //   this.tabNameRight = 'Detail';
      // } else
      if ( this.nTabs === 3 ) {
        this.activeTab = 'left';
        this.tabNameLeft = 'List';
        this.tabNameMid = 'Detail';
        this.tabNameRight = 'Feed';
      }

      this.tabHighlightColour = '#E9E2CB';

    });




  } // ngOnInit

  menuClick(item: String) {

    this.activeTab = item;

    if ( this.nTabs === 1 ) {

    } else

    if ( this.nTabs === 2 ) {
      const leftDiv = document.getElementById('tab left');
      const rightDiv = document.getElementById('tab right');
      if ( item === 'left' ) {
        leftDiv.style.backgroundColor = this.tabHighlightColour;
        rightDiv.style.backgroundColor = '#FFFFFF';
      } else if ( item === 'right' ) {
        leftDiv.style.backgroundColor = '#FFFFFF';
        rightDiv.style.backgroundColor = this.tabHighlightColour;
      }
    }

    if ( this.nTabs === 3 ) {
      const leftDiv = document.getElementById('tab left');
      const midDiv = document.getElementById('tab mid');
      const rightDiv = document.getElementById('tab right');
      if ( item === 'left' ) {
        leftDiv.style.backgroundColor = this.tabHighlightColour;
        midDiv.style.backgroundColor = '#FFFFFF';
        rightDiv.style.backgroundColor = '#FFFFFF';
      } else if ( item === 'mid' ) {
        leftDiv.style.backgroundColor = '#FFFFFF';
        midDiv.style.backgroundColor = this.tabHighlightColour;
        rightDiv.style.backgroundColor = '#FFFFFF';
      } else if ( item === 'right' ) {
        this.notificationsWaiting = false;
        this.dataService.notificationsRead.emit(true);
        leftDiv.style.backgroundColor = '#FFFFFF';
        midDiv.style.backgroundColor = '#FFFFFF';
        rightDiv.style.backgroundColor = this.tabHighlightColour;
      }
    }

  }

  ngOnDestroy() {
    this.myService.unsubscribe();
  }

}


