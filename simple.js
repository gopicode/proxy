const path = require('path')
const fs = require('fs')
const modurl = require('url')
const config = require('./config')
const cache = require('./lib/cache')

const http = require('http')
const https = require('https')
// var httpAgent = new http.Agent({ keepAlive: true })
// var httpsAgent = new https.Agent({ keepAlive: true })
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36'


function proxy(req, res) {
	// req.url itself should be the absolute url of the target server
	// example "/http://example.com/some/path/to/res?mode=1&type=n"
	var href = req.url.slice(1);
	var client = http

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
	console.log(opts.method, opts.href, opts.headers);
	// res.write(JSON.stringify(opts, null, 4)); res.end(); return;

	// serve from cache
	var cached = (config.CACHE_ENABLED && req.method === 'GET') ? cache.load(opts) : null
	if (cached) {
		res.writeHead(200, cached.head)
		res.write(cached.data)
		res.end()
		return;
	}

	// request the upstream
	var timeout = 600000;
	var chunks = []
	var requ = client.request(opts, onResponse)
	requ.setTimeout(timeout);
	req.on('timeout', function() {
		console.error('Socket timeout after ' + timeout + 'ms');
		req.abort();
	})

	req.on('error', function(err) {
		console.error('request error', err)
	})
	req.on('data', function(chunk) {
		requ.write(chunk)
		// console.log('request data', chunk.toString())
	})
	req.on('end', function() {
		// console.log('request end')
		requ.end()
	})

	function onResponse(resp) {
		// console.log('request', opts.method, opts.href)
		// console.log('keep-alive', requ.shouldKeepAlive)
		// console.log('headers', requ._headers)
		// console.log('response', resp.statusCode, resp.statusMessage)
		// console.log('headers', resp.headers)
		// console.log('\n')

		resp.on('error', function(err) {
			console.error('response error', err)
			res.writeHead(resp.statusCode, resp.statusMessage, resp.headers)
			res.end()
		})
		resp.on('data', function(chunk) {
			// res.write(chunk)
			chunks.push(chunk)
			// console.log('response data', chunk.toString())
		})
		resp.on('end', function() {
			// console.log('response end')
			const data = Buffer.concat(chunks)

			if (config.CACHE_ENABLED && req.method === 'GET') cache.save(opts, resp, data)
			res.writeHead(resp.statusCode, resp.statusMessage, resp.headers)
			res.write(data)
			res.end()
		})
	}
}

// start the server
const PORT = process.env.NODE_PORT || config.LOCAL_PORT
const server = http.createServer(proxy)
server.on('error', function(err) {
	console.error(err)
	process.exit(1)
})
server.listen(PORT, function (err) {
	if (err) {
		console.error(err)
		process.exit(1)
	} else {
		console.log('Proxy server running on port: %d', PORT)
	}
})
