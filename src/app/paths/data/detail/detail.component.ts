import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgModule } from '@angular/core';
import { DataService } from '../../../data.service';
import { GeoService } from '../../../geo.service';
import { FormsModule } from '@angular/forms';
import { UtilsService } from '../../../utils.service';
import { HttpService } from 'src/app/http.service';
import { Router } from '@angular/router';
// import { GoogleChartsModule } from 'angular-google-charts';

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

  public pathProps;
  public matchStats;
  public showTime: Boolean;
  public showElev: Boolean;
  public showMatchStats: Boolean;
  public showHillsTable: Boolean;
  public isData = false;
  private DEBUG = true;
  // private DEBUG = false;

  constructor(
    private dataService: DataService,
    private geoService: GeoService,
    private utils: UtilsService,
    private httpService: HttpService,
    private router: Router,
    ) {}

  ngOnInit() {

    if (this.DEBUG) { console.log('-->detail.component.ngOnInit()'); }

    // get data from map
    this.myService = this.dataService.fromMapToData.subscribe( (dataFromMap) => {

      this.isData = true;
      if (this.DEBUG) { console.log('-->detail.component.ngOnInit(): dataFromMap = ', dataFromMap); }

      // get path info
      this.pathProps = dataFromMap.path.properties;
      this.showElev = this.pathProps.ascent ? true : false;
      this.showHillsTable = this.pathProps.hills.length === 0 ? false : true;
      if ( this.pathProps.startTime ) { this.showTime = this.pathProps.startTime.length > 1 ? true : false; }

      // get match info
      this.matchStats = dataFromMap.match;
      this.showMatchStats = this.matchStats ? true : false;

    });

  }

  onGetElevClick() {
    if (this.DEBUG) { console.log('-->detail.component.onGetElevClick()'); }
    document.getElementById('get_elev_div').innerHTML = 'fetching elevations... (could take a while) ';
    this.geoService.addElevationToPath();
  }

  onReverseRouteClick() {
    if (this.DEBUG) { console.log('-->detail.component.onReverseRouteClick()'); }
    document.getElementById('reverse_route_div').innerHTML = 'working...';
    this.geoService.reversePath().then( () => {
      document.getElementById('reverse_route_div').innerHTML = 'Reverse route...';
      this.router.navigate(['paths', this.pathProps.pathType, this.pathProps.pathId, 'reload']);
    });
  }

  plotElevation() {
   // google.load('visualization', '1', {packages: ['columnchart']});
  }


  ngOnDestroy() {
    if (this.DEBUG) { console.log('-->detail.component.ngOnDestroy()'); }
  }



}

