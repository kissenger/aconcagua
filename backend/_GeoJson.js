
// const getRandomColour = require('./utils.js').getRandomColour;
// const Path = require('./_Path.js').Path;
const outerBoundingBox = require('./geoLib.js').outerBoundingBox;


class GeoJson{

  /**
   * Returns a GeoJson feature collection object
   * @param {Mongo Document} mongoPathDocs can be array of docs or single dco returned from mongo
   * NOTE: if plotType is present will expect a single mongoPathDoc
   * @param {string} plotType 'binary', 'contour' or not present
   * @param {Mongo Document} mongoMatchDoc match document is binary or contour plot is reqd
   */
  constructor(mongoPathDocs, plotType, mongoMatchDoc) {

    mongoPathDocs = mongoPathDocs instanceof Array ? mongoPathDocs : [mongoPathDocs];
    let features = [];
    let bboxArray = [];

    mongoPathDocs.forEach(document => {

      let segments = typeof document.geometry.coordinates[0][0][0] === 'undefined' ? [document.geometry.coordinates] : document.geometry.coordinates;
      segments.forEach( (segment, i) => {
        if (!plotType) { features.push(new GeoJsonFeature(segment, null, getPathProps(document) )); }
        else if (plotType === 'binary')  { features.push(getBinaryFeatures(segment, mongoMatchDoc.params.nmatch[i])); }
        else if (plotType === 'contour') { features.push(getContourFeatures(segment, mongoMatchDoc.params.nmatch[i])); }
      })

      bboxArray.push(document.stats.bbox);
    })

    let stats = plotType ? mongoMatchDoc.stats : mongoPathDocs[0].stats;

    return {
      type: 'FeatureCollection',
      plotType: plotType ? plotType : 'route',
      // stats: 
      bbox: outerBoundingBox(bboxArray),
      features: features,
      properties: {
        pathId: mongoPathDocs[0] ? mongoPathDocs[0]._id : null,
        ...stats
      }
    }

  }

}


/**
 * Extracts key properties from path document 
 * @param {Mongo Document} doc mongo path document
 */
function getPathProps(doc) {
  return {
    userId: doc.userId,
    pathType: doc.pathType,
    category: doc.category,
    startTime: doc.startTime,
    creationDate: doc.creationDate,
    description: doc.description
  }
}

/**
 * returns an array of features coloured by whether mtached or not
 * @param {[number]} lngLats array of points a lngLat coordinates
 * @param {[number]} nmatch array of nmatch data from Mongo match db
 * @param {[GeoJsonFeature]} returns arrat of geojsonfeature class instances
 */
function getBinaryFeatures(lngLats, nmatch) {

  let slices = [];
  let i0 = 0;
  let c0;
  let wasMatched = false;

  for (let i = 1; i < lngLats.length; i++) {

    let isMatched = nmatch[i] === 0 ? false : true;
    const colour = ( isMatched && wasMatched ) ?  '#0000FF' : '#FF0000';

    if ( i > 1 && colour !== c0 || i === lngLats.length - 1 ) {
      segSlice = lngLats.slice(i0, i === (lngLats.length - 1) ? i+2 : i);
      slices.push(new GeoJsonFeature(segSlice, c0));
      i0 = i - 1;
    }

    c0 = colour;
    wasMatched = isMatched;
  }
  return slices;
}


class GeoJsonFeature {

  /**
   * Class containing a single GeoJson segment
   * @param {[number]} lngLats array of points a lngLat coordinates
   * @param {string} colour desired colour of line
   * @param {object} properties properties to add to segment
   */
  constructor (lngLats, colour, properties) {

    if (!properties) properties = {};
    if (!colour) colour = '#FF0000'

    return {
      type: 'Feature',
      geometry: {
        type: 'Linestring',
        coordinates: lngLats
      },
      properties: {
        color: colour,
        ...properties
      }
    };

  }

}

module.exports = {
  GeoJson
}
