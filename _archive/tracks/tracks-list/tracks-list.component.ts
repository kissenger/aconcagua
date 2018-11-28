import { Component, OnInit } from '@angular/core';
import { DataService } from '../../data.service';
import { MapService } from '../../data.service';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@NgModule({
  imports: [
    FormsModule
  ]
})

@Component({
  selector: 'app-tracks-list',
  templateUrl: './tracks-list.component.html',
  styleUrls: ['./tracks-list.component.css']
})

export class TracksListComponent implements OnInit {

  httpClient: any;
  private data;

  constructor(
    private http: HttpClient,
    private dataService: DataService,
    private router: ActivatedRoute,
    ) {}

  onLineClick(trackID: string) {

    this.http.get('http://localhost:3000/singletrack/' + trackID)
    .subscribe(incomingData => {
      this.dataService.gotNewData.emit(incomingData);
    });

  }

  ngOnInit() {

    // get params from url
    this.router.params.subscribe(params => {

      this.http.get('http://localhost:3000/path-summary/track')
      .subscribe(incomingData => {
        this.data = incomingData;
        console.log(incomingData);
      });

      // only if param.suppress is false, auto select most recent route
      if ( params.suppress === 'false' ) {
        this.http.get('http://localhost:3000/most-recent-path/track')
        .subscribe(incomingData => {
          this.dataService.gotNewData.emit(incomingData);
        });
      }

    });
  }

} // onInit
