const path = require('path')
const fs = require('fs')
const modurl = require('url')
const config = require('../config')
const cache = require('./cache')

const http = require('http')
const https = require('https')
// var httpAgent = new http.Agent({ keepAlive: true })
// var httpsAgent = new https.Agent({ keepAlive: true })
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36'

/*
Sample
curl -v 'http://localhost:9000/https://httpbin.org/robots.txt'
*/

module.exports = proxy;
function proxy(src, dst) {
	// src.url itself should be the absolute url of the target server
	// example "/http://example.com/some/path/to/res?mode=1&type=n"
	var href = src.url.slice(1);
	var client = http

	// set up the request options
	var opts = modurl.parse(href)
	opts.agent = false
	opts.method = src.method
	opts.headers = Object.assign({}, src.headers, {
		'host': opts.host,
		'user-agent': src.headers['user-agent'] || UA
	})
	if (opts.protocol === 'https:') {
		client = https
		opts.port = 443
	}
	console.log(src.method, src.url);
	// console.log(opts.method, opts.href, opts.headers);
	// dst.write(JSON.stringify(opts, null, 4)); dst.end(); return;

	// serve from cache
	var cached = (config.CACHE_ENABLED && src.method === 'GET') ? cache.load(opts) : null
	if (cached) {
		dst.writeHead(200, cached.head)
		dst.write(cached.data)
		dst.end()
		return;
	}

	// request the upstream
	var timeout = 600000;
	var chunks = []
	var req = client.request(opts, onResponse)
	req.setTimeout(timeout);

	req.on('timeout', function() {
		console.error('Socket timeout after ' + timeout + 'ms');
	})
	req.on('error', function(err) {
		console.error('request error', err)
		req.abort();
	})

	src.on('error', function(err) {
		console.error('source error', err)
		req.abort();
	})
	src.on('data', function(chunk) {
		req.write(chunk)
		// console.log('request data', chunk.toString())
	})
	src.on('end', function() {
		// console.log('request end')
		req.end()
	})

	function onResponse(res) {
		console.log('request', opts.method, opts.href)
		// console.log('keep-alive', req.shouldKeepAlive)
		// console.log('headers', req._headers)
		// console.log('response', res.statusCode, res.statusMessage)
		// console.log('headers', res.headers)
		// console.log('\n')

		res.on('error', function(err) {
			console.error('response error', err)
			dst.writeHead(res.statusCode, res.statusMessage, res.headers)
			dst.end()
		})
		res.on('data', function(chunk) {
			// dst.write(chunk)
			chunks.push(chunk)
			// console.log('response data', chunk.toString())
		})
		res.on('end', function() {
			// console.log('response end')
			const data = Buffer.concat(chunks)

			if (config.CACHE_ENABLED && src.method === 'GET') cache.save(opts, res, data)
			dst.writeHead(res.statusCode, res.statusMessage, res.headers)
			dst.write(data)
			dst.end()
		})
	}
}
