import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgModule } from '@angular/core';
import { DataService } from '../../../data.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@NgModule({
  imports: [
    FormsModule
  ]
})

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})

export class FeedComponent implements OnInit, OnDestroy {

  public feedService: any;
  public paramSubs: any;
  public notifications = [];
  public pathId: string;
  public pathType: string;

  constructor(
    private dataService: DataService,
    private router: Router,
    private activatedRouter: ActivatedRoute,
    ) {}

  ngOnInit() {

    this.feedService = this.dataService.newNotification.subscribe( (data) => {
      this.notifications.push(data);
    });

    this.paramSubs = this.activatedRouter.params.subscribe(params => {
      this.pathType = params.type;
      this.pathId = params.id;
    });


  }

  onClick( noticePathId: string ) {

    if ( this.pathType === 'challenge' &&  noticePathId === this.pathId ) {
      // already on required page, so just refresh
      window.location.reload();
    } else {
      // otherwise navigate
      this.router.navigate(['paths', 'challenge', noticePathId]);
    }

  }

  ngOnDestroy() {
    this.feedService.unsubscribe();
    this.paramSubs.unsubscribe();
  }

}

