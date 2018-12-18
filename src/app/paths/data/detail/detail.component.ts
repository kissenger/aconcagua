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

  public stats;
  public matchStats;
  public showTime;
  public showElev;

  constructor(
    private dataService: DataService,
    private utils: UtilsService
    ) {}

  ngOnInit() {

    // this.myService = this.dataService.fromMapToData.
    // subscribe( (dataFromMap) => {

      const dataFromMap = this.dataService.getStoredData();


      this.stats = dataFromMap.pathData.properties.stats;
      console.log(this.stats);
      this.matchStats = dataFromMap.matchData;
      this.showTime = this.stats.startTime.length > 1 ? true : false;
      this.showElev = this.stats.ascent !== 0 ? true : false;

    // }); // subscribe

  }

  ngOnDestroy() {
    // this.myService.unsubscribe();
  }

}

