// all of this is loaded the first time its required, not every time its constructed

const ctxify = require('ctxify')
const stream = require('stream')
const assert = require('assert')
const fs = require('fs')

let prefixStyle = fs.readFileSync('./conf/prefixConfig.css')
let prefixConfig = require('../conf/prefixConfig.htmlx.json')
let templateConfig = require('../conf/transform.htmlx.json')

module.exports = class Object2HTML extends stream.Transform {
	constructor(){
		super({objectMode: true})

		console.log("HTML WRITE", ctxify({"head": {
			childNodes: [{"style": {
				"textContent": "{{prefixStyle}}"
			}}]
		}}, { prefixStyle })
		)
		this.push(ctxify({"head": {
			childNodes: [{"style": {
				"textContent": "{{prefixStyle}}"
			}}]
		}}, { prefixStyle }))

		console.log("HTML WRITE", ctxify(prefixConfig))
		this.push(ctxify(prefixConfig))

		this.heartbeat = setInterval(()=>{
			this.push(`<!-- <3 -->\n`)
		}, 1000)
	}

	_transform(object, encoding, done){
		console.log("TEMPLATE", ctxify(templateConfig, object))
		done(null, ctxify(templateConfig, object))
	}

	_destroy(){
		clearInterval(this.heartbeat)
	}
}