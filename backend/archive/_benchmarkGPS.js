var gpsfun = require('./gpsfun.js');

let testCases = [
  { latLng1: [50.59154, -2], latLng2: [50.59154, -2.007126] },
  { latLng1: [50.59154, -2], latLng2: [50.58927, -2] },
  { latLng1: [50.59154, -2], latLng2: [50.59154, -2] },
  { latLng1: [50.59154, -2], latLng2: [50.58927, -2.007126] },
  { latLng1: [50.58927, -2.007126], latLng2: [50.59154, -2] },
  { latLng1: [50.59154, -2.007126], latLng2: [50.592421, -2.005339], latLng3: [50.606714, -2.007571] },
  { latLng1: [50, -2], latLng2: [50, -2.1], latLng3: [50.01, -2.05] },
  { latLng1: [50, -2], latLng2: [50, -2.1], latLng3: [49.99, -2.05] },
];


for ( const testCase of testCases ) {
  let p2pOut = gpsfun.p2p(testCase.latLng1, testCase.latLng2);
  let brgOut = gpsfun.bearing(testCase.latLng1, testCase.latLng2);
  let p2lOut = "0";
  if ( ("latLng3" in testCase) ) {
    p2lOut = gpsfun.p2l(testCase.latLng1, testCase.latLng2, testCase.latLng3);
  }
  console.log(
    "p2p: " + parseFloat(p2pOut).toFixed(6) +
    ", brg: " + parseFloat(brgOut).toFixed(6) +
    ", p2l: " + parseFloat(p2lOut).toFixed(6)
  );
};

