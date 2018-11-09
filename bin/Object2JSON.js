const stream = require('stream')

module.exports = class Object2JSON extends stream.Transform {
	constructor(){ super({objectMode: true}) }

	_transform(object, encoding, done){

	}

	_destroy(){
		
	}

}