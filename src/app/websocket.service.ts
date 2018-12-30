
import { Injectable } from '@angular/core';
// import * as Rx from 'rxjs';
// import { Observable, Observer, Subject } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import { DataService } from './data.service';

// tutorial: https://www.youtube.com/watch?v=8CNVYWiR5fg
// https://blog.codewithdan.com/pushing-real-time-data-to-an-angular-service-using-web-sockets/


@Injectable()
export class WebsocketService {

  private socketProtocol: string = (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
  private echoSocketUrl: string = this.socketProtocol + '//' + window.location.hostname + '/';

  constructor(
    private dataService: DataService,
  ) {

    this.dataService.notificationsRead.subscribe( () => {
      // TODO need to find a way to initiate websocket send
    });
  }

  connect() {

    const subject = webSocket(this.echoSocketUrl);
    subject.subscribe(

      // when a message is recieved
      (msg: Object) => {

        let sendNotification: Boolean = false;

        Reflect.ownKeys(msg).forEach(key => {
          if ( key.toString() === 'data' ) {
            // connected message from backend
            console.log('{' + key.toString() + ': ' + msg[key] + '}');
          } else {
            // assume its notification data
            sendNotification = true;
          }
        });
        if ( sendNotification === true ) {
          this.dataService.newNotification.emit(msg);
          sendNotification = false;
        }
      },

      // on error
      (err) => console.log(err),

      // on close connection
      () => console.log('complete')
    );
    subject.next(JSON.stringify({ op: 'hello' }));
  }

}
  // connect(url: string) {

  //   // open a conneection to the backend
  //   const socket = new WebSocket(url);

  //   // create an observable of type <observer>
  //   // good explanation of observables: https://github.com/ReactiveX/rxjs/blob/master/doc/observable.md
  //   const observable = Observable.create( (obs: Rx.Observer<MessageEvent>) => {
  //     socket.onmessage = obs.next.bind(obs);
  //     socket.onerror = obs.error.bind(obs);
  //     socket.onclose = obs.complete.bind(obs);
  //     return socket.close.bind(socket);
  //   });

  //   const observer = {
  //     next: (data: Object) => {
  //       if (socket.readyState === WebSocket.OPEN) {
  //         socket.send(JSON.stringify(data));
  //       }
  //     }
  //   };

  //   return Subject.create(observer, observable);

  // }



  // public connect(url: string): Rx.Subject<MessageEvent> {
  //   if (!this.subject) {
  //     this.subject = this.create(url);
  //   }
  //   return this.subject;

  // private create(url: string): Rx.Subject<MessageEvent> {
  //   const ws = new WebSocket(url);

  //   const observable = Observable.create(
  //     (obs: Rx.Observer<MessageEvent>) => {
  //       ws.onmessage = obs.next.bind(obs);
  //       ws.onerror = obs.error.bind(obs);
  //       ws.onclose = obs.complete.bind(obs);
  //       return ws.close.bind(ws);
  //     });

  //   const observer = {
  //     next: (data: Object) => {
  //       if (ws.readyState === WebSocket.OPEN) {
  //         ws.send(JSON.stringify(data));
  //       }
  //     }
  //   };

  //   return Subject.create(observer, observable);

  // const socketProtocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
  // const echoSocketUrl = socketProtocol + '//' + window.location.hostname + '/echo/';
  // console.log(echoSocketUrl); // ws://localhost/echo/
  // const socket = new WebSocket(echoSocketUrl);

  // socket.onopen = () => {
  //   socket.send('Here\'s some text that the server is urgently awaiting!');
  // };

  // socket.onmessage = e => {
  //   console.log('Message from server:', event);
  // };





// import { Injectable } from '@angular/core';
// import * as io from 'socket.io-client';
// import { Observable } from 'rxjs';
// import * as Rx from 'rxjs';
// import { environment } from '../environments/environment';

// @Injectable()
// export class WebsocketService {

//   // Our socket connection
//   private socket;

//   constructor() { }

//   connect(): Rx.Subject<MessageEvent> {
//     // If you aren't familiar with environment variables then
//     // you can hard code `environment.ws_url` as `http://localhost:5000`
//     const url = 'https://echo.websocket.org/';
//     this.socket = io(url);

//     // We define our observable which will observe any incoming messages
//     // from our socket.io server.
//     const observable = new Observable(obsvr => {
//         this.socket.on('message', (data) => {
//           console.log('Received message from Websocket Server')
//           obsvr.next(data);
//         });
//         return () => {
//           this.socket.disconnect();
//         };
//     });

//     // We define our Observer which will listen to messages
//     // from our other components and send messages back to our
//     // socket server whenever the `next()` method is called.
//     const observer = {
//         next: (data: Object) => {
//             this.socket.emit('message', JSON.stringify(data));
//         },
//     };

//     // we return our Rx.Subject which is a combination
//     // of both an observer and observable.
//     return Rx.Subject.create(observer, observable);
//   }

// }
