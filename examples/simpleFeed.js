const ContextFeed = require('../bin/ContextFeed')
const Transflect = require('@mixint/transflect')
const BytePipette = require('@mixint/bytepipette')
const http = require('http')
const fs = require('fs')

http.createServer({
    IncomingMessage: require('parsedmessage'),
    ServerResponse: require('serverfailsoft'),
}, (req, res) => ((route) => {
	req.pipe(new route).pipe(res)
	console.log(req.connection.remoteAddress, req.method, req.url)
})(
	req.pathname.slice(-1) == '/' ? ContextFeed : BytePipette
)).listen(process.env.PORT || 3000)