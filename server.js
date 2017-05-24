const path = require('path')
const fs = require('fs')
const modurl = require('url')
const cache = require('./lib/cache')

const http = require('http')
const https = require('https')
// var httpAgent = new http.Agent({ keepAlive: true })
// var httpsAgent = new https.Agent({ keepAlive: true })

const LOCAL_ROOT = 'http://localhost:8080'
const PROXY_HOST = 'survivejs.com'
const PROXY_ROOT = 'https://' + PROXY_HOST
const PROXY_REGX = new RegExp('https?\:\/\/' + PROXY_HOST, 'ig')

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function app(req, res) {
	res.setHeader('Content-Type', 'text/plain')
	res.statusCode = 200
	res.write("This is proxy Server\n\nNext line")
	res.end()
}

function proxy(req, res) {
	var url = PROXY_ROOT + req.url
	var headers = {
		'host': PROXY_HOST,
		'user-agent': req.headers['user-agent']
	}

	var opts = modurl.parse(url)
	opts.method = req.method
	opts.headers = headers

	// if opts.agent is undefined, http.globalAgent object will be used
	// use an explicit keep alive agent
	// opts.agent = httpAgent
	// disable keep-alive sockets
	opts.agent = false

	var cached = cache.load(opts)
	if (cached) {
		res.writeHead(200, cached.head)
		res.write(cached.data)
		res.end()
		return;
	}

	var chunks = []
	var client = http
	if (opts.protocol === 'https:') {
		client = https
		// opts.agent = httpsAgent
		opts.port = 443
	}
	// console.log('opts', opts)

	var requ = client.request(opts, onResponse)
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
		console.log('request', opts.method, opts.href)
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
			var data = Buffer.concat(chunks)

			// replace the redirects
			var location1 = resp.headers['location']
			if (location1) {
				location2 = location1.replace(PROXY_REGX, LOCAL_ROOT)
				resp.headers['location'] = location2
				// console.log('location', location1, location2)
			}

			// replace the absolute urls and unpdate the content-length
			if (/text\/html/.test(resp.headers['content-type'])) {
				data = data.toString()
				data = data.replace(PROXY_REGX, '')
				data = new Buffer(data)
				resp.headers['content-length'] = data.length
			}

			cache.save(opts, resp, data)
			res.writeHead(resp.statusCode, resp.statusMessage, resp.headers)
			res.write(data)
			res.end()
		})
	}
}

const PORT = process.env.NODE_PORT || 8080
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
