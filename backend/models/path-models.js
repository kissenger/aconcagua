const mongoose = require('mongoose');

const pathSchema = mongoose.Schema({

  userId: {type: String, required: true},
  creationDate: {type: Date, default: Date.now},
  isSaved: {type: Boolean, default: false},
  pathType: {type: String},
  startTime: {type: String},
  category: {type: String},
  name: {type: String},   // only defined if usr has entered it
  description: {type: String},
  geometry: {
    type: {type: String, required: true},
    coordinates: {type: [[Number]], required: true}
  },
  params: {
    elev: {type: [Number]},
    time: {type: [Number]},
    heartRate: {type: [Number]},
    cadence: {type: [Number]}
  },
  stats: {
    bbox: {type: [Number]},
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

pathSchema.index({ userId: 1, creationDate: 1});
pathSchema.index({ userId: 1, startTime: 1});



const Tracks = mongoose.model('tracks', pathSchema);
const Routes = mongoose.model('routes', pathSchema);


module.exports = {
  Tracks: Tracks,
  Routes: Routes
};
