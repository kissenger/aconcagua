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
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})

export class ListComponent implements OnInit, OnDestroy {

  httpClient: any;
  private pathType: String;
  private paramsSubs;
  private htmlData = [];
  public timer: NodeJS.Timer;
  private pathId: string;
  private listOffset = 0;
  private isEndOfList = false; // value is read in the html do dont be tempted to delete
  private DEBUG = false;

  constructor(
    private http: HttpClient,
    private httpService: HttpService,
    private activatedRouter: ActivatedRoute,
    private router: Router,
    private utils: UtilsService  // pretify date function used in html
    ) {}

  ngOnInit() {

    if (this.DEBUG) { console.log('-->list.component.ngOnInit()---------------'); }

    this.paramsSubs = this.activatedRouter.params.subscribe(params => {

      this.pathType = params.pathType;
      this.pathId = params.id;

      this.timer = setInterval( () => {

        const divHandle = <HTMLElement>document.getElementById(this.pathId);
        if (this.DEBUG) { console.log('-->list.component.ngOnInit(): divHandle = ', divHandle); }
        this.highlightActiveRow(divHandle);

      }, 200);

    });

    this.updateList();

  } // ngOnInit


  /**
  * Highlights the list item that is being displayed on the map
  */
  highlightActiveRow(div) {
    if (this.DEBUG) { console.log('-->list.component.highlightActiveRow()'); }

    // return false if the required div does not exist
    if ( !div ) { return false; }

    // otherwise highlight the div and clear the timer
    div.style.backgroundColor = '#E9E2CB';
    clearInterval(this.timer);
  }


  /**
  * Get list data on component load or request for additional list items
  */
  updateList() {

    if (this.DEBUG) { console.log('-->list.component.updateList()'); }

    // get list of paths
    this.httpService.getPathsList(this.pathType, this.listOffset).subscribe( pathsList => {

      if ( typeof pathsList[0] !== 'undefined' ) {
        // query returned data, so process it

        // reset content of 'more_div
        document.getElementById('more_div').innerHTML = 'more';

        // compile data and confirm if we are at the end of the list yet
        this.htmlData = this.htmlData.concat(pathsList);
        console.log(this.htmlData);

        if ( this.htmlData.length === this.htmlData[0].count ) {
          this.isEndOfList = true;
        }

        // if id not provided on the url, then use first one in list and re-navigate
        // this causes the list component to be loaded twice - once to populate the list and once after the required path as been found
        // IS THERE A BETTER WAY TO DO THIS?
        if ( typeof this.pathId === 'undefined' || this.pathId === '0') {
          this.router.navigate(['paths', this.pathType, this.htmlData[0].pathId]);
        }

      } else {
        // no data in query, so navigate back with path id = 0 (ensures that  map loads)
        this.router.navigate(['paths', this.pathType, '0']);
      }

    });

  }

  /**
  * Request additional items in list
  */
  onMoreClick() {
  // when the 'more_div' is clicked...
    this.listOffset++;
    this.updateList();
    document.getElementById('more_div').innerHTML = 'fetching...';
  }


  /**
   * Resets list item highlight and requests new map display
   * @param idFromClick id of path requested
   */
  onLineClick(idFromClick: string) {

    // display on debug only
    if (this.DEBUG) { console.log('-->list.component.onLineClick()'); }

    if (idFromClick !== this.pathId) {
      // get handle for current highlighted div and unhighlight --> new highlight will be handled in ngOnInit
      const oldDivHandle = document.getElementById(this.pathId);
      if (this.DEBUG) { console.log('-->list.component.onLineClick(): oldDivHandle = ', oldDivHandle); }
      oldDivHandle.style.backgroundColor = '#FFFFFF';

      // navigate to the newly requested path
      this.router.navigate(['paths', this.pathType, idFromClick]);
      document.documentElement.style.cursor = 'default';
    }

  }


  /**
   * Actions to do when component is destroyed
   */
  ngOnDestroy() {
    if (this.DEBUG) { console.log('-->list.component.ngOnDestroy()'); }

    clearInterval(this.timer);      // cancel the timer used to determine div existance for highlighting
    this.paramsSubs.unsubscribe();
  }

}
