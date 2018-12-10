// Libraries and stuff
const express = require('express');
const app = express();
const multer = require('multer');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Local functions
const filefun = require('./filefun.js');
const { Match } = require('./class-match.js');

// Mongoose setup ... mongo password: p6f8IS4aOGXQcKJN
const mongoose = require('mongoose');
const MongoPath = require('./models/path-models');
const MongoUsers = require('./models/user-models');

/**
 *
 * setup
 *
 */

app.use(bodyParser.json());
app.use(express.static('backend/files'));

// Set up Cross Origin Resource Sharing (CORS )
app.use((req, res, next) => {
  // inject a header into the response
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
    );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Request-With, Content-Type, Accept, Authorization"
    );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
    );
  next();
});

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
 * user management
 *
 */

function verifyToken(req, res, next) {

  if (!req.headers.authorization) {
    return res.status(401).send('Unauthorised request');
  }

  const token = req.headers.authorization;
  if ( token === 'null' ) {
    return res.status(401).send('Unauthorised request');
  }

  const payload = jwt.verify(token, 'AppleCrumbleAndCustard');
  if ( !payload ) {
    return res.status(401).send('Unauthorised request');
  }

  req.userId = payload.subject;
  next();

}

app.post('/register', (req, res) => {
// take incoming user data in the form {email, password}, hash password,
// save to db, get json token and return to front end

  const jwtSecretKey = 'AppleCrumbleAndCustard';
  const saltRounds = 10;

  // confirm that email address does not exist in db
  MongoUsers.Users
    .findOne( {email: req.body.email}, {'_id': 1} )
    .then( (user) => {

      if ( user ) {
        // email already exists in db
        res.status(200).send('Email address is already registered');

      } else {
        // email is new
        bcrypt.hash(req.body.password, saltRounds).then( (hash) => {

          const userData = req.body;
          req.body['hash'] = hash;

          MongoUsers.Users.create(userData).then( (regUser) => {
            const token = jwt.sign( {subject: regUser._id}, jwtSecretKey);
            res.status(200).send({token});
          })
        })

      }

  })

});



app.post('/login', (req, res) => {

  const jwtSecretKey = 'AppleCrumbleAndCustard';

  // check that email address exists and return data in variable user
  MongoUsers.Users.findOne( {email: req.body.email}, {'hash': 1} ).then( (user) => {

    if (!user) {
      // user does not exist
      res.status(401).send('Email address is not registered');

    } else {
      // user exists
      bcrypt.compare(req.body.password, user.hash).then( (result) => {

        if (result) {
          // password is ok
          const token = jwt.sign({ subject: user._id }, jwtSecretKey);
          res.status(200).send({token});
        } else {
          // incorrect password
          res.status(401).send('Password does not match registered email');
        }

      })
    }
  })
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


app.post('/loadtracks/:singleOrBatch', verifyToken, upload.array('filename', 500), (req, res) => {

  // read data into buffer and interprete gpx
  const gpxBuffer = req.files.map(a => a.buffer.toString());
  const arrayOfPaths = gpxBuffer.map(filefun.gpxToPath);


  if ( req.params.singleOrBatch === 'batch' ) {

    // batch upload
    let arrayOfGeoJsons = arrayOfPaths.map(filefun.getSingleGeoJson);
    arrayOfGeoJsons = arrayOfGeoJsons.map( (path) => {
      path.isSaved = true;
      return path});

    MongoPath.Tracks
      .insertMany(arrayOfGeoJsons, {writeConcern: {j: true}})
      .then( (documents) => {
        res.status(201).json({ 'result': 'bulk write ok'});

        trackIds = documents.map( (d) => d._id );

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

    const singleGeoJson = filefun.getSingleGeoJson(arrayOfPaths[0]);

    // save to db
    MongoPath.Tracks
      .create(singleGeoJson)
      .then( (documents) => {
        res.status(201).json({ 'geoJson': filefun.getMultiGeoJson([documents]) });
      })
  }

});

app.post('/loadroutes', verifyToken, upload.single('filename'), (req, res) => {

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
app.post('/save-path/:type/:id', verifyToken, (req, res) => {

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
app.get('/delete-path/:type/:id', verifyToken, (req, res) => {

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
app.get('/get-paths-list/:type', verifyToken, (req, res) => {

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
app.get('/get-path-by-id/:type/:id/:idOnly', verifyToken, (req, res) => {

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
app.get('/get-path-auto/:type', verifyToken, (req, res) => {

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
app.get('/match-from-load/:id', verifyToken, (req, res) => {

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
        .find( { geometry: { $geoIntersects: { $geometry: geomQuery } }})
        .then( (results) => {

            console.log('Matched ' + results.length + ' tracks');
            const tracks = filefun.getMultiGeoJson(results);
            const newMatch = new Match();
            newMatch.run(route, tracks);

            MongoPath.Match.create(newMatch)

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
app.get('/match-from-db/:id', verifyToken, (req, res) => {

  const routeId = req.params.id;

  // Get match array from db
  console.log('match-from-db: get matches...');
  MongoPath.Match
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

          // format tracks, get matched geojsons and send to FE
          console.log('match-from-db: found ' + result.length + ' tracks');
          const tracks = filefun.getMultiGeoJson(result, 'track');
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

    MongoPath.Match
      .deleteOne({'routeId': pathId}, (err) => {});

  } else {
    // if this is a track, flush delete track from match data
    console.log('trkId: ' + pathId);

    // find all match data that contains trackId
    MongoPath.Match
      .find( { 'trksList': pathId } )
      .then( (matches) => {

        console.log('found ' + matches.length + ' matches')
        // console.log(matches.map( (r) => r._id ));

        matches.forEach( (m) => {


          const thisMatch = new Match(m)
          thisMatch.removeTrack(pathId);

          // update match data in db
          MongoPath.Match
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
        console.log('matchNewTrack: get routes...');
        MongoPath.Routes
          .find( { geometry: { $geoIntersects: { $geometry: geomQuery } } })
          .then( (results) => {

              const routes = filefun.getMultiGeoJson(results);
              const routeIds = results.map( (r) => r._id );
              console.log('matchNewTrack: matched  ' + results.length + ' routes to this track');

              // get the match data for selected routes
              MongoPath.Match
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
                    MongoPath.Match
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
