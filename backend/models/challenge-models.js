
const mongoose = require('mongoose');

// challenge types:
//   path --> ref to pathId
//   pointcloud --> array of point coordinates
//   pathcloud --> array of array of latLngs

const challengeSchema = mongoose.Schema({

  userId: {type: String, required: true},
  type: {type: String, required: true},
  name: {type: String},
  description: {type: String},
  challengeDistance: {type: Number},
  isSaved: {type: Boolean, default: false},

  pathIds: {type: [String]},
  bbox: {type: [Number]},
  geometry: {
    coordinates: {type: [[[Number]]], required: true}
  },

  stats: {
    bbox: {type: [Number]},
    distance: {type: Number},
  },

  // match data
  matchStats: {
    distance: {type: Number},
    time: {type: Number},
    ascent: {type: Number},
    nVisits: {type: Number},
    longestVisit: {
      trackId: {type: Number},
      matchDistance: {type: Number}
    }
  }
});

const Challenges = mongoose.model('challenge', challengeSchema);

module.exports = {
  Challenges: Challenges
};

