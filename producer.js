const path = require('path')
const fs = require('fs')
const http = require('http')

/*
*/

function handler(req, res) {
	res.setHeader('x-producer-ts', Date.now());
	res.writeHead(200, {'content-type': 'application/json'});

	const fpath = path.join(__dirname, 'data.txt');
	// const data = fs.createReadStream(fpath);
	// data.pipe(res);
	// return

	fs.open(fpath, 'r', function(err, fd) {
		// console.log('open', err, fd);
		function done(err) {
	    fs.closeSync(fd);
	    res.write('\n', 'utf8', function() {
				res.end(err);
			});
		}
		if (err) return done(err);

		fs.fstat(fd, function(err, stats) {
			// console.log('stats', err, stats);
			if (err) return done(err);

			const size = Math.min(512, stats.size);
      const length = 20;
			const offset = 0;
			let position = 0;

      function step() {
      	// console.log('step');
	      const buff = Buffer.alloc(length);
	      fs.read(fd, buff, offset, length, position, function(err, bytesRead, buff) {
					console.log('chunk', err, position, bytesRead);
					if (err) return done(err);
					const buffRead = buff.slice(0, bytesRead);
					res.write(buffRead, 'utf8', function() {
						position += bytesRead;
						(position < size) ? step() : done();
					});
	      });
    	}

    	step();
		})
	});
}

// start the server
const PORT = process.env.NODE_PORT || 4000;
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
