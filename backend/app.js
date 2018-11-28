// mongo password: p6f8IS4aOGXQcKJN
const express = require('express');
const multer = require('multer');
const filefun = require('./filefun.js');
const gpsfun = require('./gpsfun.js');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const MongoPath = require('./models/mongo');


// cmd window mongo launch:
// mongo mongodb+srv://root:p6f8IS4aOGXQcKJN@cluster0-gplhv.mongodb.net/test?retryWrites=true
mongoose.connect('mongodb+srv://root:p6f8IS4aOGXQcKJN@cluster0-gplhv.mongodb.net/test?retryWrites=true')
  .then(() => {
    console.log('Connected to database');
  })
  .catch(() => {
    console.log('Connection to database failed');
  });

app.use(bodyParser.json());
// app.post('', bodyParser.raw(), function (req, res) {

// } )

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


/**
 *
 * new file data is submitted from the front end
 *
 */


var storageOptions = multer.memoryStorage()

var upload = multer({
  storage: storageOptions,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.post('/loadtracks/:singleOrBatch', upload.array('filename', 500), (req, res) => {

  // read data into buffer and interprete gpx
  const gpxBuffer = req.files.map(a => a.buffer.toString());
  const arrayOfPaths = gpxBuffer.map(filefun.gpxToPath);


  if ( req.params.singleOrBatch === 'batch' ) {

    // batch upload
    let arrayOfGeoJsons = arrayOfPaths.map(filefun.getSingleGeoJson);
    arrayOfGeoJsons = arrayOfGeoJsons.map( (path) => {
                            path.isSaved = true;
                            return path}); // this doesnt look right, review
    MongoPath.Tracks
      .insertMany(arrayOfGeoJsons, {writeConcern: {j: true}})
      .then( () => {
        res.status(201).json( {'result': 'bulk write ok'} )
      });

  } else {

    // single upload
    const singleGeoJson = filefun.getSingleGeoJson(arrayOfPaths[0]);

    // save to db
  MongoPath.Tracks
      .create(singleGeoJson)
      .then( (documents) => {
        res.status(201).json({
          'geoJson': filefun.getMultiGeoJson([documents])
        });
      })
  }

});

app.post('/loadroutes', upload.single('filename'), (req, res) => {

  // Read file data & convert to geojson format
  const pathAsArray = filefun.gpxToPath(req.file.buffer.toString());
  const singleGeoJson = filefun.getSingleGeoJson(pathAsArray);
  // const multiGeoJson = filefun.getMultiGeoJson([singleGeoJson]);


  if ( singleGeoJson.type === 'track' ) {

  }

  // Save route into database
  const newRoute = new MongoPath.Routes(singleGeoJson);

  newRoute.save().then( documents => {
    res.status(201).json({
        'geoJson': filefun.getMultiGeoJson([documents])
      });
    }
  )

});

/**
 *  Save a path to database
 *  id of path is provided
 */
app.post('/save-path/:type/:id', (req, res) => {

  let pathModel;
  let condQ = {}, filtQ = {};

  // get the appropriate model
  if ( req.params.type === 'route' ) { pathModel  = MongoPath.Routes } ;
  if ( req.params.type === 'track' ) { pathModel  = MongoPath.Tracks } ;

  // construct query based on incoming payload
  condQ['_id'] = req.params.id;
  filtQ['isSaved'] = true;
  if ( req.body.newDesc ) { filtQ['description'] = req.body.newDesc; }
  if ( req.body.newName ) { filtQ['name'] = req.body.newName; }

  // query database, updating change data and setting isSaved to true
  pathModel
    .updateOne(condQ, {$set: filtQ}, {writeConcern: {j: true}})
    .then( () => {
      res.status(201).json( {'result': 'save ok'} );
      if ( req.params.type === 'track' ) {
        matchNewTrack(req.params.id);
      }
    },
      (err) => { res.status(201).json(err) });

});

/**
 *  Delete a path from database
 *  id of path is provided
 */
app.get('/delete-path/:type/:id', (req, res) => {

  let pathModel;
  let condQ = {}, filtQ = {};

  // get the appropriate model
  if ( req.params.type === 'route' ) { pathModel  = MongoPath.Routes} ;
  if ( req.params.type === 'track' ) { pathModel  = MongoPath.Tracks} ;

  // tidy up match data on delete
  matchDelete(req.params.id, req.params.type);

  // construct query based on incoming payload
  condQ['_id'] = req.params.id;
  filtQ['isSaved'] = false;

  // query database, updating change data and setting isSaved to true
  pathModel
    .updateOne(condQ, {$set: filtQ})
    .then( () => { res.status(201).json( {'result': 'delete ok'} ) },
        (err) => { res.status(201).json(err) });

});

/**
 *  Retrieve a list of paths from database
 */
app.get('/get-paths-list/:type', (req, res) => {

  let pathModel;
  let condQ = {}, filtQ = {}, sortQ = {};

  // get the appropriate model and setup query
  condQ['isSaved'] = true;
  filtQ['properties.pathStats.totalDistance'] = 1;
  filtQ['name'] = 1;

  if ( req.params.type === 'route' ) {
    pathModel = MongoPath.Routes;
    filtQ['properties.creationDate'] = 1;
    sortQ['properties.creationDate'] = -1;
  };

  if ( req.params.type === 'track' ) {
    pathModel = MongoPath.Tracks;
    filtQ['properties.startTime'] = 1;
    sortQ['properties.startTime'] = -1;
  };

  // execute the query and return result to front-end
  pathModel
    .find(condQ, filtQ).sort(sortQ)
    .then(documents => {res.status(201).json(documents)
          // documents.length !== 0 ? documents : {'result': 'failed to load tracks'});
    });

})

/**
 *  Retrieve a single path from database
 *  id of required path is supplied
 */
app.get('/get-path-by-id/:type/:id/:idOnly', (req, res) => {

  let pathModel;

  // get the appropriate model
  if ( req.params.type === 'route' ) { pathModel = MongoPath.Routes };
  if ( req.params.type === 'track' ) { pathModel = MongoPath.Tracks };

  // query the database and return result to front end
  // if id = zero (no data returned form query) send zero id
  if ( req.params.id === '0' ) {
    res.status(201).json({'id': 0});

  } else {
    pathModel.find({'_id': req.params.id}).then(documents => {

      if ( req.params.idOnly === 'true' ) {
        res.status(201).json({
          'id': documents[0]._id
        });
      } else {
        res.status(201).json({
          'geoJson': filefun.getMultiGeoJson(documents)
        });
      };

    });
  }
})

/**
 *  Retrieve a single path from database
 *  Auto-select path based on:
 *    Route: Time route was uploaded
 *    Track: Time track was recorded
 */
app.get('/get-path-auto/:type', (req, res) => {

  let pathModel;
  let condQ = {}, sortQ = {};

  // get the appropriate model
  if ( req.params.type === 'route' ) { pathModel = MongoPath.Routes };
  if ( req.params.type === 'track' ) { pathModel = MongoPath.Tracks };

  // construct query
  condQ['isSaved'] = 'true';
  sortQ['properties.startTime'] = -1;

  // query the database, checking for zero returns and adjusting id accordingly
  pathModel
    .find(condQ).sort(sortQ).limit(1)
    .then(documents => {
        res.status(201).json({
          'id': documents.length === 0 ? 0 : documents[0]._id });
    });

})

/**
 *  Flush database of all unsaved entries
 */
app.get('/flush', (req, res) => {

  MongoPath.Routes.deleteMany( {'isSaved': false} )
    .then( () => {
      MongoPath.Tracks.deleteMany( {'isSaved': false} )
        .then( () => {
          res.status(201).json( {'result': 'db flushed'} );
      });
    });

})

/**
 *  Perform route matching on newly uploaded route
 */
app.get('/match-from-load/:id', (req, res) => {

  const routeId = req.params.id;

  MongoPath.Routes
    .find({'_id': routeId})
    .then( (result)  => {

      const route = filefun.getMultiGeoJson( result );
      const geomQuery = {
        'type': 'Polygon',
        'coordinates': [[
          [ route.features[0].bbox[0], route.features[0].bbox[1] ],
          [ route.features[0].bbox[2], route.features[0].bbox[1] ],
          [ route.features[0].bbox[2], route.features[0].bbox[3] ],
          [ route.features[0].bbox[0], route.features[0].bbox[3] ],
          [ route.features[0].bbox[0], route.features[0].bbox[1] ]
        ]]
      };

      // find all tracks that intersect with selected route id
      console.log('Matching tracks...');
      MongoPath.Tracks
        .find(
          { geometry:
            { $geoIntersects:
              { $geometry: geomQuery }
            }
          })
        .then( (results) => {
            console.log('Matched ' + results.length + ' tracks');
            const tracks = filefun.getMultiGeoJson(results);
            match = getMatchArray(route, tracks);

            MongoPath.Match
              .create(match[0])
              .then( () => {
              })

            res.status(201).json({
              'geoRoute': route,
              'geoTracks': tracks,
              'geoBinary': filefun.getMatchGeoJson(match[0], 'binary'),
              'geoContour': filefun.getMatchGeoJson(match[0], 'contour'),
            })
        },
        (err) => { console.log(err) })

    },
    (err) => { console.log(err) })

})

/**
 *  Retrieve route matching data from previously matched route
 */
app.get('/match-from-db/:id', (req, res) => {

  const routeId = req.params.id;

  // Get the route from db as need to be sent to FE
  console.log('Finding matching routes...');

  MongoPath.Routes
  .find({'_id': routeId})
  .then( (result)  => {

    const route = filefun.getMultiGeoJson(result, 'route');

    // Get match array from db
    MongoPath.Match
      .find({'routeId': routeId})
      .then( (match) => {

          // extract list of matched tracks, and retrieve these from mongo
          MongoPath.Tracks
            .find( { '_id':
              { $in: match[0].trksList } } )
            .then( (result) => {
              console.log('Returned ' + result.length + ' tracks');

              // format tracks, get matched geojsons and send to FE
              const tracks = filefun.getMultiGeoJson(result, 'track');
              res.status(201).json({
                'geoRoute': route, //is this needed? Front end already has the route
                'geoTracks': tracks,
                'geoBinary': filefun.getMatchGeoJson(match[0], 'binary'),
                'geoContour': filefun.getMatchGeoJson(match[0], 'contour'),
              })
            },
            (err) => { console.log(err) }
          )

        },
        (err) => { console.log(err) }
       )

      },
      (err) => { console.log(err) }
  )
})


function matchDelete(pathId, pathType) {

  if ( pathType === 'route' ) {
    // if this is a route, then simply delete all match data for this route id

    MongoPath.Match
      .deleteMany( {'routeID': pathId} );

  } else {
    // if this is a track, flush delete track from match data

    console.log('trkId: ' + pathId);

    // find all match data that contains trackId
    MongoPath.Match
    .find( { 'trksList': pathId } )
    .then( (matches) => {
      matches.forEach( (m) => {

        matchId = m._id;

        // delete track_id from trksList
        m.trksList.splice(m.trksList.IndexOf(pathId), 1)

        // delete trackId and min dst from each point
        m.points.forEach ( (p) => {
          index = p.trks.IndexOf(pathId);
          if ( index !== -1 ) {
            p.trks.splice(index, 1);
            p.dist.splice(index, 1);
          }
        })

        // update match data in db
        MongoPath.Match
        .replaceOne(
          { '_id': matchId },
          { m },
          {})


      })
    })

  }

}

/**
 *  Perform route matching on newly uploaded track
 */
function matchNewTrack(trkId) {
  // trk is a multiGeoJson object

  console.log('matchNewTrack');
  MongoPath.Tracks
    .find({'_id': trkId})
    .then( (result)  => {
      console.log('trkId: ' + trkId);
      const track = filefun.getMultiGeoJson(result);
      const geomQuery = {
        'type': 'Polygon',
        'coordinates': [[
          [ track.features[0].bbox[0], track.features[0].bbox[1] ],
          [ track.features[0].bbox[2], track.features[0].bbox[1] ],
          [ track.features[0].bbox[2], track.features[0].bbox[3] ],
          [ track.features[0].bbox[0], track.features[0].bbox[3] ],
          [ track.features[0].bbox[0], track.features[0].bbox[1] ]
        ]]
      };

      // find all routes that intersect with selected route id
      console.log('Matching routes...');
      MongoPath.Routes
        .find(
          { geometry:
            { $geoIntersects:
              { $geometry: geomQuery }
            }
          })
        .then( (results) => {
            console.log('Matched ' + results.length + ' routes to this track');
            const routes = filefun.getMultiGeoJson(results);
            routeIds = results.map( (r) => r._id );
            console.log(routeIds);

            MongoPath.Match
              .find( { 'routeId':
                { $in: routeIds } } )
              .then( (matches) => {
                match = getMatchArray(routes, track, matches);


                // console.log('updated route: ' + )
                MongoPath.Match
                  .updateOne(
                    { 'id': { $in: match[0].trksList }},
                    { $set: {
                      'dist': match[0]['dist'],
                      'trksArray': match[0]['trksArray'],
                      'trksList': match[0]['trksList'],
                      'nmatch': match[0]['nmatch'] }
                    },
                    {})

                  .then( () => {
                  })

        },
        (err) => { console.log(err) }
        )  // MongoPath.Match

      },
      (err) => { console.log(err) }
      ) // MongoPath.Routes
    },

  (err) => { console.log(err) }
  ) // MongoPath.Tracks

}

/**
 *  Route matching algorithm
 *
 * NOtes from previous ruby implmentation
  # 1) for each route point check against all bounding boxes as you go, thereby removing outer loop ... quicker?
	# 2) optimise 'point skipping' logic
	# 3) implement 'point skipping' on route points
	# 4) better selection of tracks from mysql database
	# 5) better utilisation of mysql - return only sections of route of interest??
  # 6) employ route simplification?
 *
 * Implemntation approach
 * ======================
 * For each provided route
 *   For each provided track
 *     Loop through route points, for each route point
 *       Check if route point is within bounding box of current selected track
 *         If it is, then loop through all the points of the track to find point closest to current route point
 *         If it isn't, then just carry on
 *       End of loop
 *     End of loop
 *   End of loop
 * End of loop
 */
function getMatchArray(rtes, trks, mtchs) {

  // rtes and trks supplied as multiGeoJson
  // mtches is an array of match objects, ie mtchs = [{},{},{}]
  // expectations:
  //  1a) if n routes > 1 then n tracks = 1
  //  1b) if n tracks > 1 then n routes = 1
  //  i.e. n routes and n tracks cannot both be greater than 1
  //  2) if optional argument matches is supplied, n routes = n matches

  // match data details
  // ------------------
  // coords and bbox are repeated here to save sending another array to getMatchGeoJson function
  // match{
  //   routeId: 'string',
  //   bbox: [],
  //   trksList: [],
  //   points {
  //     latlng: [],
  //     trks: [],
  //     dist: [],
  //     nmatch: number
  //   }
  // }

  let match = {};
  let matchReturn = [];
  const fudgeFactor = 1.0001;
  const matchTolerance = 20;  // in metres

  // apply expectations on incoming data
  if ( rtes.features.length > 1 && trks.features.length > 1 ) {
    console.error( 'Error from getMatchArray: number of routes > 1 AND number of tracks > 1');
    return
  }
  if ( mtchs ) {
    if ( rtes.features.length !== mtchs.length ) {
      console.error( 'Error from getMatchArray: number of routes <> number of matches');
      return
    }
  }

  // loop through each provided route
  rtes.features.forEach( (rte, iRte) => {


    if ( mtchs ) {
      // if there is existing route match data
      console.log('found match array');
      match = mtchs[iRte];
      console.log(match);

    } else {
    // else if there isnt
      console.log('Didn\'t find match array');
      match = {
        'routeId': rte._id,
        'bbox': rte.bbox,
        'trksList': [],
        'points': rte.geometry.coordinates.map( (p) => {
               return { 'lnglat': p ,
                        'trks':   [] ,
                        'dist':   [] ,
                        'nmatch': 0 }
          })
      }

    }

    // loop through each track
    trks.features.forEach( (trk) => {

      // find bounding box coords for current track
      minLng = trk.bbox[0] < 0 ? trk.bbox[0] * fudgeFactor : trk.bbox[0] / fudgeFactor;
      minLat = trk.bbox[1] < 0 ? trk.bbox[1] * fudgeFactor : trk.bbox[1] / fudgeFactor;
      maxLng = trk.bbox[2] < 0 ? trk.bbox[2] / fudgeFactor : trk.bbox[2] * fudgeFactor;
      maxLat = trk.bbox[3] < 0 ? trk.bbox[3] / fudgeFactor : trk.bbox[3] * fudgeFactor;

      // loop through each route point
      rte.geometry.coordinates.forEach( (rtePt, iRtePt) => {

        // check if current route point is within bounding box of current track
        if ( rtePt[0] < maxLng && rtePt[0] > minLng && rtePt[1] < maxLat && rtePt[1] > minLat ) {

          // if route point is within tracks bounding box, loop trhough track to find matching point(s)
          trk.geometry.coordinates.forEach( (trkPt) => {

            // get distance from route point and track point
            dist = gpsfun.p2p(rtePt, trkPt);

            // if dist < tol then update matched arrays
            // match.dist[iRtePt] = dist < match.dist[iRtePt] ? dist : match.dist[iRtePt];
            if ( dist < matchTolerance ) {

              const index = match.points[iRtePt].trks.indexOf(trk._id)
              if ( index === -1 ) {
                // if track is not found on current point, push it to array
                match.points[iRtePt].trks.push(trk._id);
                match.points[iRtePt].dist = dist;
                match.points[iRtePt].nmatch++;

              } else {
                // otherwise update distance in array but dont record another match (nmatch) or trkId
                match.points[index].dist = match.points[index].dist < dist ? match.points[index].dist : dist
              }

              // if track is not found in overall tracks list, push it
              console.log('before, ' + match.trksList);
              if ( !match.trksList.includes(trk._id) ) {
                // match.trksList.push(trk._id);
              }
            } // if ( dist ...

          }) //trk.forEach

        } // if ( rtePt[0] ...

      }) // rteCoords.forEach

    }) // trks.forEach

    matchReturn.push(match);

  }) // rtes.forEach

  return matchReturn;

}

module.exports = app;
