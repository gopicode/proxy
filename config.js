// proxy server
exports.PROXY_ROOT = 'https://developer.mozilla.org'

// regular expression to grep the proxy root (in the location header and href/src attributes of html)
exports.PROXY_ROOT_REGX = new RegExp('https?://' + exports.PROXY_ROOT.split('//')[1], 'ig')

// this local server. change this if any custom domain name is used
exports.LOCAL_ROOT = 'http://localhost:8080'

// directory path to save/serve the content
exports.CACHE_ROOT = process.env.HOME + '/backup/html/sites'

// enable or disable saving the content
exports.CACHE_ENABLED = true