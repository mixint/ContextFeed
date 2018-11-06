let ContextFeed = require('../bin/ContextFeed')
let http = require('http')

http.createServer({
    IncomingMessage: require('parsedmessage'),
    ServerResponse: require('serverfailsoft'),
}, (req, res) => {
	console.log(req.headers)
    req.pipe(new ContextFeed).pipe(res)
}).listen(3000)