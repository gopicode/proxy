const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')
const mime = require('mime')
const crypto = require('crypto')
const zlib = require('zlib')
const modurl = require('url')
const { URL } = modurl;

const config = require('../config')
const {pick} = require('./helper');

function getUrlDigest(url) {
  const uobj = typeof url === 'string' ? new URL(url) : url;
  const { host, pathname, searchParams } = uobj;
  const searchKeys = searchParams.keys();
  const keys = Array.from(searchKeys).sort();
  const values = keys.map(key => [key, searchParams.get(key)].join('='));
  const href = [host, pathname, '?', values.join('&')].join('');
  const hashCode = crypto.createHash('sha256').update(href).digest('hex');
  return hashCode;
}

const CRLF = '\r\n';
const okHeads = ['content-type', 'last-modified'];

const cache = module.exports = {
	__makeUri: function(opts) {
		var host = opts.host || opts.headers.host
		var parts = modurl.parse(opts.href)
		var uri = parts.pathname
		if (!/\.\w+$/.test(uri)) {
			uri += uri.substr(-1) === '/' ? 'index.html' : '/index.html'
		}
		return host + uri
	},

	save: function(opts, resp, data) {
		if (resp.statusCode != 200) return
		let digest = getUrlDigest(opts.href);

		try {
			if (resp.headers['content-encoding'] === 'gzip') {
				data = zlib.gunzipSync(data);
			}
		} catch(ex) {
			console.error(ex.stack || ex);
			return;
		}

		let dpath = path.join(config.CACHE_ROOT, digest.substr(0, 7));
		let hashFile = path.join(dpath, '/hash.txt');
		if (fs.existsSync(dpath)) {
			let hashCode = fs.readFileSync(hashFile).toString();
			// collision in the short hash code. fallback to the full digest based directory
			if (hashCode !== digest) {
				dpath = path.join(config.CACHE_ROOT, digest);
			}
		}

		mkdirp.sync(dpath);
		fs.writeFileSync(hashFile, digest);

		const reqLine = opts.method + ' ' + opts.href
		const reqHeads = Object.entries(opts.headers).map(it => it.join(':'))
		const reqFile = path.join(dpath, '/req.txt')
		let reqContent = [reqLine].concat(reqHeads).join(CRLF);
		fs.writeFileSync(reqFile, reqContent);

		const resLine = resp.statusCode + ' ' + resp.statusMessage;
		const resHeads = Object.entries(resp.headers).map(it => it.join(':'))
		const resFile = path.join(dpath, '/res.txt')
		let resContent = [resLine].concat(resHeads).join(CRLF);
		fs.writeFileSync(resFile, resContent);

		const dataFile = path.join(dpath, '/data.txt');
		fs.writeFileSync(dataFile, data);

		console.log('[cache] save', dpath, opts.href);
	},

	load: function(opts) {
		let digest = getUrlDigest(opts.href);

		// try the short hash code path
		let dpath = path.join(config.CACHE_ROOT, digest.substr(0, 7));
		if (!fs.existsSync(dpath)) {
			// fallback to full hash code path
			dpath = path.join(config.CACHE_ROOT, digest);
			if (!fs.existsSync(dpath)) return;
		}

		const dataFile = path.join(dpath, '/data.txt');
		if (!fs.existsSync(dataFile)) return;
    const stats = fs.statSync(dataFile);
    const timeDiff = Date.now() - stats.mtime.getTime();
    if (timeDiff > config.CACHE_TTL) {
	    console.log('[cache] expired. timeDiff %d days', timeDiff/60/60/24, dpath, opts.href);
    	return;
    }
		const data = fs.readFileSync(dataFile);

		const resFile = path.join(dpath, '/res.txt');
		const resHeadLines = fs.readFileSync(resFile).toString().split(CRLF);
		resHeadLines.pop();

		const head = {};
		resHeadLines.forEach(line => {
			const [key, val] = line.split(':');
			if (okHeads.includes(key)) {
				head[key] = val;
			}
		})
		head['content-length'] = data.length

		console.log('[cache] load', dpath, opts.href);
		return {head: head, data: data};
	},

	__load: function(opts) {
		var uri = cache.makeUri(opts)
		var fpath = path.join(config.CACHE_ROOT, uri)
		var hpath = fpath + '.head'
		var data, head
		if (fs.existsSync(fpath)) {
			data = fs.readFileSync(fpath)
			// data = data.toString().replace(/(href=['"]?\/)/ig, '$1' + opts.host + '/')
			try {
				var headOrig = JSON.parse(fs.readFileSync(hpath))
				head = {
					'content-type': headOrig['content-type'] || mime.lookup(fpath)
				}
			} catch(ex) {
				// console.error(ex)
				head = {
					'content-type': mime.lookup(fpath)
				}
			}
			// delete head['transfer-encoding']
			head['content-length'] = data.length
			console.log('cache load', fpath)
			return {head: head, data: data}
		}
		return null
	}
}