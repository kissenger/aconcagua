const pathSchema = mongoose.Schema({

  userId: {type: String, required: true},
  creationDate: {type: Date, default: Date.now},
  isSaved: {type: Boolean, default: false},
  pathType: {type: String},
  category: {type: String},
  name: {type: String, required: true},   // only defined if usr has entered it
  description: {type: String},
  bbox: {type: [Number]},
  points: [{
    lngLat: {
      lng: {type: Number, required: true},
      lat: {type: Number, required: true}
    },
    elev: {type: Number},
    time: {type: String},
    heartRate: {type: Number},
    cadence: {type: Number}
  }],
  stats: {
    startTime: {type: String},
    duration: {type: Number},
    distance: {type: Number},
    pace: {type: Number},
    ascent: {type: Number},
    descent: {type: Number},
    p2p: {
      max: {type: Number},
      ave: {type: Number}
    },
    movingTime: {type: Number},
    movingDist: {type: Number},
    movingPace: {type: Number},
    hills: {type: [
      { dHeight: {type: Number},
        dDist: {type: Number},
        dTime: {type: Number},
        pace:  {type: Number},
        ascRate: {type: Number},
        gradient: {
          max: {type: Number},
          ave: {type: Number}
        }
      }
    ]},
    kmSplits: {type: [[Number]]},
    mileSplits: {type: [[Number]]}
  },
  matchStats: {
    distance: {type: Number},          // total distance matched to route
    time: {type: Number},
    ascent: {type: Number},
    nVisits: {type: Number},
    longestVisit: {
      trackId: {type: Number},
      matchDistance: {type: Number}
    }
  }
})
