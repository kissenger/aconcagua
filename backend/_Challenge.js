
const pathDistance = require('./geoLib.js').pathDistance;
const outerBoundingBox = require('./geoLib.js').outerBoundingBox;
const boundingBox = require('./geoLib.js').boundingBox;

OSM_PATH_LENGTH_THRESHOLD = 150;   // distance in m below which paths with be ignored

class Challenge {
  constructor(lngLats, userId) {
    this.lngLats = lngLats;
    this.userId = userId;
    //this.mongoObject = this.getMongoObject();
  }

  /**
   * Returns object in format for insertion into MongoDB
   * @param {string} userId
   * @param {boolean} isSaved
   */
  getMongoObject() {

    return  {
      userId: this.userId,
      type: this.type,
      geometry: {
        coordinates: this.lngLats
      },
      stats: {
        distance: this.distance,
        bbox: this.boundingBox
      }
    };
  }

}

class PathCloud extends Challenge{

  constructor(lngLats, userId) {

    const bboxArray = [];
    const selectedLngLats = [];
    let totalDist = 0;

    lngLats.forEach(segment => {
      const segmentDist = pathDistance(segment);
      if (segmentDist > OSM_PATH_LENGTH_THRESHOLD) {
        selectedLngLats.push(segment);
        totalDist += segmentDist;
        bboxArray.push(boundingBox(segment));
      };
    });

    super(selectedLngLats, userId);
    this.boundingBox = outerBoundingBox(bboxArray);
    this.distance = totalDist;
    this.type = 'pathCloud';
  }

}

module.exports = {
  PathCloud
}
