const Route = require('./_Path.js').Route;
const Track = require('./_Path.js').Track;

class GeoJson {
  // blah

  constructor( path, userId, isSaved ) {
    // console.log(path);
    this.userId = userId;
    this.isSaved = isSaved;
    this.category = path.category();
    this.type = 'Feature';
    this.geometry = {
      type: 'LineString',
      coordinates: path.points.map( (p) => p.lngLat)
    }
    this.properties = {
      params: path.params,
      stats: path.stats
    };
    this.bbox = [
      path.stats.bbox.minLng,
      path.stats.bbox.minLat,
      path.stats.bbox.maxLng,
      path.stats.bbox.maxLat
    ];
    if ( typeof path.name === 'undefined' ) {
      this.name = name;
    } else {
      if ( path instanceof Route ) {
        this.name = this.category + ' route';
      } else if ( path instanceof Track ) {
        this.name = this.category + ' track';
      }
    }

  }
}

module.exports = {
  GeoJson
}
