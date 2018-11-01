const stream = require('stream')
const fs = require('fs')
const path = require('path')
const extraStat = require('@mixint/extrastat')
const debug = require('util').debuglog('ContextFeed')

/**
 * @extends stream.Readable
 * @param {string} pathname
 * @param {object} [options]
 * Creates a Readable Object Stream that pushes a extraStat object
 * (filename, permission mode, contenttype, contentsize) for every
 * file within a given context and, via keepAlive mode, every time
 * an inotify event occurs: allowing remote clients to stay sync'd
 * with the filesystem as files are created, modified, and deleted
 */
module.exports = class ContextFeed extends stream.Readable {

    constructor(pathname, options){
        super({ objectMode: true })
        this.options = options || {}
        this.pathname = pathname
        this.pathArray = new Array
        this.readystate = 0
        debug(
            `Starting ContextFeed for ${this.pathname}`
        )
    }

    _read(size){
        debug(
            `Read called. ArrayReady is ${this.arrayReady()}.`
        )
        this.arrayReady() ? this.pushStat() : this.pause()
    }

    _destroy(){
        debug(`Destroy called.`)
        this.inotify && this.inotify.close()
    }


    arrayReady(){
        // readystate: 0 is not started, 1 is not done, 2 is complete
        if(this.readystate == 2) return true
        if(this.readystate == 1) return false
        else this.readystate = 1 // set readystate as 1, 'ongoing'

        fs.readdir(this.pathname, {
            withFileTypes: true
        }, (error, DirentArray) => {
            this.readystate = 2 // flag readystate as complete
            debug(
                `ReadDir finished. ${DirentArray.length} entries. Sorting and adding '.' + '..'`
            )
            /**
             * extract Symbol(type) from any Dirent Object so I can use it as a key
             */
            const kType = Object.getOwnPropertySymbols(DirentArray[0])[0] // -> Symbol(type)
            /**
             * sort DirEnt array by type consant. 0 is Unkown, 1 is File, 2 is Directory, etc.
             * Compare b to a to reverse order from directory to file.
             */
            DirentArray.sort((a,b) => b[kType] - a[kType]) 

            this.pathArray = ['.','..'].concat(DirentArray.map(Dirent => Dirent.name))
            this.pushStat()

            this.inotify = fs.watch(this.pathname, (event, filename) => {
                debug(
                    `inotify callback. Event: ${event}, Filename: ${filename}`
                )
                if(!this.pathArray.includes(filename)){
                    this.pathArray.push(filename)
                    this.pushStat()
                }
            })

            this.inotify.on('error', error => this.emit("error", error))
            this.on('end', () => this.inotify.close()) // close FS.watcher when a stream is closed
        }) // return undefined, coerced to false, pauses stream
    }

    pushStat(){
        if(this.pathArray.length == 0){
            debug(
                `pushStat called, pathArray is empty. keepAlive is ${Boolean(this.options.keepAlive)}, ` +
                `${this.options.keepAlive ? `pausing ContextFeed.` : `ending ContextFeed.`}`
            )
            if(this.options.keepAlive){
                this.pause()
            } else {
                this.push(null) // it's done
            }
        } else {
            debug(
                `pushStat called, pathArray has ${this.pathArray.length} entries.`
            )
            let filename = this.pathArray.pop()
            extraStat(path.join(this.pathname, filename), (err, stat) => {
                debug(
                    `extraStat finished, ${err ? `Err being pushed.` : `Stat being pushed.`}`
                )
                // if pushStat was called while paused, resume.
                // if push returns true, push again, else wait.
                if(this.isPaused()){
                    this.resume()
                }
                if(err){
                    this.push(err) ? this.pushStat() : this.pause()
                } else {
                    Object.assign(stat, {filename})
                    this.push(stat) ? this.pushStat() : this.pause()
                }
            })
        }
    }
}