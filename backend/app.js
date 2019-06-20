// Libraries and stuff
const express = require('express');
const app = express();
const multer = require('multer');
const bodyParser = require('body-parser');
const request = require('request');

// Local functions
const Match = require('./_Match.js').Match;
const Notification = require('./_Notification.js').Notification;
const NewMatch = require('./_Match.js').NewMatch;
const Route = require('./_Path').Route;
const Path = require('./_Path').Path;
const GeoJson = require('./_GeoJson.js').GeoJson;
const PathCloud = require('./_Challenge.js').PathCloud;
const RoutesChallenge = require('./_Challenge.js').RoutesChallenge;
const ListData = require('./_ListData.js').ListData;
const auth = require('./auth.js');
const writeGpx = require('./gpx.js').writeGpx;
const readGpx = require('./gpx.js').readGpx;
const parseOSM = require('./gpx.js').parseOSM;
// const outerBbox = require('./geoLib.js').outerBbox;


// Mongoose setup ... mongo password: p6f8IS4aOGXQcKJN
const mongoose = require('mongoose');
const MongoPath = require('./models/path-models');
const MongoMatch = require('./models/match-models');
const MongoChallenges = require('./models/challenge-models');
const MongoNotice = require('./models/notification-models');
// const MongoUsers = require('./models/user-models');

// let osmPathsArray = {};

// Websocket
// https://stackoverflow.com/questions/22429744/how-to-setup-route-for-websocket-server-in-express
const websocket = require('express-ws')(app);

app.ws('/', (ws, req) => {
    ws.on('close', () => { console.log('Connected to websocket closed') });
})

websocket.getWss().on('connection', function(ws) {
  console.log('Connected to websocket');
  ws.send(JSON.stringify({data: 'connected'}));
});

app.listen(80);

/******************************************************************
 *
 * setup
 *
 ******************************************************************/

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

/******************************************************************
 *
 * mongo
 *
 ******************************************************************/

mongoose.connect('mongodb+srv://root:p6f8IS4aOGXQcKJN@cluster0-gplhv.mongodb.net/test?retryWrites=true')
  .then(() => {
    console.log('Connected to database');
  })
  .catch(() => {
    console.log('Connection to database failed');
  });

/*****************************************************************
 *
 * new file data is submitted from the front end
 *
 *****************************************************************/

var storageOptions = multer.memoryStorage()

var upload = multer({
  storage: storageOptions,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});





/*****************************************************************
 *
 * get .osm file from openstreetmaps api
 *
 *****************************************************************/

app.post('/get-osm-data/', auth.verifyToken, (req, res) => {

  // ensure user isauthorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  const boundingBox = req.body;
  const bboxAsString = boundingBox[0] + ',' + boundingBox[1] + ',' + boundingBox[2] + ',' + boundingBox[3];
  const osmUrl = 'http://api.openstreetmap.org/api/0.6/map?bbox=' + bboxAsString;

  request.get({url: osmUrl}, (error, response, body) => {
    if(error) {
      res.status(400).json({error: error});
    } else {

      const temp = parseOSM(body, boundingBox); // get array of lngLats
      pathCloud = new PathCloud(temp, userId);
      // console.log(pathCloud.getMongoObject());
      MongoChallenges.Challenges.create(pathCloud.getMongoObject()).then(documents => {
        res.status(201).json({geoJson: new GeoJson(documents, 'route')});
      });

    }
  });

});


/*****************************************************************
 *
 *  Import track or tracks from file
 *
 *
 *****************************************************************/
app.post('/import-tracks/:singleOrBatch', auth.verifyToken, upload.array('filename', 500), (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // read data into buffer and interprete gpx
  const gpxBuffer = req.files.map(a => a.buffer.toString());
  let paths = gpxBuffer.map(readGpx);

  if ( req.params.singleOrBatch === 'batch' ) {
    MongoPath.Tracks
      .insertMany(paths.map(p => p.mongoFormat(userId, true)), {writeConcern: {j: true}})
      .then( (documents) => {

        res.status(201).json({ 'result': 'bulk write ok'});
        trackIds = documents.map( (d) => d._id );

        // update match
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

    MongoPath.Tracks
      .create(paths.map(p => p.mongoFormat(userId, false)))
      .then( (documents) => {
        res.status(201).json({geoJson: new GeoJson(documents, 'route')});
      })
  }

});


/*****************************************************************
 *
 *  Import route from file
 *
 *
 *****************************************************************/

app.post('/import-route/', auth.verifyToken, upload.single('filename'), (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // Read file data & convert to geojson format
  const path = readGpx(req.file.buffer.toString()).mongoFormat(userId, false);
  path.userId = userId;  // inject userID into path object

  // Save route into database
  MongoPath.Routes.create(path).then( (documents) => {
    res.status(201).json({geoJson: new GeoJson(documents, 'route')});
  })


});


/*****************************************************************
 *
 *  Create a challenge
 *
 *
 *****************************************************************/

app.get('/create-challenge-from-path/:pathIds', auth.verifyToken, (req, res) => {

  console.log('>> create-challenge-from-path');

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // get an array of paths from the supplied route ids
  pathIds = req.params.pathIds.split(",");
  getPathsFromIdArray(pathIds, 'route').then( paths => {

    // create a new challenge, save to db and return data to frontend
    routesChallenge = new RoutesChallenge(paths, userId);

    MongoChallenges.Challenges.create(routesChallenge.getMongoObject()).then(document => {
      res.status(201).json({geoJson: new GeoJson(document, 'route')});
      console.log(document);

      // launch matching
      newMatchFromChallengeId(document._id).then( (newMatch) => {
        mongoModel('match').create(newMatch).then( () => {
          //TODO noftify not working
          notify(req.userId, req.params.id, 'route', 'New Challenge', 'Analysis of new challenge route complete');
        });
      });

    });

  });


})



  // if (challenge.type = 'paths') {

  //   query = challenge.pathIds.map( (x) => 'ObjectId(\'' + x + '\')');

  //   MongoRoutes.find({'_id': {'$in': query}}, {distance: 1, bbox: 1}).then( (result) => {
  //     totalDistance = result.map ( x => x.distance).reduce((prev, curr) => prev + curr);
  //     bbox = outerBbox(result.map( x => x.bbox))
  //     challenge['totalDistance'] = totalDistance;
  //     // launch matching
  //   })




//   // {type: 'paths',
//   // pathIds: [pathId1, pathId2],
//   // name: 'blah',
//   // description: 'blah blah'}

//   // {type: 'pathCloud',
//   // lngLats: [[lngLats], [lngLats]]
//   // name: 'blah',
//   // description: 'blah blah'}

//   // {type: 'pointCloud',
//   // lngLats: [lngLats],
//   // name: 'blah',
//   // description: 'blah blah'}

//     // ensure user is authorised
//   const userId = req.userId;
//   if ( !userId ) {
//     res.status(401).send('Unauthorised');
//   }

//   condition = {};
//   challenge = req.body;
//   if (challenge.type = 'paths') {

//     query = challenge.pathIds.map( (x) => 'ObjectId(\'' + x + '\')')
//     MongoRoutes.find({'_id': {'$in': query}}, {distance: 1, bbox: 1}).then( (result) => {
//       totalDistance = result.map ( x => x.distance).reduce((prev, curr) => prev + curr);
//       bbox = outerBbox(result.map( x => x.bbox))
//       challenge['totalDistance'] = totalDistance;
//       // launch matching
//     })


//   } else if (challenge.type = 'pathCloud') {

//     if (osmPathsArray) {       // global variable set by xxxxxxx(tbc)
//       challenge['lngLat'] = osmPathsArray.map(x => x.lngLat); // array of Path objects
//     } else {
//       res.status(400).json({error: 'no pathCloud ddata on the backend'});
//     }
//     totalDistance = osmPathsArray.map(x => x.distance).reduce((prev, curr) => prev + curr);
//     challenge['totalDistance'] = totalDistance;
//   }

//   MongoChallenges.create(challenge).then( () => {
//     res.status(200).json({status: 'success'});
//   });


// });



/*****************************************************************
 *
 *  Move  a path from one collection to another
 *
 *
 *****************************************************************/

// app.get('/move-path/:id/:from/:to', auth.verifyToken, (req, res) => {

//   let fromModel;
//   let toModel;
//   // ensure user is authorised
//   const userId = req.userId;
//   if ( !userId ) {
//     res.status(401).send('Unauthorised');
//   }

//   if ( req.params.from === 'challenge' ) { fromModel = MongoPath.Challenges };
//   if ( req.params.from === 'track' ) { fromModel  = MongoPath.Tracks } ;
//   if ( req.params.from === 'route' ) { fromModel  = MongoPath.Routes } ;

//   if ( req.params.to === 'challenge' ) { toModel = MongoPath.Challenges };
//   if ( req.params.to === 'track' ) { toModel  = MongoPath.Tracks } ;
//   if ( req.params.to === 'route' ) { toModel  = MongoPath.Routes } ;

//   fromModel.findOne( {'userId': userId, '_id': req.params.id} ).then((a) => {
//     const c = a.toObject();
//     delete c.__v;
//     delete c._id;
//     fromModel.findByIdAndRemove(mongoose.Types.ObjectId(req.params.id), (msg) => {});
//     toModel.create(c).then( (b) =>
//     {
//       res.status(201).json( {pathId: b._id} );

//       if ( req.params.to === 'challenge' ) {
//         // if route --> challenge then call match anal
//         getMatchFromImportRoute(userId, b._id)
//       }
//       if (req.params.to === 'route' ) {
//         // if challenge --> route then delete any match data
//         matchDelete(req.params.id, req.params.type);
//         res.status(201).json( {status: 'deleted ok'});
//       }

//     })
//   })

// });


/*****************************************************************
 *
 *  Save a path to database from review page
 *  id of path is provided
 *
 *****************************************************************/

app.post('/save-path/:type/:id',  auth.verifyToken, (req, res) => {

  // ensure user is authorised
  if ( !req.userId ) {
    res.status(401).send('Unauthorised');
  }

  // construct query based on incoming payload
  let condition = {_id: req.params.id, userId: req.userId};
  let filter = {isSaved: true};
  if ( typeof req.body.description !== "undefined" ) { filter['description'] = req.body.description; }
  if ( typeof req.body.name !== "undefined" ) { filter['name'] = req.body.name; }

  // query database, updating change data and setting isSaved to true
  mongoModel(req.params.type)
    .updateOne(condition, {$set: filter}, {writeConcern: {j: true}})
    .then( () => {
      res.status(201).json( {'result': 'save ok'} );

      if ( req.params.type === 'track' ) {
        matchNewTrack(req.params.id);

      } else if ( req.params.type === 'challenge' ) {
        newMatchFromChallengeId(req.params.id).then( (newMatch) => {
          mongoModel('match').create(newMatch).then( () => {
            //TODO noftify not working
            notify(req.userId, req.params.id, 'route', 'New Challenge', 'Analysis of new challenge route complete');
          });
        });

      } // if
    }) // then

});




/*****************************************************************
 *  Delete a path from database
 *  id of path is provided
 *****************************************************************/

app.get('/delete-path/:type/:id', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // construct query based on incoming payload
  let condition = {_id: req.params.id, userId: userId};
  let filter = {isSaved: false};

  // query database, updating change data and setting isSaved to true
  mongoModel(req.params.type)
    .updateOne(condition, {$set: filter})
    .then( () => { res.status(201).json( {'result': 'delete ok'} ) },
        (err) => { res.status(201).json(err) });

});


/*****************************************************************
 *  Retrieve a list of paths from database
 *****************************************************************/

app.get('/get-paths-list/:type/:offset', auth.verifyToken, (req, res) => {

  /**
   * returns only:
   *  stats
   *  name
   *  */
  console.log('>> get-paths-list');
  const LIMIT = 50 //number of items to return in one query

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // get the appropriate model and setup query
  let condition = {isSaved: true, userId: userId};
  let filter = {stats: 1, name: 1, pathTupe: 1, category: 1};
  let sort = {};

  if ( req.params.type === 'track' ) {
    filter['startTime'] = 1;
    sort['startTime'] = -1;
  } else {
    filter['creationDate'] = 1;
    sort['creationDate'] = -1;
  }

  // execute the query and return result to front-end
  mongoModel(req.params.type).countDocuments(condition).then( (count) => {
    mongoModel(req.params.type)
      .find(condition, filter).sort(sort).limit(LIMIT).skip(LIMIT*(req.params.offset))
      .then(documents => {
        res.status(201).json(new ListData(documents, count))
      });
  })
})


// /*****************************************************************
//  *  Retrieve a single path from database
//  *  id of required path is supplied
//  *****************************************************************/
// app.get('/get-path-by-id/:type/:id/:idOnly', auth.verifyToken, (req, res) => {

//   // ensure user is authorised
//   if ( !req.userId ) {
//     res.status(401).send('Unauthorised');
//   }

//   // query the database and return result to front end
//   if ( req.params.id === '0' ) res.status(201).json({'id': 0})
//   else {

//     console.log('get-path-by-id', req.params.id);

//     getPathFromId(req.params.id, req.params.type).then( path => {

//       if ( req.params.idOnly === 'true' ) res.status(201).json({pathId: path._id});
//       else {
//         if (req.params.type === 'challenge') {
//           getMatchFromDb(path).then( plotOptions => {
//             // console.log(1, req.params.id, plotOptions);
//             res.status(201).json({geoJson: new GeoJson(path), ...plotOptions});
//           });
//         } else {
//           // console.log(2);
//           res.status(201).json({geoJson: new GeoJson(path)});
//         }
//       }
//     })
//   }
// })


/*****************************************************************
 *  Retrieve a single path from database
 *  id of required path is supplied
 *****************************************************************/
app.get('/get-path-by-id/:type/:id', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  if ( !req.userId ) {
    res.status(401).send('Unauthorised');
  }

  // query the database and return result to front end
  getPathDocFromId(req.params.id, req.params.type).then( path => {

    if (req.params.type === 'challenge') {

      getMatchFromDb(path).then( plotOptions => {

        // console.log(1, req.params.id, plotOptions);
        res.status(201).json({geoJson: new GeoJson(path, 'route'), ...plotOptions});
      });
    } else {
      // console.log(2);
      res.status(201).json({geoJson: new GeoJson(path, 'route')});
    }
  })
})


/*****************************************************************
 *  Retrieve a single path from database
 *  Auto-select path based on:
 *    Route: Time route was uploaded
 *    Track: Time track was recorded
 *****************************************************************/
// app.get('/get-path-auto/:type', auth.verifyToken, (req, res) => {

//   // ensure user is authorised
//   const userId = req.userId;
//   if ( !userId ) {
//     res.status(401).send('Unauthorised');
//   }

//   let pathModel;
//   let condition = {}, sort = {};

//   // get the appropriate model
//   if ( req.params.type === 'route' ) { pathModel = MongoPath.Routes };
//   if ( req.params.type === 'challenge' ) { pathModel = MongoPath.Challenges };
//   if ( req.params.type === 'track' ) { pathModel = MongoPath.Tracks };

//   // construct query
//   condition['isSaved'] = 'true';
//   condition['userId'] = userId;
//   sort['startTime'] = -1;

//   // query the database, checking for zero returns and adjusting id accordingly
//   pathModel
//     .find(condition).sort(sort).limit(1)
//     .then(documents => {
//         res.status(201).json({
//           'id': documents.length === 0 ? 0 : documents[0]._id });
//     });

// })


/*****************************************************************
 * Save a user-created route to db
 *
 *
 *
 *****************************************************************/
app.post('/save-created-route/:type', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  if ( !req.userId ) {
    res.status(401).send('Unauthorised');
  }

  if ( req.params.type === 'track' ) {
    var path = new Track(req.body.name, req.body.description, req.body.geometry.coordinates);
  } else {
    var path = new Route(req.body.name, req.body.description, req.body.geometry.coordinates);
  }

  mongoModel(req.params.type).create(path.mongoFormat(req.userId, true)).then( (document) => {
    res.status(201).json({pathId: document._id});
  })
})



/*****************************************************************
 * Export a path to file
 *
 *
 *
 *****************************************************************/
app.get('/export-path/:type/:id/', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  if ( !req.userId ) {
    res.status(401).send('Unauthorised');
  }

  // Read file data & convert to geojson format

  MongoPath.Routes.find({userId: req.userId, _id: req.params.id}).then(document => {

    let route = new Path(document[0].geometry.coordinates, document[0].params.elev);
    writeGpx(route).then( () => {
      res.status(201).json({status: 'export ok'});
    });

  });

})

app.get('/download', (req, res) => {
  res.download('./exported_path.gpx', (err) => {
    if (err) {
      console.log('error: ' + err);
    } else {
      console.log('success');
    }
  } );

})



/*****************************************************************
 *
 *  Return all the tracks associated with a challenge
 *
 *****************************************************************/
app.get('/get-matched-tracks/:challengeId', auth.verifyToken, (req, res) => {

  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  getMatchingTracksFromMatchObj(req.params.challengeId).then( (tracks) => {
    console.log('> get-matched-tracks: matched ' + tracks.length + ' tracks');
    if (!tracks) {
      res.status(201).json({result: 'no matched tracks'})
    } else {
      res.status(201).json({geoTracks: geoJson = new GeoJson(tracks, 'tracks')})
    }
  })

})


/*****************************************************************
 *
 *  Flush database of all unsaved entries
 *
 *****************************************************************/
app.get('/flush', (req, res) => {

  MongoPath.Routes.deleteMany( {'isSaved': false} ).then( () => {
    MongoPath.Tracks.deleteMany( {'isSaved': false} ).then( () => {
      MongoChallenges.Challenges.deleteMany( {'isSaved': false} ).then( () => {
        res.status(201).json( {'result': 'db flushed'} );
      });
    });
  });

})


/*****************************************************************
 *
 *  Local functions
 *
 *****************************************************************/

/**
 * Perform route matching on a supplied challenge id
 * @param {string} challengeId is of the challenge
 * @param {object} returns match object
 */
function newMatchFromChallengeId(challengeId) {

  console.log('> newMatchFromChallengeId');
  return new Promise( resolve => {
    getPathDocFromId(challengeId, 'challenge').then( (challenge) => {
      getPathsMatchingPathId(challengeId, 'challenge', 'track').then( (tracks) =>{
        resolve(new NewMatch(challenge, tracks));  // invoking a new match runs the match algorithm
      });
    })

  })
}

/**
 * get a mongo db entry from a provided path id
 * @param {string} pid path id
 * @param {string} ptype path type - 'challenge', 'route', 'track' or 'match'
 */
function getPathDocFromId(pid, ptype) {

  console.log('>> getPathDocFromId: ', pid);
  return new Promise( resolve => {
    mongoModel(ptype).find({_id: pid}).then( (path) => {
      resolve(path[0]);
    })
  })

}

/**
 * get an array of paths from an array of path ids
 * @param {string} idArray array of path ids eg [ '5d0694bd853a1126e4787ed8', '5d0661bda130af1d7cbc86d8' ]
 * @param {string} ptype path type - 'challenge', 'route', 'track' or 'match'
 */

function getPathsFromIdArray(idArray, ptype) {

  console.log('>> getPathsFromIdArray: ', idArray);
  return new Promise( resolve => {

    // create array of promises
    let promises = [];
    for (let i = 0; i < idArray.length; i++) {
      promises.push(getPathDocFromId(idArray[i], ptype));
    }

    // wait for all async tasks to be complete before continuing (witchcraft!)
    Promise.all(promises).then( paths => {
      resolve(paths);
    } )

  });

}


/**
 * Get all the tracks that match to provided pathId (can be route or challenge)
 *
 * @param {string} pathId id the the path to match
 * @param {string} pathTypeToMatch type of path to match paths against
 * @param {string} pathTypeToSearch type of path to search for
 * @param {promise} returns a promise containing array of track objects
 */
function getPathsMatchingPathId(pathId, pathTypeToMatch, pathTypeToSearch) {

  console.log('> getPathsMatchingPathId');
  return new Promise( resolve => {

    mongoModel(pathTypeToMatch).find( {'_id': pathId} ).then( (pathToMatch) => {
      mongoModel(pathTypeToSearch).find({
        geometry: {
          $geoIntersects: {
            $geometry: {
              'type': 'Polygon',
              'coordinates': bbox2Polygon(pathToMatch[0].stats.bbox)
            }
          }
        }
      }).then( (matchedTracks) => {

        console.log('> getPathsMatchingPathId: Matched ' + matchedTracks.length + ' tracks');
        resolve(matchedTracks);

      })

    }) // mongoModel
  }) // promise
}


/**
* Retrieve match data from a provided challenge Id
* @param {object} challenge mongo challenge object **not just Id its the whole shebang
* @param {object} returns object containing plot contour and plot binary data
*/
function getMatchFromDb(challenge) {

  console.log('> getMatchFromDb');
  return new Promise( resolve => {
    MongoMatch.Match.find({challengeId: challenge._id}).then( (match) => {

      if ( match.length === 0 ) resolve();
      else {
        resolve({
          'geoContour': new GeoJson(challenge, 'contour', match[0]),
          'geoBinary': new GeoJson(challenge, 'binary', match[0])
        });
      }

    })
  })
}


/**
 *
 * @param {*} pathId
 * @param {*} pathType
 */
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
 *
 * @param {*} trkId
 */
function matchNewTrack(trkId) {

  return new Promise( resolve => {

    // find the target track from db
    console.log('> matchNewTrack');
    getPathDocFromId(trkId, 'track').then( (track) => {

      if (track.length === 0) resolve(0);
      getPathsMatchingPathId(trkId, 'track', 'route').then( (routes) => {

        if ( routes.length === 0 ) resolve(true);
        routes.forEach( (route) => {

          MongoMatch.Match.find( { 'routeId': route._id } ).then( (matches) => {

            if ( matches.length === 0 ) {

              // match doesnt exist for this route: create it
              let newMatch = new NewMatch(route, track);
              MongoMatch.Match.create(newMatch).then( () => {
                resolve(true);
              });

            } else {

              // match does exist: reform it and add track
              let newMatch = new Match(route, matches[0]);
              newMatch.addTracks(track);
              MongoMatch.Match
                .replaceOne( {'_id': matches[0]._id}, newMatch, {writeConcern: { j: true}}).then( () => {
                  resolve(true);
                });
            }

          })
        })
      })

    })
  });
}



/**
 * Get all the tracks that match a route from an existing match object
 * @param {string} cId challenge id
 * @param {promise} returns a promise containing array of track objects
 */
function getMatchingTracksFromMatchObj(cId) {

  console.log('> getMatchingTracksFromMatchObj');
  return new Promise( resolve => {

    MongoMatch.Match
      .find( {'challengeId': cId }, {'params.trksList': 1} )
      .then( (matches) => {

        if ( matches.length === 0) {
          resolve(0);
        } else {
          MongoPath.Tracks.find( { '_id': { $in: matches[0].params.trksList } } ).then( (tracks) => {
           resolve(tracks);
          })
        }

    })

  }) // promise
}



/**
 * Returns the model definition for a given path type
 * @param {string} pathType 'challenge', 'route', 'track' or 'match'
 */
function mongoModel(pathType) {
  switch(pathType) {
    case 'challenge': return MongoChallenges.Challenges;
    case 'route': return MongoPath.Routes;
    case 'track': return MongoPath.Tracks;
    case 'match': return MongoMatch.Match;
  }
}


/**
 * Converts standard bounding box to polygon for mongo geometry query
 * @param {number} bbox bounding box as [minlng, minlat, maxlng, maxlat]
 */
function bbox2Polygon(bbox) {
  return [[
    [ bbox[0], bbox[1] ],
    [ bbox[2], bbox[1] ],
    [ bbox[2], bbox[3] ],
    [ bbox[0], bbox[3] ],
    [ bbox[0], bbox[1] ]
  ]]
}


/**
 * Creates a notification item in database, and notifies the front end of its existence
 * @param {string} uId user id
 * @param {string} pId path id
 * @param {string} pType path type
 * @param {string} verb what has happened
 * @param {string} msg message
 */
function notify(uId, pId, pType, verb, msg) {

  MongoNotice.Notification.create(
    new Notification( uId, pId, pType, verb, msg, false)
  );

  // TODO filter out clients with incorrect user id
  websocket.getWss().clients.forEach( (client) => {
    console.log('client: ' + client);
    client.send(JSON.stringify(notice));
  });

}

module.exports = app;
