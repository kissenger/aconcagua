// Global imports
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { HttpService } from './http.service';

import { UtilsService } from './utils.service';
import { GeoService } from './geo.service';
import { TokenInterceptorService } from './token-interceptor.service';
import { WebsocketService } from './websocket.service';

// Local imports: components
import { AppComponent } from './app.component';
import { AboutComponent } from './about/about.component';
import { HomeComponent } from './home/home.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { PathsComponent } from './paths/paths.component';
import { CreateComponent } from './paths/create/create.component';
import { MapComponent } from './paths/map/map.component';
import { DataComponent } from './paths/data/data.component';
import { ListComponent } from './paths/data/list/list.component';
import { DetailComponent } from './paths/data/detail/detail.component';
import { FeedComponent } from './paths/data/feed/feed.component';
import { CreateDetailComponent } from './paths/data/create-detail/create-detail.component';
import { SummaryComponent } from './paths/data/summary/summary.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { InitialisationData } from './initialisationdata.model';
import { Controls } from './controls.model';
import { ControlFunctions } from './controlfunctions.service';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    AboutComponent,
    HomeComponent,
    FooterComponent,
    PathsComponent,
    MapComponent,
    DataComponent,
    DetailComponent,
    CreateDetailComponent,
    SummaryComponent,
    ListComponent,
    CreateComponent,
    LoginComponent,
    RegisterComponent,
    FeedComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [
    DataService,
    AuthService,
    HttpService,
    UtilsService,
    GeoService,
    AuthGuard,
    WebsocketService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptorService,
      multi: true
    },
    InitialisationData,
    Controls,
    ControlFunctions
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
