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
  private isEndOfList = false;

  constructor(
    private http: HttpClient,
    private httpService: HttpService,
    private activatedRouter: ActivatedRoute,
    private router: Router,
    private utils: UtilsService
    ) {}

  ngOnInit() {

    this.paramsSubs = this.activatedRouter.params.subscribe(params => {

      this.pathType = params.pathType;
      this.pathId = params.id;

      this.timer = setInterval( () => {
        this.highlightActiveRow(<HTMLElement>document.getElementById(this.pathId));
      }, 100);

    });

    this.updateList();


  } // ngOnInit

  highlightActiveRow(div) {
    if ( !div ) { return false; }
    div.style.backgroundColor = '#E9E2CB';
    clearInterval(this.timer);
  }

  updateList() {

    // get list of paths
    this.httpService.getPathsList(this.pathType, this.listOffset).subscribe( result => {


      if ( typeof result[0] !== 'undefined' ) {
        // query returned data, so process it

        // reset content of 'more_div
        document.getElementById('more_div').innerHTML = 'more';

        // compile data and confirm if we are at the end of the list yet
        this.htmlData = this.htmlData.concat(result);
        if ( this.htmlData.length === this.htmlData[0].count ) {
          this.isEndOfList = true;
        }

        // if id not provided on the url, then use first one in list and re-navigate
        if ( typeof this.pathId === 'undefined' || this.pathId === '0') {
          this.router.navigate(['paths', this.pathType, this.htmlData[0].pathId]);
        }

      } else {
        // no data in query, so navigate back with path id = 0 (ensures that  map loads)
        this.router.navigate(['paths', this.pathType, '0']);
      }

    });

  }

  onMoreClick() {
  // when the 'more_div' is clicked...
    this.listOffset++;
    this.updateList();
    document.getElementById('more_div').innerHTML = 'fetching...';
  }

  onLineClick(idFromClick: string) {

    document.documentElement.style.cursor = 'wait';
    document.getElementById(this.pathId).style.backgroundColor = '#FFFFFF';
    document.getElementById(idFromClick).style.backgroundColor = '#E9E2CB';

    this.router.navigate(['paths', this.pathType, idFromClick]);
    document.documentElement.style.cursor = 'default';

    // this.httpService.getPathById(this.pathType, idFromClick, true).subscribe( () => {
    //     this.router.navigate(['paths', this.pathType, idFromClick]);
    //     document.documentElement.style.cursor = 'default';
    //   });
  }

  ngOnDestroy() {
    this.paramsSubs.unsubscribe();
  }

}
