// mongo password: p6f8IS4aOGXQcKJN
const express = require('express');
const multer = require('multer');
const filefun = require('./filefun.js');
const gpsfun = require('./gpsfun.js');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const MongoPath = require('./models/mongo');
const { Match } = require('./class-match.js');
// require('mongoose').set('debug', true);


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

// async function updateMatches (ids) {

//   for (var i = 0; i < ids.length; i++) { // note that forEach does not work with await

//     let x = await new Promise( resolve => {
//       matchNewTrack(ids[i]).resolve();
//       // if ( matchNewTrack(ids[i]) === true ) {
//       //   console.log('resolved');
//       //   resolve();
//       // }
//     });
//     console.log('**************' + x + ', ' + ids[i]);

//   }

// }

app.post('/loadtracks/:singleOrBatch', upload.array('filename', 500), (req, res) => {

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

        // matchNewTrack(trackIds[0]).then( () => {
        //   console.log('hurrah');
        //   matchNewTrack(trackIds[1]).then( () => {
        //     console.log('hurrah2');
        //   });
        // });
      });

      // try {
      //   updateMatches(trackIds);
      // } catch (error) {
      //   console.log(error);
      // }



        // promiseChain = Promise.resolve()
        // for (let i = 0; i < trackIds.length; i++) {
        //   console.log(i);
        //   promiseChain = promiseChain.then( () => {
        //     return new Promise( resolve => {
        //       if ( matchNewTrack(trackIds[i]) === true ) {
        //         resolve();
        //       }
        //     })
        //   });
        // }


      // id0 = new Promise ( (resolve, rej) => {
      //     if (matchNewTrack(id)) resolve();
      // })

      // id0.then( () => {
      //   console.log('******finished*******');
        // id1 = new Promise ( (resolve, rej) => {
        //   if ( matchNewTrack(trackIds[1]) ) {
        //     resolve();
        //   }
        // })
        // id1.then( () => {
        //   console.log('******finished*******');
        // })
      // })

      //   // trackIds.forEach( (id) => {
      //   //   matchNewTrack(id);
      //   // });





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
app.get('/match-from-db/:id', (req, res) => {

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


// function getMatchArrays(rtes, trks, mtchs) {

//   // checks all required data is present, then calls matchLogic
//   // rtes and trks supplied as multiGeoJson
//   // mtches is an array of match objects, ie mtchs = [{},{},{}]
//   // expectations:
//   //  1a) if n routes > 1 then n tracks = 1
//   //  1b) if n tracks > 1 then n routes = 1
//   //  i.e. n routes and n tracks cannot both be greater than 1
//   //  2) if optional argument matches is supplied, n routes = n matches

//   let matches = []; // array of match objects

//   // apply expectations on incoming data
//   if ( rtes.features.length > 1 && trks.features.length > 1 ) {
//     console.error( 'Error from getMatchArray: number of routes > 1 AND number of tracks > 1');
//     return
//   } else if ( mtchs ) {
//     if ( rtes.features.length !== mtchs.length ) {
//       console.error( 'Error from getMatchArray: number of routes <> number of matches');
//       return
//     }
//   }

//   // loop through each provided route
//   rtes.features.forEach( (rte, i) => {
//     if ( !mtchs ) {
//       // matches.push(new Match(rte._id, rte.bbox, rte.geometry.coordinates));
//       matches.push(new Match().fromNew(rte._id, rte.bbox, rte.geometry.coordinates));
//     } else {
//       // matches.push(mtchs[i]);
//       matches.push(new Match().fromExisting(mtchs[i]));
//     }

//   })

//   console.log(matches);
//   matchLogic(rtes, trks, matches);


// };

// class Data extends Match {
//   constructor(rtes, trks) {
//     data = matchLogic(rtes, trks, mtchs);
//     this.trks = data.trks;
//     this.dist = data.dist;
//     this.trksList = data.trksList;
//     this.getStats();
//   }

//   addTrack(trkId){
//     this.matchLogic();
//     this.getStats();
//   }

//   removeTrack(trkId) {

//     this.trksList.splice(this.trksList.indexOf(trkId), 1)
//     this.lnglat.forEach ( (p) => {
//       index = p.trks.indexOf(trkId);
//       if ( index !== -1 ) {
//         p.trks.splice(index, 1);
//         p.dist.splice(index, 1);
//         p.nmatch--;
//       }
//     })
//     this.getStats();

//   }

//   getStats(){

//   }
// }



// function matchLogic(r, t, m) {

  /**
   *  Route matching algorithm
   *
   * Notes from previous ruby implmentation
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

//   const fudgeFactor = 1.0001;
//   const matchTolerance = 20;  // in metres
//   let ms = [];

//   console.log('start match loops...');

//   // loop through each route
//   r.features.forEach( (rte) => {

//     // loop through each track
//     t.features.forEach( (trk) => {

//       // find bounding box coords for current track
//       minLng = trk.bbox[0] < 0 ? trk.bbox[0] * fudgeFactor : trk.bbox[0] / fudgeFactor;
//       minLat = trk.bbox[1] < 0 ? trk.bbox[1] * fudgeFactor : trk.bbox[1] / fudgeFactor;
//       maxLng = trk.bbox[2] < 0 ? trk.bbox[2] / fudgeFactor : trk.bbox[2] * fudgeFactor;
//       maxLat = trk.bbox[3] < 0 ? trk.bbox[3] / fudgeFactor : trk.bbox[3] * fudgeFactor;

//       // loop through each route point
//       rte.geometry.coordinates.forEach( (rtePt, iRtePt) => {

//         // check if current route point is within bounding box of current track
//         if ( rtePt[0] < maxLng && rtePt[0] > minLng && rtePt[1] < maxLat && rtePt[1] > minLat ) {

//           // if route point is within tracks bounding box, loop trhough track to find matching point(s)
//           trk.geometry.coordinates.forEach( (trkPt, itrkPt) => {

//             // get distance from route point and track point
//             dist = gpsfun.p2p(rtePt, trkPt);

//             // if dist < tol then update matched arrays
//             if ( dist < matchTolerance ) {
//               const index = match.points[iRtePt].trks.indexOf(trk._id)

//               if ( index === -1 ) {
//                 // if track is not found on current point, push it to array
//                 m.points[iRtePt].trks.push(trk._id);
//                 m.points[iRtePt].dist.push(dist);
//                 m.points[iRtePt].nmatch++;
//               } else {
//                 // otherwise update distance in array but dont record another match (nmatch) or trkId
//                 if ( dist < match.points[iRtePt].dist[index] ) {
//                   m.points[iRtePt].dist[index] = dist;
//                 }
//               }

//               // if track is not found in overall tracks list, push it
//               if ( match.trksList.indexOf(trk._id) === -1 ) {
//                 m.trksList.push(trk._id);
//               }
//             } // if ( dist ...

//           }) //trk.forEach

//         } // if ( rtePt[0] ...

//       }) // rteCoords.forEach

//     }) // t.forEach

//     console.log('finished match loops.')

//     m.stats = getMatchStats(m);
//     ms.push(m);

//   }) // rtes.forEach

//   return ms;

// }

// function getMatchStats(m) {

// }

module.exports = app;
