import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginUserData = {};
  constructor(
    private auth: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
  }

  onLoginClick() {
    console.log(this.loginUserData);
    this.auth.loginUser(this.loginUserData)
      .subscribe(
        (res) => {
          console.log(res.token);
          localStorage.setItem('token', res.token);
          this.router.navigate(['paths', 'route']);
        }
        // ,
        // (err) => console.log(err)
      );
  }

}
