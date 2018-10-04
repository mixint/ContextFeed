const stream = require('stream')

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
        Object.assign(this, options, pathname, { pathArray: [] })
    }

    _read(size){
        this.arrayReady() ? this.pushStat() : this.pause()
    }

    _final(){
        // does this get called???? UGH test all the _read, _write,
    }
    _destroy(){
        this.inotify && this.inotify.close()
    }

    arrayReady(){
        if(this.readdirFinished) return true
        // else readdir and return undefined
        fs.readdir(this.pathname, (err, files) => {
            this.readdirFinished = true
            this.pathArray = ['.','..'].concat(files)
            this.pushStat()
            this.inotify = fs.watch(this.pathname, (event, filename) => {
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
            this.keepAlive ? this.pause() : this.push(null) // it's done
        } else {
            mimemap.extraStat(this.pathname + this.pathArray.pop(), (err, stat) => {
                this.isPaused() && this.resume()
                this.push(err || stat) && this.pushStat()
                this.pathArray.length && this.pause()
            })
        }
    }
}
