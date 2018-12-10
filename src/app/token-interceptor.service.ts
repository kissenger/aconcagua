import { Injectable } from '@angular/core';
import { HttpInterceptor } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable()
export class TokenInterceptorService implements HttpInterceptor {

  constructor(
    private authService: AuthService,
  ) { }

  intercept(req, next) {
    console.log(req);
    const token = this.authService.getToken();
    if ( token ) {
      const tokenizedReq = req.clone({
        setHeaders: {
          Authorization: this.authService.getToken()
        }
      });
      console.log('there');
      return next.handle(tokenizedReq);
    } else {
      console.log('nowhere');
      return next.handle(req);
    }
  }
}
