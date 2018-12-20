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
    });
  }

  onFilePicked(event: Event) {

    // Get multiple file names
    const files = (event.target as HTMLInputElement).files;        // multiple files

    // Create new form data using js formdata object
    const fileData = new FormData();
    for (let i = 0; i <= (files.length - 1); i++) {
      fileData.append('filename', files[i], files[i].name);
    }

    document.documentElement.style.cursor = 'wait';

    if ( this.pathType === 'route' ) {

      this.httpService.importRoute(fileData).subscribe( (dataIn) => {
        document.documentElement.style.cursor = 'default';
        this.dataService.fromLoadToMap.emit(dataIn);
      });

      this.router.navigate(['paths', this.pathType, '-1']);

    } else

    if ( this.pathType === 'track' ) {

      this.httpService.importTracks(fileData, this.singleOrBatch).subscribe( (dataIn) => {

          if ( this.singleOrBatch === 'batch' ) {
            document.documentElement.style.cursor = 'default';
            this.router.navigate(['paths', this.pathType]);

          } else

          if ( this.singleOrBatch === 'single' ) {
            document.documentElement.style.cursor = 'default';
            this.dataService.fromLoadToMap.emit(dataIn);
          }
      });

      if ( this.singleOrBatch === 'batch' ) {
      } else {
        this.router.navigate(['/paths', this.pathType, '-1']);
      }

    }

  }
}
