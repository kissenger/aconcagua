import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../../../data.service';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UtilsService } from '../../../utils.service';
import { ActivatedRoute } from '@angular/router';
import { ConvertPropertyBindingResult } from '@angular/compiler/src/compiler_util/expression_converter';

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
  public paramsSubs;
  public isCreatePage;
  public newName;
  public newDesc;

  constructor(
    private dataService: DataService,
    private utils: UtilsService,
    private activatedRouter: ActivatedRoute,
    ) {}

  ngOnInit() {

    this.paramsSubs = this.activatedRouter.params.subscribe(params => {

      if ( params.isCreate === 'true' ) {
        // this is a route create page:

        this.isCreatePage = true;
        this.onChange(); // intialises data on storage

      } else {
        // not route create page: listen to data coming from map component

        this.isCreatePage = false;
        this.myService = this.dataService.fromMapToData.subscribe( (dataFromMap) => {
          this.pathName = dataFromMap.path.name;
          this.pathDescription = typeof dataFromMap.path.description === 'undefined' ? '(No description)' : dataFromMap.path.description;
        });

      }
    });
  }  // oninit

  onChange() {

    this.dataService.storeCreatedRouteDetails({
      name: this.newName,
      description: this.newDesc
    });

  }

  ngOnDestroy() {
    console.log('unsubscribe from mapService');
    if (this.myService) {
      this.myService.unsubscribe();
    }
  }

}



