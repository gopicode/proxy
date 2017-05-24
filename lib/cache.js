const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')
const modurl = require('url')
const CACHE_ROOT = process.env.HOME + '/backup/html/sites'

const cache = module.exports = {
	makeUri: function(opts) {
		var host = opts.headers.host
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
		var fpath = path.join(CACHE_ROOT, uri)
		var hpath = fpath + '.head'
		var dpath = path.dirname(fpath)
		mkdirp.sync(dpath)
		fs.writeFileSync(fpath, data)
		fs.writeFileSync(hpath, JSON.stringify(resp.headers))
		console.log('cache save', fpath)
	},

	load: function(opts) {
		var uri = cache.makeUri(opts)
		console.log('cache load uri:', uri)
		var fpath = path.join(CACHE_ROOT, uri)
		var hpath = fpath + '.head'
		var data, head
		if (fs.existsSync(fpath)) {
			data = fs.readFileSync(fpath)
			head = JSON.parse(fs.readFileSync(hpath))
			console.log('cache load', fpath)
			return {head: head, data: data}
		}
		return null
	}
}