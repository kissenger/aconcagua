const express = require('express');
const multer = require('multer');
// var gpxParse = require("gpx-parse");
var fs = require('fs');
const app = express();
// const bodyParser = require('body-parser');

// app.use(bodyParser.json());

// gst - to allow serving a local file, this does so on hhtp://localhost:3000/***.kml */
app.use(express.static('backend/files'));

// This sets up Cross Origin Resource Sharing (CORS )
// Sets up browser to accept data from backend server
app.use((req, res, next) => {
  // inject a header into the response
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
    );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Request-With, Content-Type, Accept"
    );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
    );
  //move on to the next middleware
  next();
});


// use multer middleware to handle file upload
const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    // cb(null, path.resolve(__dirname, ''));
    cb(null, './backend/files');
  },

  filename: (req, file, cb) => {
    //const name = file.originalname.toLowerCase().split(' ').join('-').substring(0, 10) + Date.now();
    const ext = file.originalname.substring(file.originalname.length - 4, file.originalname.length);
    const savedFileName= 'route' + Date.now() + '.gpx';
    // console.log(name);
    // cb(null, name + '.gpx');
    cb(null, savedFileName);
    // console.log(savedFileName)
  }

});

// when something is posted to /application, run the following code...
var upload = multer({storage: storage});
app.post('/application', upload.array('filename', 100), (req, res) => {
  const response = req.files;

  // console.log(__dirname + "\\files\\" + req.files[0].filename);
  var savedFileName = __dirname + "\\files\\" + req.files[0].filename;

  readGpxFile(savedFileName, function (err, data) {

    geoJsonObject = getJsonObj(data);
    // console.log(geoJsonObject);
    res.status(201).json(geoJsonObject);

  });

  // res.status(201).json({
  //   message: response
  // });
});

// app.get('/result', (req, res, next) => {



//   readGpxFile(function (err, data) {

//     geoJsonObject=getJsonObj(data);
//     res.status(201).json(geoJsonObject);

//   });


// });

// -----------------------------------------------------------------
// readGpxFile
// reads in designated .gpx file into array
// [[point number, lat, long, elev, timestamp], []..] etc
// -----------------------------------------------------------------
function readGpxFile(fn, cb) {

  fs.readFile(fn, "utf8", function(err, data){

    if(err) return cb(err);
    cb(null, data);          // run the callback function

  });

};

// -----------------------------------------------------------------
// getJsonObj
// processes data from gpx file and returns geoJson object
// -----------------------------------------------------------------
function getJsonObj(data) {

  var i = 0;         // used to protect from looping too long in error
  var endPos = 0;
  var coords = [];
  var timeArr = [];
  var maxLatValue = -180.0;
  var maxLngValue = -180.0;
  var minLatValue = 180.0;
  var minLngValue = 180.0;

  do {

    // Find start and end of valid track point
    startPos = data.indexOf("<trkpt", endPos);
    eolPos = data.indexOf("\n", startPos);
    endPos = data.indexOf("</trkpt", startPos) + 8;

    // If start or end tag not found in remainder of file, consider the matter to be closed
    if (startPos <= 0 || endPos <= 0 ) {
      // console.log("end of file...");
      break;
    }
    // Otherwise consider it a good job and take out the data we need
    else {

      // lat and long
      latPos = data.indexOf("lat",startPos);
      lngPos= data.indexOf("lon",startPos);
      latValue = parseFloat(data.slice(latPos,lngPos).match(/[-0123456789.]/g).join(""));
      lngValue = parseFloat(data.slice(lngPos,eolPos).match(/[-0123456789.]/g).join(""));

      // elevation
      elePos = data.indexOf("<ele>");
      eleEndPos = data.indexOf("</ele>");
      eleValue = parseFloat(data.slice(elePos,eleEndPos).match(/[-0123456789.]/g).join(""));

      // coords array
      // pointCoord = new coord(latValue, lngValue, eleValue);
      // pathData = new gpsData(pointCoord, timeStamp);
      // pathData.coord.push(pointCoord);
      // pathData.time.push(time);

      coords.push([lngValue, latValue, eleValue]);
      // coords.push(new point(latValue, lngValue, eleValue));

      // Calculate bounding box
      maxLatValue = latValue > maxLatValue ? latValue :  maxLatValue;
      maxLngValue = lngValue > maxLngValue ? lngValue :  maxLngValue;
      minLatValue = latValue < minLatValue ? latValue :  minLatValue;
      minLngValue = lngValue < minLngValue ? lngValue :  minLngValue;

      // timestamp
      timePos = data.indexOf("<time>");
      timeEndPos = data.indexOf("</time>");
      timeValue = data.slice(timePos,timeEndPos).match(/[-0123456789.TZ]/g).join("");

      timeArr.push(timeValue);

    }


    i++;
  } while (i < 100000);

  /**
   *
   * geoJSON object
   * standard: https://tools.ietf.org/html/rfc7946
   *
   */
  const geoJsonO = {
    "type": "FeatureCollection",
    "bbox": [minLngValue, minLatValue, maxLngValue, maxLatValue],

    "features": [
      {
        "type": "Feature",
        "id": "path001",
        "geometry": {
          "type": "LineString",
          "coordinates": coords
        },
        "properties": {
          "color": "blue",
          "timeArray": timeArr
        }
      }
    ]
  };

  // console.log(geoJsonO);
  return geoJsonO;
};

class point {
  constructor(lat, lng, elev) {
    this.lat = lat;
    this.lng = lng;
    this.elev = elev;
  }
};

module.exports = app;


