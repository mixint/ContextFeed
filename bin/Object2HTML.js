// all of this is loaded the first time its required, not every time its constructed
const fs = require('fs')
const path = require('path')
const ctxify = require('ctxify')
const stream = require('stream')
const assert = require('assert')
const debug  = require('util').debuglog('object2html')

let prefixStyle = fs.readFileSync(path.resolve(__dirname, '../conf/prefixConfig.css'))
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

		this.on('pipe', source => {
			// source.on('readable', () => {
			process.nextTick(() => {
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
			})
			source.on('error', error => {
				console.log(`Object2HTML's source has errored, destroying Object2HTML...`)
				this.destroy(error)
			})
		})
	}

	_transform(object, encoding, done){
		debug(
			`Received object with keys ${Object.keys(object)}`
		)
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
			let newRandomID = `x${Math.random().toString(16).slice(2)}`
			Object.assign(object, {
				newRandomID,
				permission: this.getPermission(object.filemode, object.role),
				readableSize: this.readablize(object.filestat.size)
			}) // merge newRandomID to be used with template
			debug(`Assigned ${newRandomID} to ${pathname}, pushing HTML.`)
			console.log(object)
			this.push(ctxify(templateConfig, object)) // push stat table HTML
			this.visibleDivs[pathname] = newRandomID // store newRandomID in this context
		} else {
			debug(`Deleting entry for ${pathname}`)
			delete this.visibleDivs[pathname] // drop this pathname from local context
		}
		done()
	}

	_destroy(error){
		debug(
			`Object2HTML is destroyed, clearing heartbeat.`
		)
		clearInterval(this.heartbeat)
		error & this.emit('error', error)
	}

	getPermission(readablemode, role){
		let permissionarray = Array.from(readablemode)
		return {
			ur: permissionarray[0] == 'r' ? role == 'user'  ? 'highlight' : 'relevant' : 'hide',
			uw: permissionarray[1] == 'w' ? role == 'user'  ? 'highlight' : 'relevant' : 'hide',
			ux: permissionarray[2] == 'x' ? role == 'user'  ? 'highlight' : 'relevant' : 'hide',
			gr: permissionarray[3] == 'r' ? role == 'group' ? 'highlight' : 'relevant' : 'hide',
			gw: permissionarray[4] == 'w' ? role == 'group' ? 'highlight' : 'relevant' : 'hide',
			gx: permissionarray[5] == 'x' ? role == 'group' ? 'highlight' : 'relevant' : 'hide',
			or: permissionarray[6] == 'r' ? role == 'other' ? 'highlight' : 'relevant' : 'hide',
			ow: permissionarray[7] == 'w' ? role == 'other' ? 'highlight' : 'relevant' : 'hide',
			ox: permissionarray[8] == 'x' ? role == 'other' ? 'highlight' : 'relevant' : 'hide',
		}
	}

	readablize(bytes, decimals){
		// thanks to stackoverflow.com/questions/15900485/
		if(bytes == 0) return '0 Bytes'
		var k = 1024,
			dm = decimals <= 0 ? 0 : decimals || 2,
	       	sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
	       	i = Math.floor(Math.log(bytes) / Math.log(k))
	   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
	}
}

