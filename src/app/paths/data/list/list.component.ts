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
  private dataHtml;
  public timer: NodeJS.Timer;
  private pathId: string;

  constructor(
    private http: HttpClient,
    private httpService: HttpService,
    private activatedRouter: ActivatedRoute,
    private router: Router,
    private utils: UtilsService
    ) {}

  ngOnInit() {



    this.paramsSubs = this.activatedRouter.params.subscribe(params => {
      // console.log('update list on params change, id = ' + params.id);
      this.pathType = params.type;
      this.pathId = params.id;
      if ( this.pathId === '-1' ) {

      } else {
        this.updateList();
      }

      // user timer to wait for page to render before highlighting active row
      console.log('timer');
      this.timer = setInterval( () => {
        this.highlightActiveRow(<HTMLElement>document.getElementById(this.pathId));
      }, 200);

    });



  } // ngOnInit

  highlightActiveRow(div) {
    if ( !div ) { return false; }
    div.style.backgroundColor = '#E9E2CB';
    clearInterval(this.timer);
  }

  updateList() {

    // request paths list from backend and listen for response
    if ( typeof this.pathId !== 'undefined' && this.pathId !== '0') {

      this.httpService.getPathsList(this.pathType)
        .subscribe( result => {
            console.log(result);
            this.dataHtml = result;
          },
          error => { console.log(error); },
        );
    }

    // if id is not known then we need to find one
    if ( typeof this.pathId === 'undefined' || this.pathId === '0') {

      this.httpService.getPathAuto(this.pathType)
        .subscribe(
          dataIn => { this.router.navigate(['paths', this.pathType, dataIn['id']]); },
          error  => { console.log(error); },
        );
    }

  }

  onLineClick(idFromClick: string) {

    console.log('click');
    document.documentElement.style.cursor = 'wait';
    document.getElementById(this.pathId).style.backgroundColor = '#FFFFFF';

    this.httpService.getPathById(this.pathType, idFromClick, true)
      .subscribe( () => {this.router.navigate(['paths', this.pathType, idFromClick]);
                         document.documentElement.style.cursor = 'default'; },
                  error => { console.log(error); } );

  }

  ngOnDestroy() {
    this.paramsSubs.unsubscribe();
  }

}
