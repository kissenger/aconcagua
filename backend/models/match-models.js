
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
  userId: {type: String, required: true},
  routeId: {type: String},
  bbox: {type: [Number]},
  trksList: {type: [String]},
  matchDistance: {type: Number},
  nmatch: {type: [Number]},
  lngLat: {type: [[Number]]},
  tracks: {type: [[String]]},
  dist: {type: [[]], default: undefined} // for some reason defining type Number throws an intermittent error
});

const Match = mongoose.model('match', matchSchema);

module.exports = {
  Match: Match
};
