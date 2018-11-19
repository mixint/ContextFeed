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
})(
	req.pathname.slice(-1) == '/' ? ContextFeed : BytePipette
)).listen(3000)