function getRandomColour(i) {

  const colorsArr = ['red', 'orange', 'blue', 'purple', 'green',  'brown', 'grey-blue'];

  if ( i > colorsArr.length ) {
    const letters = '456789ABCDEF';
    var color = '#';
    for (var j = 0; j < 6; j++) {
      color += letters[Math.floor(Math.random() * letters.length)];
    }
  } else {
    color = colorsArr[i];
  }

  return color;
}

// function wrapGeoJson(arrayOfGeoJsons) {

//   let minLat = 180, maxLat = -180, minLng = 180, maxLng = -180;

//   arrayOfGeoJsons.forEach( (geoJson, i) => {
//     minLat = geoJson.bbox[1] < minLat ? geoJson.bbox[1] : minLat;
//     minLng = geoJson.bbox[0] < minLng ? geoJson.bbox[0] : minLng;
//     maxLat = geoJson.bbox[3] > maxLat ? geoJson.bbox[3] : maxLat;
//     maxLng = geoJson.bbox[2] > maxLng ? geoJson.bbox[2] : maxLng;
//     geoJson.properties.color = getRandomColour(i);
//     geoJson.properties.name = geoJson.name;
//   })

//   return {
//     "type": "FeatureCollection",
//     "bbox": [minLng, minLat, maxLng, maxLat],
//     "features": arrayOfGeoJsons.map(x => x)
//   }

// };

function contourPalette(nLevels) {

  const highColour = '0000FF'; //blue
  const lowColour = 'FFFFFF';

  // populate array with reqd steps as ratio 0 --> 1
  var levels = [];
  while (levels.length < nLevels) levels.push(levels.length/(nLevels-1));

  // convert colour strings to rgb and interpolate to levels
  rgbArray = levels.map(x => getRGB(highColour,lowColour,x));

  // with converted rgb array, construct new colour HEXs
  var hexArray = [];
  rgbArray.forEach( (rgb) => {
    s = '#';
    rgb.forEach( (x) => {
      s = s + padInt(x.toString(16), 2);
    })
    hexArray.push(s);
  })

  return hexArray;

}

function getRGB(c1, c2, ratio) {
  var r = Math.ceil(parseInt(c1.substring(0,2), 16) * ratio + parseInt(c2.substring(0,2), 16) * (1-ratio));
  var g = Math.ceil(parseInt(c1.substring(2,4), 16) * ratio + parseInt(c2.substring(2,4), 16) * (1-ratio));
  var b = Math.ceil(parseInt(c1.substring(4,6), 16) * ratio + parseInt(c2.substring(4,6), 16) * (1-ratio));
  return [r, g, b];
}

function padInt(num, size) {
  var s = num;
  while (s.length < size) s = '0' + s
  return s;
}



// function getGeoJson(pathArray, style) {

//   // ensure we were passed an array, if not then make it one
//   if ( !(pathArray instanceof Array) ) pathArray=[pathArray];

//   let path = [];
//   let outerBbox = [ 180, 90, -180, -90 ]; //minLng, minLat, maxLng, maxLat

//   pathArray.forEach ((p, i) => {
//     const bbox = [p.stats.bbox[0], p.stats.bbox[1], p.stats.bbox[2], p.stats.bbox[3]];
//     this.stats = p.stats;
//     this.stats.startTime = p.startTime;

//     path.push({
//       type: 'Feature',
//       bbox: bbox,
//       geometry: {
//         type: 'linestring',
//         coordinates: p.geometry.coordinates
//       },
//       properties: {
//         userId: p.userId,
//         pathId: p._id,
//         creationDate: p.creationDate,
//         pathType: p.pathType,
//         description: p.description,
//         color: getRandomColour(i),
//         category: p.category,
//         name: p.name.length === 0 ? p.category + ' ' + p.pathType : p.name,
//         stats: this.stats
//       },
//     });

//     outerBbox[0] = bbox[0] < outerBbox[0] ? bbox[0] : outerBbox[0];
//     outerBbox[1] = bbox[1] < outerBbox[1] ? bbox[1] : outerBbox[1];
//     outerBbox[2] = bbox[2] > outerBbox[2] ? bbox[2] : outerBbox[2];
//     outerBbox[3] = bbox[3] > outerBbox[3] ? bbox[3] : outerBbox[3];

//   })

//   return {
//     "type": "FeatureCollection",
//     "bbox": outerBbox,
//     "features": path.map(x => x)
//   }


// }



module.exports = {
  getRGB,
  padInt,
  contourPalette,
  getRandomColour
};
