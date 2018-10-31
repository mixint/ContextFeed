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
        debug(`Starting ContextFeed for ${this.pathname}`)
    }

    _read(size){
        debug(`Read called. ArrayReady is ${this.arrayReady()}`)

        this.arrayReady() ? this.pushStat() : this.pause()
    }

    _destroy(){
        debug(`Destroy called.`)
        this.inotify && this.inotify.close()
    }

    arrayReady(){
        // readystate: 
        if(this.readdirFinished) return true
        // else readdir and return undefined
        fs.readdir(this.pathname, {
            withFileTypes: true
        }, (error, DirentArray) => {
            error && this.emit('error', error)
            debug(`ReadDir finished. ${DirentArray.length} entries.`)
            this.readdirFinished = true
            // extract Symbol(type) from any Dirent Object so I can use it as a key
            const kType = Object.getOwnPropertySymbols(DirentArray[0])[0] // -> Symbol(type)
            // sort DirEnt array by type consant. 0 is Unkown, 1 is File, 2 is Directory, etc.
            // Compare b to a to reverse order from directory to file.
            DirentArray.sort((a,b) => b[kType] - a[kType]) 

            this.pathArray = ['.','..'].concat(DirentArray.map(Dirent => Dirent.name))
            this.pushStat()

            this.inotify = fs.watch(this.pathname, (event, filename) => {
                // only push new pathnames
                debug(`inotify callback. Event: ${event}, Filename: ${filename}`)

                if(!this.pathArray.includes(filename)){
                    this.pathArray.push(filename)
                    this.pushStat()
                }
            })
            this.inotify.on('error', error => this.emit("error", error))
            this.on('end', () => this.inotify.close()) // close FS.watcher when a stream is closed
        })

    }

    pushStat(){
        if(this.pathArray.length == 0){
            debug(`pathArray empty on pushStat. keepAlive is ${Boolean(this.options.keepAlive)}.`)
            this.options.keepAlive ? this.pause() : this.push(null) // it's done
        } else {
            debug(`pathArray has ${this.pathArray.length} entries on pushStat.`)
            let filename = this.pathArray.pop()
            extraStat(path.join(this.pathname, filename), (err, stat) => {
                stat.filename = filename // overwrite with original name, specially for '.' and '..'
                // if pushStat was called while paused, resume.
                this.isPaused() && this.resume()
                // if push returns true, push again, else wait.
                this.push(err || stat) ? this.pushStat() : this.pause()
            })
        }
    }
}
