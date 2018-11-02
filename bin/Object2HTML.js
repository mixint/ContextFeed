// all of this is loaded the first time its required, not every time its constructed

let rootdir = path.resolve('..') // one 'up' from here
let {prefix, template} = require('../package.json')['config']['Object2HTML']

let prefixConfig = require(path.resolve('..', prefix))
let templateConfig = require(path.resolve('..', template))

module.exports = class Object2HTML extends stream.Transform {
	constructor(){
		super({ObjectMode: true})
		this.push(createElement(prefixConfig))
	}

	_transform(object, encoding, done){
		try {
			
		}
	}
}