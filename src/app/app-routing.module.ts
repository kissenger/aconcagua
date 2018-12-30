
// DEFINES THE FRONT-END (CLIENT-SIDE) ROUTES

import { NgModule} from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PathsComponent } from './paths/paths.component';
// import { LoadComponent } from './paths/load/load.component';
import { CreateComponent } from './paths/create/create.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { AuthGuard } from './auth.guard';

// **named routes must be named different to any back-end routes defined
const appRoutes: Routes = [
  { path: '', component: HomeComponent},
  { path: 'paths/:type', component: PathsComponent, canActivate: [AuthGuard]},
  { path: 'paths/:type/:id', component: PathsComponent, canActivate: [AuthGuard]},
  { path: 'paths/:type/:id/:pageType', component: PathsComponent, canActivate: [AuthGuard]},
  // { path: 'load-paths/:type/:singleOrBatch', component: LoadComponent, canActivate: [AuthGuard]},
  { path: 'create-route', component: CreateComponent, canActivate: [AuthGuard]},
  { path: 'register', component: RegisterComponent},
  { path: 'login', component: LoginComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})

export class AppRoutingModule {}
