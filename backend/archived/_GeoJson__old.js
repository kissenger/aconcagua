
// const getRandomColour = require('./utils.js').getRandomColour;
// const Path = require('./_Path.js').Path;
const outerBoundingBox = require('../geoLib.js').outerBoundingBox;

/**
 * GeoJson class
 * @params input
 * @params inputType clarifies the format of input:
 *    'mongo': input is a mongo query document
 *    'path':  input is a list of Path objects
 */
class GeoJson {

  constructor(mongoDocument) {

    if ( !(mongoDocument instanceof Array) ) mongoDocument = [mongoDocument];
    let geoJsons = [];
    let bboxArray = [];

    mongoDocument.forEach ((document, i) => {

      let lngLats = document.geometry.coordinates;
      if (typeof lngLats[0][0][0] === 'undefined') lngLats = [lngLats];

      bboxArray.push(document.stats.bbox);
      lngLats.forEach(latLng => {
        geoJsons.push(this.getGeoJsonSegment(latLng, document));
      })

    });

    return {
      type: 'FeatureCollection',
      bbox: outerBoundingBox(bboxArray),
      features: geoJsons.map(x => x),
      properties: {
        pathId: mongoDocument[0]._id ? mongoDocument[0]._id : null
      }
    }

  }

  /**
   * creates a single geojson polyline from ...
   * @param {*} path array of Points
   * @param {*} props properties object (optional)
   */
  getGeoJsonSegment(path, props) {

    const feature = {};
    feature.type = 'Feature';
    feature.geometry = {
      type: 'Linestring',
      coordinates: path
    }
    feature.properties = {};
    feature.properties.color = '#FF0000';  //getRandomColour(this.counter);
    feature.properties.userId = props.userId;
    feature.properties.pathType = props.pathType;
    feature.properties.category = props.category;
    feature.properties.startTime = props.startTime;
    feature.properties.creationDate = props.creationDate;
    feature.properties.description = props.description;
    if (props.name) {
      feature.properties.name = props.name.length === 0 ? props.category + ' ' + props.pathType : props.name;
    };
    if (props.stats) {
      feature.properties.stats = {...props.stats, ...{startTime: props.startTime}}
    };

    return feature;
  }

}

module.exports = {
  GeoJson
}
