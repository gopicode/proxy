// proxy server
exports.PROXY_ROOT = 'http://localhost:8000';

// regular expression to grep the proxy root (in the location header and href/src attributes of html)
exports.PROXY_ROOT_REGX = new RegExp('https?://' + exports.PROXY_ROOT.split('//')[1], 'ig')

// this local server. change this if any custom domain name is used
exports.LOCAL_ROOT = 'http://localhost:8080'

// TCP port number of this server
exports.LOCAL_PORT = 9000

// cache
exports.CACHE_ENABLED = true
exports.CACHE_ROOT = process.env.HOME + '/www'
exports.CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
