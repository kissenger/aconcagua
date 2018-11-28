import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService} from '../../data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tracks-load',
  templateUrl: './tracks-load.component.html',
  styleUrls: ['./tracks-load.component.css']
})

export class TracksLoadComponent implements OnInit {

  httpClient: any;
  public listOfPaths;

  constructor(private http: HttpClient,
              private dataService: DataService,
              private router: Router
              ) {}

  ngOnInit() {
  }

  onFilePicked(event: Event) {

    // Get multiple file names
    const files = (event.target as HTMLInputElement).files;        // multiple files
    // const file = (event.target as HTMLInputElement).files[0];   // single file
    // console.log(file);

    // Create new form data using js formdata object
    const fileData = new FormData();
    for (let i = 0; i <= (files.length - 1); i++) {
      fileData.append('filename', files[i], files[i].name);
      // console.log(files[i].name);
    }

    // send file object from form ("fileData") to the backend and recieve incoming data in return ("incomingData")
    this.http.post('http://localhost:3000/loadtracks', fileData)
      .subscribe(incomingData => {
        this.dataService.gotNewData.emit(incomingData);
    });

    this.router.navigate(['tracks', true]);

  }

}
