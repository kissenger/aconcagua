
const mongoose = require('mongoose');

// const matchSchema = mongoose.Schema({
//   userId: {type: String, required: true},
//   routeId: {type: String},
//   bbox: {type: [Number]},
//   trksList: {type: [String]},
//   matchDistance: {type: Number},
//   nmatch: {type: [Number]},
//   lngLat: {type: [[Number]]},
//   tracks: {type: [[String]]},
//   dist: {type: [[]], default: undefined} // for some reason defining type Number throws an intermittent error
// });

const matchSchema = mongoose.Schema({
  userId: {type: String},  //
  routeId: {type: String},
  bbox: {type: [Number]},
  stats: {
    matchDistance: {type: Number},          // total distance matched to route
    time: {type: Number},
    nVisits: {type: Number},
    longestVisit: {
      trackId: {type: Number},
      distance: {type: Number}
    }
  },
  params: {
    trksList: {type: [String]},             // list of unique track ids associated with this route
    nmatch: {type: [Number]},
    tracks: {type: [[String]]},             // capctures the track IDs matched to each route point
    dist: {type: [[]], default: undefined},   // captures shortest distance from each route point to closest point on each matched track
    time: {type: [[]], default: undefined},
    elev: {type: [[]], default: undefined}
  }
});







const Match = mongoose.model('match', matchSchema);

module.exports = {
  Match: Match
};
