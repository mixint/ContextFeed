const ContextFeed = require('../bin/ContextFeed')
const Transflect = require('@mixint/transflect')
const WritePipette = require('@mixint/writepipette')
const http = require('http')
const fs = require('fs')

http.createServer({
    IncomingMessage: require('parsedmessage'),
    ServerResponse: require('serverfailsoft'),
}, (req, res) => ((route) => {
	req.pipe(new route).pipe(res)
})(
	req.method == 'GET'  ? ContextFeed  :
    req.method == 'POST' ? WritePipette :
    					   Transflect
)).listen(3000)