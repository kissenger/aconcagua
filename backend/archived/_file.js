var fs = require('fs');

 /**
 * getPathFromGpx
 * Simply reads the content of a gpx file into an object named "data", which is
 * passed back to the calling routine.
 *
 * Notes on useage:
 *  --> return new Promise(function (resolve, reject) { // asynchronous code //});
 *          resolve is the object passed back if the promise is fulfilled
 *          reject is the object passed back if there is an error
 *
 *  --> fs.readfile(fn, "utf8", function (err, data) { // code // });
 *          err is data passed back in case of error
 *          data is passed back in case that file is read succesfully.
 */

function readFileBuffer(fn) {

  return new Promise(function (resolve, reject){
    fs.readFile(fn, "utf8", function(err, data){
      if (err) reject(err);
      else resolve(data);
    });
  });

};

module.exports = { readFileBuffer };
