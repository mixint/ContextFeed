const ContextFeed = require('../ContextFeed.js')
const {Transform} = require('stream')
const os = require('os')

let thisContext = new ContextFeed(process.cwd(), {keepAlive: true})

class StringifyPipe extends Transform {
	constructor(){
		super({objectMode: true})
	}

	_transform(object, encoding, done){
		// prettyprint each object and add an end of line
		done(null, JSON.stringify(object, null, 2) + os.EOL)
	}
}

thisContext.pipe(new StringifyPipe).pipe(process.stdout)