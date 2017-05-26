const path = require('path')
const fs = require('fs')
const modurl = require('url')
const config = require('./config')
const cache = require('./lib/cache')

const http = require('http')
const https = require('https')
// var httpAgent = new http.Agent({ keepAlive: true })
// var httpsAgent = new https.Agent({ keepAlive: true })


function proxy(req, res) {
	var href = config.PROXY_ROOT + req.url
	var client = http

	// set up the request options
	var opts = modurl.parse(href)
	opts.agent = false
	opts.method = req.method
	opts.headers = {
		'host': opts.host,
		'user-agent': req.headers['user-agent']
	}
	if (opts.protocol === 'https:') {
		client = https
		opts.port = 443
	}
	// console.log('opts', opts)

	// serve from cache
	var cached = config.CACHE_ENABLED ? cache.load(opts) : null
	if (cached) {
		res.writeHead(200, cached.head)
		res.write(cached.data)
		res.end()
		return;
	}

	// request the upstream
	var chunks = []
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
				location2 = location1.replace(config.PROXY_ROOT_REGX, config.LOCAL_ROOT)
				resp.headers['location'] = location2
				console.log('location', [location1, location2])
			}

			if (/text\/html/.test(resp.headers['content-type'])) {
				data = data.toString()

				// change absoulte urls to relative
				data = data.replace(config.PROXY_ROOT_REGX, '')

				// remove script blocks
				data = data.replace(/<script[\s\S]+?<\/script>/ig, '')

				// replace the hrefs
				// data = data.replace(/(href=['"]?\/)/ig, '$1' + proxyHost + '/')

				// update the content length header
				resp.headers['content-length'] = Buffer.byteLength(data)
			}

			cache.save(opts, resp, data)
			res.writeHead(resp.statusCode, resp.statusMessage, resp.headers)
			res.write(data)
			res.end()
		})
	}
}

// start the server
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
