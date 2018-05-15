const path = require('path')
const fs = require('fs')
const modurl = require('url')
const config = require('../config')
const cache = require('./cache')

const http = require('http')
const https = require('https')

/*
log the request details along with the curl commandline
return 404 response
*/

module.exports = proxy;
function proxy(req, res) {
	var curl = [];
	curl.push('curl -v');
	curl.push(`-X ${req.method}`);
	for (var i = 0, n = req.rawHeaders.length; i < n; i += 2) {
		var key = req.rawHeaders[i];
		var val = req.rawHeaders[i + 1];
		curl.push(`-H '${key}: ${val}'`);
	}
	// Object.entries(req.headers).forEach(entry => {
	// 	var [key, val] = entry;
	// 	if (key === 'host') return;
	// 	curl.push(`-H '${key}: ${val}'`);
	// })
	curl.push(`'http://${req.headers.host}${req.url}'`);
	curl.push('-o /dev/null');
	console.log(curl.join(' '));

	console.log([req.method, req.url, 'HTTP/' + req.httpVersion].join(' '));
	console.log(JSON.stringify(req.headers, null, 4));

	const chunks = [];
	req.on('data', chunk => chunks.push(chunk))
	req.on('end', () => {
		res.writeHead(200, 'OK');
		if (chunks.length) {
			res.write(Buffer.concat(chunks).toString())
		}
		res.end();
	})

	return;
}
