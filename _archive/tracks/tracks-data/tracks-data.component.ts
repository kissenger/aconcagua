import { Component, OnInit } from '@angular/core';
import { DataService } from '../../data.service';
import { MapService } from '../../data.service';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    FormsModule
  ]
})

@Component({
  selector: 'app-tracks-data',
  templateUrl: './tracks-data.component.html',
  styleUrls: ['./tracks-data.component.css']
})

export class TracksDataComponent implements OnInit {

  public pathName;
  public totalDistance;
  public totalAscent;
  public totalDescent;
  public pathColor;
  public longestClimb;
  public longestDescent;
  public longestClimbGradient;
  public longestDescentGradient;
  public maxGradient;
  public minGradient;
  public maxDistBtwnTwoPoints;
  public aveDistBtwnTwoPoints;

  constructor(
    private dataService: DataService,
    private mapService: MapService) {}

  openForm() {
    document.getElementById('myForm').style.display = 'block';
    // console.log('click');
  }

  onCancel() {
      document.getElementById('myForm').style.display = 'none';
  }

  onSave() {
    document.getElementById('myForm').style.display = 'none';
}

  ngOnInit() {

    this.mapService.newMapData.subscribe((dataFromMap) => {
      if ('save' in dataFromMap) {
        this.openForm();
      } else if ('empty' in dataFromMap) {
        this.pathName               = '';
        this.pathColor              = '';
        this.totalDistance          = 0;
        this.totalAscent            = 0;
        this.totalDescent           = 0;
        this.longestClimb           = 0;
        this.longestDescent         = 0;
        this.longestClimbGradient   = 0;
        this.longestDescentGradient = 0;
        this.maxGradient            = 0;
        this.minGradient            = 0;
        this.maxDistBtwnTwoPoints   = 0;
        this.aveDistBtwnTwoPoints   = 0;
      } else {
        this.pathName               = dataFromMap.name;
        this.pathColor              = dataFromMap.color;
        this.totalDistance          = dataFromMap.stats.totalDistance;
        this.totalAscent            = dataFromMap.stats.totalAscent;
        this.totalDescent           = dataFromMap.stats.totalDescent;
        this.longestClimb           = dataFromMap.stats.longestClimb;
        this.longestDescent         = dataFromMap.stats.longestDescent;
        this.longestClimbGradient   = dataFromMap.stats.longestClimbGradient;
        this.longestDescentGradient = dataFromMap.stats.longestDescentGradient;
        this.maxGradient            = dataFromMap.stats.maxGradient;
        this.minGradient            = dataFromMap.stats.minGradient;
        this.maxDistBtwnTwoPoints   = dataFromMap.stats.maxDistBtwnTwoPoints;
        this.aveDistBtwnTwoPoints   = dataFromMap.stats.aveDistBtwnTwoPoints;
      }
    }); // subscribe

  } // ngOnInit

} // onInit
