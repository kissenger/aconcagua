// Global imports
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DataService, MapService, UpdateListService } from './data.service';
import { AppRoutingModule } from './app-routing.module';

// Local imports: components
import { AppComponent } from './app.component';
import { HowItWorksComponent } from './how-it-works/how-it-works.component';
import { AboutComponent } from './about/about.component';
import { HomeComponent } from './home/home.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { PathsComponent } from './paths/paths.component';
import { LoadComponent } from './paths/load/load.component';
import { CreateComponent } from './paths/create/create.component';
import { MapComponent } from './paths/map/map.component';
import { DataComponent } from './paths/data/data.component';
import { ListComponent } from './paths/list/list.component';


@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    HowItWorksComponent,
    AboutComponent,
    HomeComponent,
    FooterComponent,
    PathsComponent,
    MapComponent,
    DataComponent,
    LoadComponent,
    ListComponent,
    CreateComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
  ],
  providers: [
    DataService,
    MapService,
    UpdateListService
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
