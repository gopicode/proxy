const path = require('path')
const fs = require('fs')
const modurl = require('url')
const config = require('./config')
const http = require('http')
const https = require('https')

// const proxy = require('./lib/proxyEcho')
const proxy = require('./lib/proxySimple')
// const proxy = require('./lib/proxyHtml')
// const proxy = require('./lib/proxyRecord')

if (config.CACHE_ENABLED) {
	console.log('CACHE_ENABLED cache directory:', config.CACHE_ROOT);

	if (!fs.existsSync(config.CACHE_ROOT)) {
		console.error('Please create the cache directory:', config.CACHE_ROOT)
		process.exit(1)
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
