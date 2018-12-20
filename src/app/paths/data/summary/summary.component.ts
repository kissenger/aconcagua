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

        this.pathName = dataFromMap.path.name;
        this.pathDescription = typeof dataFromMap.path.description === 'undefined' ? '(No description)' : dataFromMap.path.description;

      }); // subscribe

  }

  ngOnDestroy() {
    console.log('unsubscribe from mapService');
    this.myService.unsubscribe();
  }

}



