import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService } from '../../data.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { HttpService } from '../../http.service';

@Component({
  selector: 'app-load',
  templateUrl: './load.component.html',
  styleUrls: ['./load.component.css']
})

export class LoadComponent implements OnInit {

  public httpClient: any;
  public listOfPaths;
  public pathType: String;
  private singleOrBatch: String;
  private isBatch;

  constructor(
    private httpService: HttpService,
    private dataService: DataService,
    private activatedRouter: ActivatedRoute,
    private router: Router
    ) {}

  ngOnInit() {

    this.activatedRouter.params.subscribe(params => {
      this.pathType = params.type;
      this.singleOrBatch = params.singleOrBatch;
      if ( params.singleOrBatch === 'batch') {
        this.isBatch = true;
      } else { this.isBatch = false; }

    });
  }

  onFilePicked(event: Event) {

    // Get multiple file names
    const files = (event.target as HTMLInputElement).files;        // multiple files

    document.documentElement.style.cursor = 'wait';

    if ( this.pathType === 'route' ) {

      const fileData = new FormData();
      fileData.append('filename', files[0], files[0].name);

      this.httpService.importRoute(fileData).subscribe( (a) => {
        document.documentElement.style.cursor = 'default';
        this.dataService.storeNewPath(a.geoJson);
        this.router.navigate(['paths', this.pathType, '-1']);
      });

    } else

    if ( this.pathType === 'track' ) {

      let returnCount = -1;
      const numberOfFiles = (files.length - 1);

      for (let i = 0; i <= numberOfFiles; i++) {

        const fileData = new FormData();
        fileData.append('filename', files[i], files[i].name);

        this.httpService.importTracks(fileData, this.singleOrBatch).subscribe( (a) => {

          returnCount++;
          console.log('file: ' + returnCount + ' of ' + numberOfFiles);

          if ( returnCount === numberOfFiles ) {
            // had back the number of files sent

            document.documentElement.style.cursor = 'default';
            if ( this.singleOrBatch === 'batch' ) {
              this.router.navigate(['paths', this.pathType]);
            } else {
              this.dataService.storeNewPath(a.geoJson);
              this.router.navigate(['paths', this.pathType, -1]);
            }
          }

        });
      }


    }

  }
}
