import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class AuthService {

  private registerUrl = 'http://localhost:3000/register/';
  private loginUrl = 'http://localhost:3000/login/';

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
