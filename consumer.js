const path = require('path')
const fs = require('fs')
const http = require('http')

function handler(req, res) {
  console.log(req.method, req.url, req.headers);
  res.setHeader('x-consumer-ts', Date.now());
  const chunks = [];
  req.on('data', chunk => {
    console.log('chunk', chunk.length);
    chunks.push(chunk);
  });
  req.on('end', () => {
    const buf = Buffer.concat(chunks);
    const content = buf.toString() + '\nok\n';
    // res.setHeader('content-length', buf.length); // <-- trigger invalid response
    res.setHeader('content-length', Buffer.byteLength(content));
    res.writeHead(200, {'content-type': 'text/plain; encoding=utf8'});
    res.write(content);
    console.log(content);
  })
  req.on('close', () => {
    console.log('close');
  })
}

// start the server
const PORT = process.env.NODE_PORT || 4001;
const server = http.createServer(handler);
server.on('error', function(err) {
  console.error(err)
  process.exit(1)
})
server.listen(PORT, function (err) {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    console.log('Server running on port: %d', PORT)
  }
})
