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

  public tabName  = 'left';

  constructor(
    ) {}

  ngOnInit() {



  } // ngOnInit

  menuClick(item) {

    this.tabName = item;
    const leftDiv = document.getElementById('left');
    const rightDiv = document.getElementById('right');

    if ( item === 'left' ) {
      // leftDiv.style.borderBottom = '0px';
      // leftDiv.style.borderRight = 'transparent 1px solid';
      // rightDiv.style.borderBottom = '#000000 1px solid';
      // rightDiv.style.borderLeft = '#000000 1px solid';
      leftDiv.style.backgroundColor = '#E9E2CB';
      rightDiv.style.backgroundColor = '#FFFFFF';
    } else if ( item === 'right' ) {
      // leftDiv.style.borderBottom = '#000000 1px solid';
      // leftDiv.style.borderRight = '#000000 1px solid';
      // rightDiv.style.borderBottom = '0px';
      // rightDiv.style.borderLeft = 'transparent 1px solid';
      leftDiv.style.backgroundColor = '#FFFFFF';
      rightDiv.style.backgroundColor = '#E9E2CB';
    }
  }


  ngOnDestroy() {

  }

}


