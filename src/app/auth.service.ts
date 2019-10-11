import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class AuthService {

  // If using Gordons laptop, this will work, otherwise uncomment the line below
  private hostName = '192.168.0.12';
  // private hostname = 'localhost';

  private registerUrl = 'http://' + this.hostName + ':3000/register/';
  private loginUrl = 'http://' + this.hostName + ':3000/login/';

  constructor( private http: HttpClient ) {}

  registerUser(user) {
    return this.http.post<any>(this.registerUrl, user);
  }

  loginUser(user) {
    return this.http.post<any>(this.loginUrl, user);
  }

  logoutUser() {
    localStorage.removeItem('token');
  }

  loggedIn() {
    return !!localStorage.getItem('token');   // double ! casts result to boolean
  }

  getToken() {
    return localStorage.getItem('token');
  }

}
