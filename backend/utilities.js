
  n = 5;
  const highColour = '0000FF';
  const lowColour = 'FFFFFF';
  var i = 0;
  var levels = [];
  colString = '';

  var levels = [];
  while (levels.length < n) levels.push(levels.length/(n-1));


  var hexArray = [];
  rgbArray = levels.map(x => getRGB(highColour,lowColour,x));
  rgbArray.forEach( (rgb) => {
    s = '';
    rgb.forEach( (x) => {
      s = s + padInt(x.toString(16), 2);
    })
    hexArray.push(s);
  })
console.log(hexArray);

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
