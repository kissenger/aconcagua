import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { HttpService } from '../../../http.service';
// import { utils } from 'protractor';
import { UtilsService } from '../../../utils.service';

@NgModule({
  imports: [
    FormsModule
  ]
})

@Component({
  selector: 'app-list-popup',
  templateUrl: './list-popup.component.html',
  styleUrls: ['./list-popup.component.css']
})

export class ListPopupComponent implements OnInit, OnDestroy {

  httpClient: any;
  private selectedRoutes = [];
  private htmlData = [];
  public timer: NodeJS.Timer;
  private listOffset = 0;
  private isEndOfList = false;

  constructor(
    private http: HttpClient,
    private httpService: HttpService,
    private activatedRouter: ActivatedRoute,
    private router: Router,
    private utils: UtilsService
    ) {}

  ngOnInit() {

    // this.paramsSubs = this.activatedRouter.params.subscribe(params => {

    //   this.pathType = params.pathType;
    //   this.pathId = params.id;

    //   this.timer = setInterval( () => {
    //     this.highlightActiveRow(<HTMLElement>document.getElementById(this.pathId));
    //   }, 100);

    // });

    this.updateList();


  } // ngOnInit

  updateList() {

    // get list of paths
    this.httpService.getPathsList('route', this.listOffset).subscribe( result => {

      if ( typeof result[0] !== 'undefined' ) {

        // reset content of 'more_div
        document.getElementById('more_div').innerHTML = 'more';

        // compile data and confirm if we are at the end of the list yet
        this.htmlData = this.htmlData.concat(result);
        if ( this.htmlData.length === this.htmlData[0].count ) {
          this.isEndOfList = true;
        }

      } else {
        // no routes to display
        
      }

    });

  }

  onMoreClick() {
  // when the 'more_div' is clicked...
    this.listOffset++;
    this.updateList();
    document.getElementById('more_div').innerHTML = 'fetching...';
  }

  btnClick(leftOrRight) {
    if (leftOrRight === 'left') {
      console.log('left');
    } else {
      // Cancel btn pressed
      document.getElementById('list-popup').style.display = 'none';
    }
  }
  /**
   * Highlight row on click, and push to array - toggle selection on futher clicks
   * @param idFromClick
   */
  onLineClick(idFromClick: string) {

    const index = this.selectedRoutes.indexOf(idFromClick)
    if (index === -1) {
      document.getElementById(idFromClick).style.backgroundColor = '#E9E2CB';
      this.selectedRoutes.push(idFromClick);
    } else {
      document.getElementById(idFromClick).style.backgroundColor = '#FFFFFF';
      this.selectedRoutes.splice(index, 1);
    }
    console.log(this.selectedRoutes);

  }

  ngOnDestroy() {
    // this.paramsSubs.unsubscribe();
  }

}
