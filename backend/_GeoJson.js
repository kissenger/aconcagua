

const getRandomColour = require('./utils.js').getRandomColour;

class GeoJson {

  // format data for transmission to the front end

  constructor( pathArray ) {

    // ensure we were passed an array, if not then make it one
    if ( !(pathArray instanceof Array) ) pathArray=[pathArray];

    let path = [];
    let outerBbox = [ 180, 90, -180, -90 ]; //minLng, minLat, maxLng, maxLat

    pathArray.forEach ((p, i) => {

      const bbox = [p.stats.bbox[0], p.stats.bbox[1], p.stats.bbox[2], p.stats.bbox[3]];

      path.push({
        type: 'Feature',
        bbox: bbox,
        geometry: {
          type: 'linestring',
          coordinates: p.geometry.coordinates
        },
        properties: {
          startTime: p.startTime,
          userId: p.userId,
          pathId: p._id,
          creationDate: p.creationDate,
          pathType: p.pathType,
          description: p.description,
          color: getRandomColour(i),
          category: p.category,
          name: p.name.length === 0 ? p.category + ' ' + p.pathType : p.name,
          stats: {...p.stats, ...{startTime: p.startTime}}
        },
      });

      outerBbox[0] = bbox[0] < outerBbox[0] ? bbox[0] : outerBbox[0];
      outerBbox[1] = bbox[1] < outerBbox[1] ? bbox[1] : outerBbox[1];
      outerBbox[2] = bbox[2] > outerBbox[2] ? bbox[2] : outerBbox[2];
      outerBbox[3] = bbox[3] > outerBbox[3] ? bbox[3] : outerBbox[3];

    })

    return {
      "type": "FeatureCollection",
      "bbox": outerBbox,
      "features": path.map(x => x)
    }

  }

}

module.exports = {
  GeoJson
}
