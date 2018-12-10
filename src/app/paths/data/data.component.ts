import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../../data.service';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    FormsModule
  ]
})

@Component({
  selector: 'app-data',
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.css']
})

export class DataComponent implements OnInit, OnDestroy {

  public myService;
  public pathName = '';
  public pathDescription = '';
  public totalDistance = 0;
  public totalAscent = 0;
  public totalDescent = 0;
  public maxDistBtwnTwoPoints = 0;
  public aveDistBtwnTwoPoints = 0;
  public matchDistance = '';

  constructor(
    private dataService: DataService
    ) {}

//   openForm() {
//     document.getElementById('myForm').style.display = 'block';
//     // console.log('click');
//   }

//   onCancel() {
//       document.getElementById('myForm').style.display = 'none';
//   }

//   onSave() {
//     document.getElementById('myForm').style.display = 'none';
// }

  ngOnInit() {

    this.myService = this.dataService.fromMapToData.
      subscribe( (dataFromMap) => {
        console.log(dataFromMap);

        if ( 'matchDistance' in dataFromMap.stats ) {
          this.matchDistance          = dataFromMap.stats.matchDistance;
        } else {
          this.pathName               = dataFromMap.name;
          this.pathDescription        = dataFromMap.description;
          this.totalDistance          = dataFromMap.stats.totalDistance;
          this.totalAscent            = dataFromMap.stats.totalAscent;
          this.totalDescent           = dataFromMap.stats.totalDescent;
          this.maxDistBtwnTwoPoints   = dataFromMap.stats.maxDistBtwnTwoPoints;
          this.aveDistBtwnTwoPoints   = dataFromMap.stats.aveDistBtwnTwoPoints;
        }


      }); // subscribe

  } // ngOnInit

/**
 *CLEAR UP
 */

  ngOnDestroy() {
    console.log('unsubscribe from mapService');
    this.myService.unsubscribe();
  }

}


