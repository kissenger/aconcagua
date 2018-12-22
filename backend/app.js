// Libraries and stuff
const express = require('express');
const app = express();
const multer = require('multer');
const bodyParser = require('body-parser');

// Local functions
// const filefun = require('./filefun.js');
const Match = require('./_Match.js').Match;
const NewMatch = require('./_Match.js').NewMatch;
const Route = require('./_Path').Route;
const Path = require('./_Path').Path;
const GeoJson = require('./_GeoJson.js').GeoJson;
const ListData = require('./_ListData.js').ListData;
const auth = require('./auth.js');
const writeGpx = require('./gpx.js').writeGpx;
const readGpx = require('./gpx.js').readGpx;

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
        res.status(201).json({'geoJson': new GeoJson(documents)});
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
  MongoPath.Routes.create(path).then( documents => {
    res.status(201).json({geoJson: new GeoJson(documents)});
  })


});


/*****************************************************************
 *
 *  Save a path to database
 *  id of path is provided
 *
 *****************************************************************/

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
    .then( (document) => {
      // console.log(document);

      if ( req.params.type === 'track' ) {
        matchNewTrack(req.params.id);
        res.status(201).json( {'result': 'save ok'} );
      } else {
        getMatchFromImportRoute(req.params.id).then( () => {
          res.status(201).json( {'result': 'save ok'} );
        });
      }

    });

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


/*****************************************************************
 *  Retrieve a list of paths from database
 *****************************************************************/

app.get('/get-paths-list/:type/:offset', auth.verifyToken, (req, res) => {

  /**
   * returns only:
   *  stats
   *  name
   *  */

  // variables
  let pathModel;
  let condition = {}, filter = {}, sort = {};
  const LIMIT = 50 //number of items to return in one query

  // ensure user is authorised
  const userId = req.userId;

  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // get the appropriate model and setup query
  condition['isSaved'] = true;
  condition['userId'] = userId;
  filter['stats'] = 1;
  filter['name'] = 1;
  filter['pathType'] = 1;
  filter['category'] = 1;

  if ( req.params.type === 'route' ) {
    pathModel = MongoPath.Routes;
    filter['creationDate'] = 1;
    sort['creationDate'] = -1;
  };

  if ( req.params.type === 'track' ) {
    pathModel = MongoPath.Tracks;
    filter['startTime'] = 1;
    sort['startTime'] = -1;
  };

  // execute the query and return result to front-end
  pathModel
    .find(condition, filter).sort(sort).limit(LIMIT).skip(LIMIT*(req.params.offset))
    .then(documents => { res.status(201).json(new ListData(documents)) });

})


/*****************************************************************
 *  Retrieve a single path from database
 *  id of required path is supplied
 *****************************************************************/
app.get('/get-path-by-id/:type/:id/:idOnly', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // get the appropriate model
  if ( req.params.type === 'route' ) { var pathModel = MongoPath.Routes };
  if ( req.params.type === 'track' ) { var pathModel = MongoPath.Tracks };

  // query the database and return result to front end
  if ( req.params.id === '0' ) res.status(201).json({'id': 0})
  else {

    pathModel.find({userId: userId, _id: req.params.id}).then(documents => {

      if ( req.params.idOnly === 'true' ) {
        // request was from list component , for id only
        res.status(201).json({pathId: documents[0]._id});

      } else {
        // need to send everything

        let retRoute= {geoJson: new GeoJson(documents)};
        if ( req.params.type === 'route' ) {
            getMatchFromDb(documents[0]).then( (retMatch) => {
            res.status(201).json({...retRoute, ...retMatch});
          });

        } else {
          // not a route
          res.status(201).json(retRoute);
        }

      };

    });
  } // if (req ...)


})


/*****************************************************************
 *  Retrieve a single path from database
 *  Auto-select path based on:
 *    Route: Time route was uploaded
 *    Track: Time track was recorded
 *****************************************************************/
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
  sort['startTime'] = -1;

  // query the database, checking for zero returns and adjusting id accordingly
  pathModel
    .find(condition).sort(sort).limit(1)
    .then(documents => {
        res.status(201).json({
          'id': documents.length === 0 ? 0 : documents[0]._id });
    });

})


/*****************************************************************
 * Save a user-created route to db
 *
 *
 *
 *****************************************************************/
app.post('/save-created-route/', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // Read file data & convert to geojson format
  const path = new Route(req.body.name, req.body.description, req.body.geometry.coordinates);

  MongoPath.Routes.create(path.mongoFormat(userId, true)).then( (document) => {
    res.status(201).json({pathId: document._id});
  })
})



/*****************************************************************
 * Export a path to file
 *
 *
 *
 *****************************************************************/
app.get('/export-path/:type/:id', auth.verifyToken, (req, res) => {

  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // Read file data & convert to geojson format


  MongoPath.Routes.find({userId: userId, _id: req.params.id}).then(document => {

    let route = new Path(document[0].geometry.coordinates, document[0].params.elev);
    writeGpx(route).then(
      res.status(201).json({response: 'write ok!'})
    );

  });

})


/*****************************************************************
 *
 *  Flush database of all unsaved entries
 *
 *****************************************************************/
app.get('/flush', (req, res) => {

  MongoPath.Routes.deleteMany( {'isSaved': false} )
    .then( () => {
      MongoPath.Tracks.deleteMany( {'isSaved': false} )
        .then( () => {
          res.status(201).json( {'result': 'db flushed'} );
      });
    });

})


/*****************************************************************
 *
 *  Perform route matching on newly uploaded route
 *
 *****************************************************************/
function getMatchFromImportRoute(routeId) {

  return new Promise( resolve => {

    MongoPath.Routes.find( {'_id': routeId} ).then( (result) => {

      const route = result[0];
      const geomQuery = {
        'type': 'Polygon',
        'coordinates': [[
          [ route.stats.bbox[0], route.stats.bbox[1] ],
          [ route.stats.bbox[2], route.stats.bbox[1] ],
          [ route.stats.bbox[2], route.stats.bbox[3] ],
          [ route.stats.bbox[0], route.stats.bbox[3] ],
          [ route.stats.bbox[0], route.stats.bbox[1] ]
        ]]
      };

      // find all tracks that intersect with selected route id
      console.log('Matching tracks...');
      MongoPath.Tracks.find( { geometry: { $geoIntersects: { $geometry: geomQuery } }}).then( (tracks) => {

        // create match object
        console.log('Matched ' + tracks.length + ' tracks');
        const match = new NewMatch(route, tracks);

        // save to db
        MongoMatch.Match.create(match).then( () => {
          resolve({
            'geoBinary': match.plotBinary(),
            'geoContour': match.plotContour(),
          })
        });
      })
    })
  })
}


/*****************************************************************
 *
 *  Retrieve route matching data from previously matched route
 *
 *****************************************************************/

function getMatchFromDb(route) {

  return new Promise( resolve => {

    // Get match array from db
    MongoMatch.Match.find({'routeId': route._id}).then( (match) => {

      // check for no result
      if ( match.length === 0 ) {
        resolve();
      }
      else {
        var thisMatch = new Match(route, match[0]);
        resolve({
          'geoContour': thisMatch.plotContour(),
          'geoBinary': thisMatch.plotBinary()
        });
      }

    })
  })
}


/*****************************************************************
 *
 *  Deal with match data on deletion of track or route
 *
 ****************************************************************/

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


/*****************************************************************
 *
 *  Perform route matching on newly uploaded track
 *
 *****************************************************************/

 function matchNewTrack(trkId) {

  return new Promise( resolve => {

    // find the target track from db
    console.log('matchNewTrack: processing track ' + trkId);
    MongoPath.Tracks.find({'_id': trkId}).then( (results)  => {

      // check for no result
      if ( results.length === 0 ) {
        console.error('matchNewTrack: error! track not found: ' + trkId);
        res.status(201).json({'matchNewTrack: ': 'error'});
        resolve();
      }

      // get bounding box for search query
      const track = results[0];
      const geomQuery = {
        'type': 'Polygon',
        'coordinates': [[
          [ track.stats.bbox[0], track.stats.bbox[1] ],
          [ track.stats.bbox[2], track.stats.bbox[1] ],
          [ track.stats.bbox[2], track.stats.bbox[3] ],
          [ track.stats.bbox[0], track.stats.bbox[3] ],
          [ track.stats.bbox[0], track.stats.bbox[1] ]
        ]]
      };

      // find all routes that intersect with selected route id
      console.log('matchNewTrack: get routes...');
      MongoPath.Routes.find( { geometry: { $geoIntersects: { $geometry: geomQuery } } }).then( (routes) => {

        console.log('matchNewTrack: found ' + routes.length + ' matched routes');
        if ( routes.length === 0 ) resolve(true);

        // loop through route and find match data, if it exists
        routes.forEach( (route) => {
          MongoMatch.Match.find( { 'routeId': route._id } ).then( (matches) => {

            if ( matches.length === 0 ) {
              // match doesnt exist for this route: create it and save to db

              console.log('match did not exist, creating it')
              let newMatch = new NewMatch(route, track);
              MongoMatch.Match
                .create(newMatch)
                .then( () => { resolve(true); }
              );

            } else {
              // match does exist: reform it and add track

              console.log('match exists, creating it')
              let newMatch = new Match(route, matches[0]);
              newMatch.addTracks(track);
              MongoMatch.Match
                .replaceOne( {'_id': matches[0]._id}, newMatch, {writeConcern: { j: true}})
                .then( () => { resolve(true); }
              );
            }

          })
        })
      }) // MongoPath.Routes
    }) // MongoPath.Tracks
  });
}


/*****************************************************************
 *
 *  Return all the tracks associated with a route
 *
 *****************************************************************/
app.get('/get-matched-tracks/:routeId', auth.verifyToken, (req, res) => {

  console.log('get matched tracks');
  // ensure user is authorised
  const userId = req.userId;
  if ( !userId ) {
    res.status(401).send('Unauthorised');
  }

  // get trksList from required route
  MongoMatch.Match.find( {'routeId': req.params.routeId }, {'params.trksList': 1} ).then( (matches) => {

    // console.log('get matched tracks:' + matches);
    // retrieve tracks from db
    if ( matches.length === 0) {
      // no matches
    } else {
      // there are matches in the db
      MongoPath.Tracks.find( { '_id': { $in: matches[0].params.trksList } } ).then( (tracks) => {
        res.status(201).json({'geoTracks': new GeoJson(tracks)})
      })
    }

  })
})


module.exports = app;
