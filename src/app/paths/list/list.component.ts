import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../../data.service';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

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
  private dataForHTML;
  private isSuppressed: any;
  private pathType: String;
  private paramsSubs;
  private updateSubs;

  constructor(
    private http: HttpClient,
    private dataService: DataService,
    private activatedRouter: ActivatedRoute,
    private router: Router,
    ) {}

  ngOnInit() {

    this.paramsSubs = this.activatedRouter.params.subscribe(params => {
      // console.log('update list on params change, id = ' + params.id);
      this.pathType = params.type;
      if ( params.id === -1 ) {

      } else {
        this.updateList(params.id);
      }

    });


  } // ngOnInit

  updateList(id) {

    // request paths list from backend and listen for response
    if ( typeof id !== 'undefined' && id !== 0) {
      this.http.get('http://localhost:3000/get-paths-list/' + this.pathType)
        .subscribe(dataIn => { this.dataForHTML = dataIn; },
                  error => { console.log(error); },
                  //  () => console.log('get list finished')
                  );
    }

    // if id is not known then we need to find one
    if ( typeof id === 'undefined' || id === 0) {

      this.http
        .get('http://localhost:3000/get-path-auto/' + this.pathType)
        .subscribe( ( dataIn ) => {
                      console.log(dataIn);
                      this.router.navigate(['paths', this.pathType, dataIn['id']]); },
                   error => { console.log(error); },
                  //  () => console.log('get auto finished')
                   );
    }

  }

  onLineClick(idFromClick: string) {

    document.documentElement.style.cursor = 'wait';

    this.http
      .get('http://localhost:3000/get-path-by-id/' + this.pathType + '/' + idFromClick + '/true')
      .subscribe( () => {this.router.navigate(['paths', this.pathType, idFromClick]);
                         document.documentElement.style.cursor = 'default'; },
                  error => { console.log(error); } );

  }

  ngOnDestroy() {
    this.paramsSubs.unsubscribe();
  }

}
