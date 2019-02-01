const path = require('path')
const fs = require('fs')
const modurl = require('url')
const config = require('../config')

const http = require('http')
const https = require('https')
// var httpAgent = new http.Agent({ keepAlive: true })
// var httpsAgent = new https.Agent({ keepAlive: true })
const UA = 'Mozilla/5.0'
const TAB = '    ';

const logFile = path.join(__dirname, '../out.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a+' });
function log(line) {
  logStream.write(line);
  logStream.write('\n');
}
function flush(logReq, logRes) {
  log('<request>')
  logReq.forEach(log)
  logRes.forEach(log)
  log('</request>')
}

function proxy(req, res) {
  var href = config.PROXY_ROOT + req.url;
  var client = http;
  var logReq = [];
  var logRes = [];

  const fname = req.url.split('/').pop();
  const fileReqText = path.join(__dirname, '../logs/' + fname) + '.req.json';
  const fileReqHead = path.join(__dirname, '../logs/' + fname) + '.req.head';
  const fileResText = path.join(__dirname, '../logs/' + fname) + '.res.json';
  const fileResHead = path.join(__dirname, '../logs/' + fname) + '.res.head';

  // set up the request options
  var opts = modurl.parse(href)
  opts.agent = false
  opts.method = req.method
  opts.headers = Object.assign({}, req.headers, {
    'host': opts.host,
    'user-agent': req.headers['user-agent'] || UA
  })
  if (opts.protocol === 'https:') {
    client = https
    opts.port = 443
  }
  // console.log('opts', opts)
  // res.write(JSON.stringify(opts, null, 4)); res.end(); return;

  logReq.push(opts.method + ' ' + opts.href);
  // Object.entries(opts.headers).forEach(function(entry) {
  //   logReq.push(TAB + entry[0] + ':' + entry[1]);
  // });

  let list = [];
  list.push(opts.method + ' ' + opts.href);
  Object.entries(opts.headers).forEach(function(entry) {
    list.push(entry[0] + ':' + entry[1]);
  });
  fs.writeFile(fileReqHead, list.join('\n'), err => err && console.error(err))

  // request the upstream
  var timeout = 600000;
  var chunks = [];
  var requ = client.request(opts, onResponse)
  requ.setTimeout(timeout);
  req.on('timeout', function() {
    logReq.push('Error: Socket timeout after ' + timeout + 'ms');
    req.abort();
    flush(logReq, logRes)
  })

  req.on('error', function(err) {
    logReq.push(err.toString())
    flush(logReq, logRes)
  })
  req.on('data', function(chunk) {
    requ.write(chunk)
    chunks.push(chunk)
  })
  req.on('end', function() {
    requ.end()
    if (chunks.length) {
      const data = Buffer.concat(chunks)
      fs.writeFile(fileReqText, data, err => err && console.error(err))
    }
  })

  function onResponse(resp) {
    var chunks = [];
    res.writeHead(resp.statusCode, resp.statusMessage, resp.headers);
    logRes.push(resp.statusCode + ' ' + resp.statusMessage);
    // Object.entries(resp.headers).forEach(function(entry) {
    //   logRes.push(TAB + entry[0] + ':' + entry[1]);
    // });

    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      let list = [];
      list.push(resp.statusCode + ' ' + resp.statusMessage);
      Object.entries(resp.headers).forEach(function(entry) {
        list.push(entry[0] + ':' + entry[1]);
      });
      fs.writeFile(fileResHead, list.join('\n'), err => err && console.error(err))
    }

    resp.on('error', function(err) {
      logRes.push(err.toString())
      res.end()
      flush(logReq, logRes)
    })
    resp.on('data', function(chunk) {
      res.write(chunk)
      chunks.push(chunk)
      // console.log('response data', chunk.toString())
    })
    resp.on('end', function() {
      // console.log('response end')
      res.end()
      flush(logReq, logRes)
      if (chunks.length) {
        const data = Buffer.concat(chunks)
        fs.writeFile(fileResText, data, err => err && console.error(err))
      }
    })
  }
}

module.exports = proxy;
