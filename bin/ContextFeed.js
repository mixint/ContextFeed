const Object2HTML = require('./Object2HTML')
const Object2SSE = require('./Object2SSE')
const Object2JSON = require('./Object2JSON')
const StatStream = require('./StatStream')
const stream = require('stream')
const Transfect = require('@mixint/transflect')
const debug = require('util').debuglog("ContextFeed")

/**
 *
 * Future plans: interpret query string to filter results:
 * 
 */

module.exports = class ContextFeed extends Transfect {
    constructor(){ super() }

    /**
     * @param {ParsedMessage} source
     * @return {stream} - An appropriately transformed stat-stream
     * HTML and SSE are going to send heartbeats to keep the connection open, sending updates via inotify.
     * In the case that headers.accept is requesting application/json, keepAlive option is set to false.
     */
    _open(source){
        debug(
            `Opening ContextFeed, checking ContentType and creating StatStream`
        )
        let ContentType = source.headers.accept.split(',')
        let keepAlive = ContentType != 'application/json'
        let StatObjects = new StatStream(source.pathname, {keepAlive})
        debug(
            `ContentType is ${ContentType}, keepAlive is ${keepAlive},` +
            `Choosing relevant stream transform (defaults to text/html).`
        )

        return this.stream = StatObjects.pipe(new Object2HTML)

        // switch(ContentType){
        //     // case 'text/event-stream':
        //     //     return this.stream = StatObjects.pipe(Object2SSE)
        //     // case 'application/json':
        //     //     return this.stream = StatObjects.pipe(Object2JSON)
        //     case 'text/html':
        //     default:
        //         return this.stream = StatObjects.pipe(new Object2HTML)
        // }
    }

    /**
     * 
     * Gnarly backpressure handling is github issue #2 of mixint/Transflect
     */
    _end(done){
        this.stream.on('data', data => {
            this.push(data) || (this.stream.pause(), this.pipes.once('drain', () => this.stream.resume()))
        }).on('error', done).on('end', done)
    }
}