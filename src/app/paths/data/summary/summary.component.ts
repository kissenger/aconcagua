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
  public paramsSubs;
  public pathName = '';
  public pathDescription = '';
  public pathDistance = 0;
  public isCreatePage: Boolean;
  private newName = '';
  private newDesc = '';
  private DEBUG = true;
  // private DEBUG = false;


  constructor(
    private dataService: DataService,
    private utils: UtilsService,
    private activatedRouter: ActivatedRoute,
    ) {}

  ngOnInit() {
    if (this.DEBUG) { console.log('-->summary.component.ngOnInit()'); }

    this.paramsSubs = this.activatedRouter.params.subscribe(params => {

      if ( params.pageType === 'create' || params.id === '-1') {
        // this is a route create page:

        this.isCreatePage = true;
        this.onChange(); // intialises data on storage

      } else {
        // not create page: listen to data coming from map component
        this.isCreatePage = false;
        this.myService = this.dataService.fromMapToData.subscribe( (dataFromMap) => {

          if (this.DEBUG) { console.log('-->summary.component.ngOnInit(): dataFromMap = ', dataFromMap); }

          const mapProps = dataFromMap.path.properties;
          console.log(this.pathName);
          this.pathName = mapProps.name === '' ? mapProps.category + ' ' + mapProps.direction + ' ' + mapProps.pathType : mapProps.name;
          this.pathDescription = mapProps.description === '' ? '(No description)' : mapProps.description;
          this.myService.unsubscribe();

        });

      }
    });
  }  // oninit

  onChange() {
    if (this.DEBUG) { console.log('-->summary.component.onChange()'); }

    this.dataService.storeCreatedRouteDetails({
      name: this.newName,
      description: this.newDesc
    });

  }

  ngOnDestroy() {
    if (this.DEBUG) { console.log('-->summary.component.ngOnDestroy()'); }
    if (this.myService) {
      this.myService.unsubscribe();
    }
  }

}



