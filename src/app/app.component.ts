
import { Component, OnInit } from '@angular/core';
import { WebsocketService } from './websocket.service';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';


export interface Message {
  author: string;
  message: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {
  title = 'aconcagua';

  constructor(
    private wsService: WebsocketService
  ) {

    wsService.connect();


  }

  ngOnInit() {

  }

}
