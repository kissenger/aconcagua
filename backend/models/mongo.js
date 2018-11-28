const mongoose = require('mongoose');

const pathSchema = mongoose.Schema({
  type: {type: String},
  isSaved: {type: Boolean, required: true, default: false},
  creationDate: {type: Date, default: Date.now},
  name: {type: String, required: true},
  description: {type: String},
  bbox: {type: [Number]},
  geometry: {
    type: {type: String, required: true},
    coordinates: {type: [[Number]], required: true}
  },
  properties: {
    timeArray: {type: [String]},
    startTime: {type: Date},
    color: {type: String},
    name: {type: String},
    pathStats: {
      totalDistance: {type: Number},
      totalAscent: {type: Number},
      totalDescent: {type: Number}
    }
  }
});

matchSchema = mongoose.Schema({
  routeId: {type: String},
  bbox: {type: [Number]},
  trksList: {type: [String]},
  points: [{
    lnglat: {type: [Number]},
    trks: {type: [String]},
    dist: {type: [Number]},
    nmatch: {type: Number}
  }]
});


// match = {
//   'routeId': rte._id,
//   'bbox': rte.bbox,
//   'trksList': [],
//   'points': rte.geometry.coordinates.map( (p) => {
//          return { 'lnglat': p ,
//                   'trks':   [] ,
//                   'dist':   [] ,
//                   'nmatch': 0 }
//     })
// }

var Tracks = mongoose.model('tracks', pathSchema);
var Routes = mongoose.model('routes', pathSchema);
var Match = mongoose.model('match', matchSchema);

module.exports = {
  Tracks: Tracks,
  Routes: Routes,
  Match: Match
};
