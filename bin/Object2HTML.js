// all of this is loaded the first time its required, not every time its constructed
const fs = require('fs')
const ctxify = require('ctxify')
const stream = require('stream')
const assert = require('assert')
const debug  = require('util').debuglog('object2html')

let prefixStyle = fs.readFileSync('./conf/prefixConfig.css')
let prefixConfig = require('../conf/prefixConfig.htmlx.json')
let templateConfig = require('../conf/transform.htmlx.json')

module.exports = class Object2HTML extends stream.Transform {
	constructor(){
		super({objectMode: true})
		debug(
			`Creating Object2HTML, creating this.visibleDivs:\n` + 
			`a map in local context to store pathnames -> randomizedID, `
		)
		this.visibleDivs = {}

		debug(
			`Pushing the stylesheet from ../conf/prefixConfig.css`
		)
		this.push(ctxify({"head":{
			"childNodes": [
				{"style": {
					"textContent": "{{prefixStyle}}"
				}}, 
				{"meta": {
					"charset": "UTF-8"
				}}
			]
		}}, { prefixStyle }))

		debug(
			`Pushing the HTML from ../conf/prefixConfig.htmlx.json, ` +
			`which should be a form element to upload new files.`
		)
		this.push(ctxify(prefixConfig))

		debug(
			`setting up an interval to send a heartbeat HTML comment every 5 seconds`
		)
		this.heartbeat = setInterval(()=>{
			this.push(`<!-- <3 -->\n`)
		}, 5000)

		this.on('pipe', source => {
			source.on('error', error => {
				debug(`Object2HTML's source has errored, destroying Object2HTML...`)
				this.destroy()
			})
		})
	}

	_transform(object, encoding, done){
		let isError = object.errno !== undefined
		let pathname = isError ? object.path : object.pathname
		let visibledivID = this.visibleDivs[pathname]
		debug(
			`This object for ${pathname} is ${isError ? `an error` : `a stat object`}, ` +
			`and refers to a ${visibledivID 
				? `existing object: a style tag will be pushed to hide #${visibledivID}` 
				: `new object, which will have a random ID assigned and stored locally`}`
		)
		if(visibledivID){
			this.push(ctxify({style: {
				textContent: `#${visibledivID} { display: none };`
			}}))
		}
		if(isError === false){
			let newRandomID = "x" + Math.random().toString(16).slice(2)
			this.visibleDivs[pathname] = newRandomID // store newRandomID in this context
			Object.assign(object, {newRandomID}) // merge newRandomID to be used with template
			debug(`Assigned ${newRandomID} to ${pathname}, pushing HTML.`)
			this.push(ctxify(templateConfig, object)) // push stat table HTML
		} else {
			debug(`Deleting entry for ${pathname}`)
			delete this.visibleDivs[pathname] // drop this pathname from local context
		}
		done()
	}

	_destroy(){
		debug(
			`Object2HTML is destroyed, clearing heartbeat.`
		)
		clearInterval(this.heartbeat)
	}
}

