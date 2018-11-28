import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataService} from '../../data.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { UpdateListService } from '../../data.service';

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
    private http: HttpClient,
    private dataService: DataService,
    private activatedRouter: ActivatedRoute,
    private router: Router,
    private updateListService: UpdateListService
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

      this.http.post('http://localhost:3000/loadroutes', fileData)
        .subscribe(incomingData => {
          document.documentElement.style.cursor = 'default';
          this.dataService.gotNewData.emit(incomingData);

      });

      this.router.navigate(['paths', this.pathType, '-1']);

    } else

    if ( this.pathType === 'track' ) {

      this.http.post('http://localhost:3000/loadtracks/' + this.singleOrBatch, fileData)
        .subscribe(incomingData => {

          if ( this.singleOrBatch === 'batch' ) {
            document.documentElement.style.cursor = 'default';
            // this.updateListService.hasListChanged.emit(true);
            this.router.navigate(['paths', this.pathType]);

          } else

          if ( this.singleOrBatch === 'single' ) {
            document.documentElement.style.cursor = 'default';
            this.dataService.gotNewData.emit(incomingData);
          }
      });

      if ( this.singleOrBatch === 'batch' ) {
        // this.router.navigate(['/routes', this.pathType]);
      } else {
        this.router.navigate(['/paths', this.pathType, '-1']);
      }

    }

  }
}
