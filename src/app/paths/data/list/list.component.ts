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
  private dataHtml = [];
  public timer: NodeJS.Timer;
  private pathId: string;
  private listOffset = 0;

  constructor(
    private http: HttpClient,
    private httpService: HttpService,
    private activatedRouter: ActivatedRoute,
    private router: Router,
    private utils: UtilsService
    ) {}

  ngOnInit() {

    this.paramsSubs = this.activatedRouter.params.subscribe(params => {

      this.pathType = params.type;
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

    if ( typeof this.pathId !== 'undefined' && this.pathId !== '0') {
      // path id is known, get list

      this.httpService.getPathsList(this.pathType, this.listOffset)
        .subscribe( result => {
          this.dataHtml = this.dataHtml.concat(result);
        });

    } else if ( typeof this.pathId === 'undefined' || this.pathId === '0') {
      // path id is not known, auto-select from backend and navigate back to maps

      this.httpService.getPathAuto(this.pathType)
        .subscribe( result => {
          this.router.navigate(['paths', this.pathType, result['id']]);
        });
    }

  }

  onMoreClick() {
    this.listOffset++;
    this.updateList();
  }

  onLineClick(idFromClick: string) {

    document.documentElement.style.cursor = 'wait';
    document.getElementById(this.pathId).style.backgroundColor = '#FFFFFF';
    document.getElementById(idFromClick).style.backgroundColor = '#E9E2CB';

    this.httpService.getPathById(this.pathType, idFromClick, true).subscribe( () => {
        this.router.navigate(['paths', this.pathType, idFromClick]);
        document.documentElement.style.cursor = 'default';
      });
  }

  ngOnDestroy() {
    this.paramsSubs.unsubscribe();
  }

}
