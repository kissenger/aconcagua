import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../../../data.service';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UtilsService } from '../../../utils.service';

@NgModule({
  imports: [
    FormsModule
  ]
})

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.css']
})

export class SummaryComponent implements OnInit, OnDestroy {

  public myService;
  public pathName = '';
  public pathDescription = '';
  public stats;
  public showTime;
  public showElev;

  constructor(
    private dataService: DataService,
    private utils: UtilsService
    ) {}

  ngOnInit() {

    this.myService = this.dataService.fromMapToData.
      subscribe( (dataFromMap) => {

        // if ( 'category' in dataFromMap ) {

          console.log(dataFromMap);

          // this.stats = dataFromMap.stats;
          // this.showTime = this.stats.startTime.length > 1 ? true : false;
          // this.showElev = this.stats.ascent !== 0 ? true : false;

          this.pathName = dataFromMap.name;
          this.pathDescription = typeof dataFromMap.description === 'undefined' ? '(No description)' : dataFromMap.description;

        // } else {

        // }
      }); // subscribe

  }

  ngOnDestroy() {
    console.log('unsubscribe from mapService');
    this.myService.unsubscribe();
  }

}



