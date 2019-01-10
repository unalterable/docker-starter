var http = require('http');

setTimeout(() => {
  http.createServer(function (req, res) {
    res.write('Up and Running');
    res.end();
  }).listen(8080);
}, 5000)
