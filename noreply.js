const http = require('http')

function handler(req, res) {
	console.log(req.method, req.url, req.headers)
	// do not respond
}

// start the server
const PORT = process.env.NODE_PORT || 9090
const server = http.createServer(handler)
server.on('error', function(err) {
	console.error(err)
	process.exit(1)
})
server.listen(PORT, function (err) {
	if (err) {
		console.error(err)
		process.exit(1)
	} else {
		console.log('NoReply server running on port: %d', PORT)
	}
})
