
// DEFINES THE FRONT-END (CLIENT-SIDE) ROUTES

import { NgModule} from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { HowItWorksComponent } from './how-it-works/how-it-works.component';
import { AboutComponent } from './about/about.component';
import { PathsComponent } from './paths/paths.component';
import { LoadComponent } from './paths/load/load.component';
import { CreateComponent } from './paths/create/create.component';

// **named routes must be named different to any back-end routes defined
const appRoutes: Routes = [
  { path: '', component: HomeComponent},
  { path: 'how-it-works', component: HowItWorksComponent},
  { path: 'about', component: AboutComponent},
  { path: 'paths/:type', component: PathsComponent},
  { path: 'paths/:type/:id', component: PathsComponent},
  { path: 'paths/:type/:id/:match', component: PathsComponent},
  { path: 'load-paths/:type/:singleOrBatch', component: LoadComponent},
  { path: 'create-route/:type', component: CreateComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes)],
  exports: [RouterModule]
})

export class AppRoutingModule {}
