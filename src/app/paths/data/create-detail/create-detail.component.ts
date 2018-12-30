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
  selector: 'app-create-detail',
  templateUrl: './create-detail.component.html',
  styleUrls: ['./create-detail.component.css']
})

export class CreateDetailComponent implements OnInit, OnDestroy {

  public myService;
  public distance = 0;

  constructor(
    private dataService: DataService,
    private utils: UtilsService
    ) {}

  ngOnInit() {

    this.myService = this.dataService.fromCreateToDetail.subscribe( (dataIn) => {

      this.distance = dataIn.distance;
      // console.log(this.distance);

    });


  }

  ngOnDestroy() {
    console.log('unsubscribe from mapService');
    if (this.myService) {
      this.myService.unsubscribe();
    }
  }

}

