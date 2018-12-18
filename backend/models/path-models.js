const mongoose = require('mongoose');

const pathSchema = mongoose.Schema({
  type: {type: String},
  userId: {type: String, required: true},
  isSaved: {type: Boolean, default: false},
  creationDate: {type: Date, default: Date.now},
  name: {type: String, required: true},
  category: {type: String},
  description: {type: String},
  bbox: {type: [Number]},
  geometry: {
    type: {type: String, required: true},
    coordinates: {type: [[Number]], required: true}
  },
  properties: {
    params: {
      time: {type: [Number]},
      heartRate: {type: [Number]},
      cadence: {type: [Number]},
      elevation: {type: [Number]}
    },
    stats: {
      // color: {type: String},
      // name: {type: String},
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
    }
  }
});





const Tracks = mongoose.model('tracks', pathSchema);
const Routes = mongoose.model('routes', pathSchema);


module.exports = {
  Tracks: Tracks,
  Routes: Routes
};
