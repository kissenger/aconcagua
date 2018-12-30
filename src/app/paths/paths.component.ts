import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-paths',
  templateUrl: './paths.component.html',
  styleUrls: ['./paths.component.css']
  // providers: [DataService]
})
export class PathsComponent implements OnInit, OnDestroy {

  public pathID;
  public paramSubs;
  public showDiv;

  constructor(
    private http: HttpClient,
    private activatedRouter: ActivatedRoute
    ) {
      // this.route.params.subscribe( params => console.log(params));
    }

  ngOnInit() {

    // this.paramSubs = this.activatedRouter.params.subscribe(params => {
    //   this.showDiv = params.id === '-1' ? false : true;
    // });

  }

  ngOnDestroy() {

    // unsubscribe from subscriptions
    // this.paramSubs.unsubscribe();

    // flush mongo of unsaved paths
    this.http.get('http://localhost:3000/flush')
      .subscribe(incomingData => {
        console.log(incomingData);
    });
  }

}
