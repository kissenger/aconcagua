// Libraries and stuff
const express = require('express');
const app = express();
const multer = require('multer');
const bodyParser = require('body-parser');

// Local functions
// const filefun = require('./filefun.js');
const Match = require('./_Match.js').Match;
const GeoJson = require('./_GeoJson.js').GeoJson;
const wrapGeoJson = require('./utils.js').wrapGeoJson;
const auth = require('./auth.js');
const gpx = require('./gpx.js');

// Mongoose setup ... mongo password: p6f8IS4aOGXQcKJN
const mongoose = require('mongoose');
const MongoPath = require('./models/path-models');
const MongoMatch = require('./models/match-models');
// const MongoUsers = require('./models/user-models');

/**
 *
 * setup
 *
 */

// Set up Cross Origin Resource Sharing (CORS )
app.use( (req, res, next) => {
  // inject a header into the response
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Origin, X-Request-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, PATCH, DELETE, OPTIONS");
  next();
});

// some stuff
app.use(bodyParser.json());
app.use(auth.authRoute);
app.use(express.static('backend/files'));

/**
 *
 * mongo
 *
 */

mongoose.connect('mongodb+srv://root:p6f8IS4aOGXQcKJN@cluster0-gplhv.mongodb.net/test?retryWrites=true')
  .then(() => {
    console.log('Connected to database');
  })
  .catch(() => {
    console.log('Connection to database failed');
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


app.post('/loadtracks/:singleOrBatch', auth.verifyToken, upload.array('filename', 500), (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // read data into buffer and interprete gpx
  const gpxBuffer = req.files.map(a => a.buffer.toString());
  const arrayOfPaths = gpxBuffer.map(gpx.toPath);

  if ( req.params.singleOrBatch === 'batch' ) {
    // batch upload

    let arrayOfGeoJsons = arrayOfPaths.map( (x) => new GeoJson(x, userId, true));

      // db operations
    MongoPath.Tracks
      .insertMany(arrayOfGeoJsons, {writeConcern: {j: true}})
      .then( (documents) => {
        res.status(201).json({ 'result': 'bulk write ok'});

        trackIds = documents.map( (d) => d._id );

        // ensures update of match data is done sequentially
        p = Promise.resolve();
        for (let i = 0; i < trackIds.length; i++) {
          p = p.then( () => new Promise( resolve => {
              matchNewTrack(trackIds[i]).then( () => resolve() );
            })
          );
        }

      });

  } else {
    // single upload
    // const singleGeoJson = getSingle(arrayOfPaths[0]);
    // const singleGeoJson = new GeoJson(arrayOfPaths[0], userId, false);
    // singleGeoJson.userId = userId;


    path = new GeoJson(arrayOfPaths[0], userId, false);

    // save to db
    MongoPath.Tracks
      .create(path)
      .then( (documents) => {
        res.status(201).json({ 'geoJson': wrapGeoJson([documents]) });
      })
  }

});

app.post('/loadroutes', auth.verifyToken, upload.single('filename'), (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // Read file data & convert to geojson format
  const pathAsArray = gpx.toPath(req.file.buffer.toString());
  // const singleGeoJson = getSingle(pathAsArray);
  const singleGeoJson = new GeoJson(pathAsArray, userId, false)

  // insert user id into daat object
  // singleGeoJson.userId = userId;

  // Save route into database
  MongoPath.Routes.create(singleGeoJson).then( documents => {
    res.status(201).json({
        'geoJson': wrapGeoJson([documents])
      });
    }
  )

});

/**
 *  Save a path to database
 *  id of path is provided
 */
app.post('/save-path/:type/:id',  auth.verifyToken, (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  let pathModel;
  let condition = {}, filter = {};

  // get the appropriate model
  if ( req.params.type === 'route' ) { pathModel  = MongoPath.Routes } ;
  if ( req.params.type === 'track' ) { pathModel  = MongoPath.Tracks } ;

  // construct query based on incoming payload
  condition['_id'] = req.params.id;
  condition['userId'] = userId;
  filter['isSaved'] = true;
  if ( req.body.newDesc ) { filter['description'] = req.body.newDesc; }
  if ( req.body.newName ) { filter['name'] = req.body.newName; }

  // query database, updating change data and setting isSaved to true
  pathModel
    .updateOne(condition, {$set: filter}, {writeConcern: {j: true}})
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
app.get('/delete-path/:type/:id', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  let pathModel;
  let condition = {}, filter = {};

  // get the appropriate model
  if ( req.params.type === 'route' ) { pathModel  = MongoPath.Routes} ;
  if ( req.params.type === 'track' ) { pathModel  = MongoPath.Tracks} ;

  // tidy up match data on delete
  matchDelete(req.params.id, req.params.type);

  // construct query based on incoming payload
  condition['_id'] = req.params.id;
  condition['userId'] = userId;
  filter['isSaved'] = false;

  // query database, updating change data and setting isSaved to true
  pathModel
    .updateOne(condition, {$set: filter})
    .then( () => { res.status(201).json( {'result': 'delete ok'} ) },
        (err) => { res.status(201).json(err) });

});

/**
 *  Retrieve a list of paths from database
 */
app.get('/get-paths-list/:type', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  console.log(userId);
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // variables
  let pathModel;
  let condition = {}, filter = {}, sort = {};

  // get the appropriate model and setup query
  condition['isSaved'] = true;
  condition['userId'] = userId;
  filter['properties.stats'] = 1;
  filter['name'] = 1;

  if ( req.params.type === 'route' ) {
    pathModel = MongoPath.Routes;
    filter['properties.creationDate'] = 1;
    sort['properties.creationDate'] = -1;
  };

  if ( req.params.type === 'track' ) {
    pathModel = MongoPath.Tracks;
    filter['properties.startTime'] = 1;
    sort['properties.startTime'] = -1;
  };

  // execute the query and return result to front-end
  pathModel
    .find(condition, filter).sort(sort)
    .then(documents => { res.status(201).json(documents) });

})

/**
 *  Retrieve a single path from database
 *  id of required path is supplied
 */
app.get('/get-path-by-id/:type/:id/:idOnly', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  let pathModel;
  let condition = {};

  // get the appropriate model
  if ( req.params.type === 'route' ) { pathModel = MongoPath.Routes };
  if ( req.params.type === 'track' ) { pathModel = MongoPath.Tracks };

  // query the database and return result to front end
  // if id = zero (no data returned form query) send zero id
  if ( req.params.id === '0' ) {
    res.status(201).json({'id': 0});

  } else {

    condition['userId'] = userId;
    condition['_id'] = req.params.id;

    pathModel.find(condition).then(documents => {

      if ( req.params.idOnly === 'true' ) {
        res.status(201).json({
          'id': documents[0]._id
        });
      } else {
        res.status(201).json({
          'geoJson': wrapGeoJson(documents)
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
app.get('/get-path-auto/:type', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  let pathModel;
  let condition = {}, sort = {};

  // get the appropriate model
  if ( req.params.type === 'route' ) { pathModel = MongoPath.Routes };
  if ( req.params.type === 'track' ) { pathModel = MongoPath.Tracks };

  // construct query
  condition['isSaved'] = 'true';
  condition['userId'] = userId;
  sort['properties.startTime'] = -1;

  // query the database, checking for zero returns and adjusting id accordingly
  pathModel
    .find(condition).sort(sort).limit(1)
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
app.get('/match-from-load/:id', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }
  const routeId = req.params.id;

  MongoPath.Routes
    .find({'_id': routeId})
    .then( (result)  => {

      const route = wrapGeoJson( result );
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
        .find( { geometry: { $geoIntersects: { $geometry: geomQuery } }})
        .then( (results) => {

            console.log('Matched ' + results.length + ' tracks');
            const tracks = wrapGeoJson(results);
            const newMatch = new Match();
            newMatch.run(route, tracks);

            MongoMatch.Match.create(newMatch);

            res.status(201).json({
              'geoRoute': route,
              'geoTracks': tracks,
              'geoBinary': newMatch.plotBinary(),
              'geoContour': newMatch.plotContour(),
            })
        },
        (err) => { console.log(err) })

    },
    (err) => { console.log(err) })

})

/**
 *  Retrieve route matching data from previously matched route
 */
app.get('/match-from-db/:id', auth.verifyToken, (req, res) => {

  const routeId = req.params.id;

  // Get match array from db
  MongoMatch.Match
    .find({'routeId': routeId})
    .then( (match) => {

      // check for no result
      if ( match.length === 0 ) {
        console.error('match-from-db: error! no matches found for route: ' + routeId);
        res.status(201).json({'match-from-db: ': 'error'});
        return;
      }
      const thisMatch = new Match(match[0]);

      // extract list of matched tracks, and retrieve these from mongo
      console.log('match-from-db: get tracks...');
      MongoPath.Tracks
        .find( { '_id': { $in: match[0].trksList } } )
        .then( (result) => {

          // format tracks, get matched geojson and send to FE
          console.log('match-from-db: found ' + result.length + ' tracks');
          const tracks = wrapGeoJson(result, 'track');

          res.status(201).json({
            'geoTracks': tracks,
            'geoContour': thisMatch.plotContour(),
            'geoBinary': thisMatch.plotBinary()
          })
          console.log('match-from-db: finished');

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
    console.log('routeId: ' + pathId);

    MongoMatch.Match
      .deleteOne({'routeId': pathId}, (err) => {});

  } else {
    // if this is a track, flush delete track from match data
    console.log('trkId: ' + pathId);

    // find all match data that contains trackId
    MongoMatch.Match
      .find( { 'trksList': pathId } )
      .then( (matches) => {

        console.log('found ' + matches.length + ' matches')
        // console.log(matches.map( (r) => r._id ));

        matches.forEach( (m) => {


          const thisMatch = new Match(m)
          thisMatch.removeTrack(pathId);

          // update match data in db
          MongoMatch.Match
            .replaceOne( {'_id': m._id}, thisMatch, { writeConcern: { j: true } } )
            .then( (msg) => {console.log(msg)})

      })
    })

  }

}

/**
 *  Perform route matching on newly uploaded track
 */
function matchNewTrack(trkId) {

  return new Promise( resolve => {
    // find the target track from db
    console.log('matchNewTrack: get tracks...');
    MongoPath.Tracks
      .find({'_id': trkId})
      .then( (result)  => {

        // check for no result
        if ( result.length === 0 ) {
          console.error('matchNewTrack: error! track not found: ' + trkId);
          res.status(201).json({'matchNewTrack: ': 'error'});

          // resolve the promise
          resolve();
        }

        // convert to geoJson and get bounding box for search query
        const track = wrapGeoJson(result);
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

        console.log(geomQuery[0]);

        // find all routes that intersect with selected route id
        console.log('matchNewTrack: get routes...');
        MongoPath.Routes
          .find( { geometry: { $geoIntersects: { $geometry: geomQuery } } })
          .then( (results) => {

              const routes = wrapGeoJson(results);
              const routeIds = results.map( (r) => r._id );
              console.log('matchNewTrack: matched  ' + results.length + ' routes to this track');

              // get the match data for selected routes
              MongoMatch.Match
                .find( { 'routeId': { $in: routeIds } } )
                .then( (matches) => {

                  // get Ids of matches (in case route matches more than one route)
                  console.log('matchNewTrack: found ' + matches.length + ' match');

                  if (matches.length === 0 ) {
                    // resolve the promise
                    resolve();
                  }
                  // loop through each returned match
                  matches.forEach( (m) => {

                    // const thisMatch = new Match(m.length === 0 ? null : m);
                    const thisMatch = new Match(m);
                    thisMatch.run(routes, track);

                    // save to db
                    MongoMatch.Match
                      .replaceOne( {'_id': m._id}, thisMatch, {writeConcern: { j: true}})
                      .then( (msg) => {
                        console.log(msg);

                        // resolve the promise
                        resolve(true);
                      });

                  })

              })  // MongoPath.Match
          }) // MongoPath.Routes
      }) // MongoPath.Tracks
    });

}

module.exports = app;
