const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')
const mime = require('mime')
const modurl = require('url')
const config = require('../config')

const cache = module.exports = {
	makeUri: function(opts) {
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
		var uri = cache.makeUri(opts)
		var fpath = path.join(config.CACHE_ROOT, uri)
		var hpath = fpath + '.head'
		var dpath = path.dirname(fpath)
		mkdirp.sync(dpath)
		fs.writeFileSync(fpath, data)
		fs.writeFileSync(hpath, JSON.stringify(resp.headers))
		console.log('cache save', fpath)
	},

	load: function(opts) {
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