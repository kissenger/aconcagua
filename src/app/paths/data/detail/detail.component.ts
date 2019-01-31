import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgModule } from '@angular/core';
import { DataService } from '../../../data.service';
import { FormsModule } from '@angular/forms';
import { UtilsService } from '../../../utils.service';

@NgModule({
  imports: [
    FormsModule
  ]
})

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.css']
})

export class DetailComponent implements OnInit, OnDestroy {

  public myService;

  public pathStats;
  public matchStats;
  public showTime = false;
  public showElev = false;
  public showMatchStats = false;
  public isData = false;

  constructor(
    private dataService: DataService,
    private utils: UtilsService
    ) {}

  ngOnInit() {

    // get data from map

    this.myService = this.dataService.fromMapToData.subscribe( (dataFromMap) => {

      this.isData = true;

      console.log(dataFromMap);

      this.pathStats = dataFromMap.path;
      if ( this.pathStats.startTime ) { this.showTime = this.pathStats.startTime.length > 1 ? true : false; }
      this.showElev = this.pathStats.ascent !== 0 ? true : false;

      this.matchStats = dataFromMap.match;
      this.showMatchStats = this.matchStats ? true : false;

    });


    // const dataFromMap = this.dataService.getStoredData();
    // console.log(dataFromMap);

    // path data
    // this.pathStats = dataFromMap.path.stats;
    // console.log(this.pathStats);
    // if ( this.pathStats.startTime ) { this.showTime = this.pathStats.startTime.length > 1 ? true : false; }
    // this.showElev = this.pathStats.ascent !== 0 ? true : false;

    // // match data
    // this.matchStats = dataFromMap.match;
    // console.log(this.matchStats);
    // console.log(!!this.matchStats);

    // this.showMatchStats = this.matchStats ? true : false;

  }

  ngOnDestroy() {
    // this.myService.unsubscribe();
  }

}

