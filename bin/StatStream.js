/**
 * @exports StatStream
 * Creates a Readable Object Stream that pushes a extraStat object
 * (filename, permission mode, contenttype, contentsize) for every
 * file within a given context and, via keepAlive mode, every time
 * an inotify event occurs: allowing remote clients to stay sync'd
 * with the filesystem as files are created, modified, and deleted
 */

const fs = require('fs')
const path = require('path')
const debug = require('util').debuglog('statstream')
const stream = require('stream')
const extraStat = require('@mixint/extrastat')

/**
 * @extends stream.Readable
 * @param {string} pathname
 * @param {object} [options]
 */

module.exports = class StatStream extends stream.Readable {

    constructor(pathname, options){
        super({ objectMode: true })
        debug(
            `Starting ContextFeed for ${this.pathname}`
        )
        this.options = options || {}
        this.pathname = pathname
        this.pathArray = new Array
        this.readystate = 0
    }

    _read(size){
        debug(
            `Read called. ArrayReady is ${this.arrayReady()}.`
        )
        this.arrayReady() ? this.pushStat() : this.pause()
    }

    _destroy(error){
        debug(
            `Destroy called.`
        )
        this.inotify && this.inotify.close()
        error && this.emit('error', error)
    }


    arrayReady(){
        debug(
            `arrayReady called. this.readyState is ${this.readystate},` +
            `2 means no work needs to be done, move on...`              +
            `1 means calls have been made, work is ongoing, wait...`    +
            `0 (reached via else) means work has not begun, so begin it!`
        )
        if(this.readystate == 2) return true
        if(this.readystate == 1) return false
        else this.readystate = 1 // set readystate as 1, 'ongoing'

        fs.readdir(this.pathname, {
            withFileTypes: true
        }, (error, DirentArray) => {
            this.readystate = 2
            if(error) return this.destroy(error)
            debug(
                `ReadDir finished. ${DirentArray.length} entries. Sorting and adding '.' + '..'`
            )
            if(DirentArray.length > 0){
                /**
                 * extract `Symbol(type)` from any Dirent Object so I can use it as a key
                 */
                const kType = Object.getOwnPropertySymbols(DirentArray[0])[0] // -> Symbol(type)
                /**
                 * access each Dirent[Symbole(type)] to sort files from 0 -> 7
                 * 0: Unknown, 1: File, 2: Directory, 3: Link, 4: FIFO, 5: Socket, 6: Char Device, 7: Block device
                 * Once sorted, extract .name and add '..' + '.' to the end of the array for 'ls -a' effect.
                 * This array is in reverse order of how they will appear, as I'm about to .pop() them one by one.
                 */
                this.pathArray = DirentArray
                    .sort((a,b) => a[kType] - b[kType]) 
                    .map(Dirent => Dirent.name)
                    .concat(['..','.'])
            }

            if(this.options.keepAlive){
                debug(
                    `options.keepAlive set to true, start listening for inotify events.`
                )
                this.inotify = fs.watch(this.pathname, (event, filename) => {
                    debug(
                        `inotify callback. Event: ${event}, Filename: ${filename}`
                    )
                    if(!this.pathArray.includes(filename)){
                        this.pathArray.push(filename)
                        this.pushStat()
                    }
                }).on('error', error => this.emit('error', error))
            }
            /* finally start the recursion of pushing stat objects downstream */
            this.pushStat()
        })
    }


    pushStat(){
        if(this.pathArray.length == 0){
            debug(
                `pushStat called, pathArray is empty. keepAlive is ` +
                `${this.options.keepAlive ? `true, pausing ContextFeed.` 
                                          : `false, ending ContextFeed.`}`
            )
            this.options.keepAlive ? this.pause()
                                   : this.push(null)

        } else {
            debug(
                `pushStat called, pathArray has ${this.pathArray.length} entries.`
            )
            var filename = this.pathArray.pop()
            extraStat(path.join(this.pathname, filename), (error, stat) => {
                debug(
                    `extraStat finished, ${error ? `Err being pushed.` : `Stat being pushed.`}`
                )
                /*
                 * if pushStat was called while paused, resume.
                 * if push returns true, push again, else wait.
                 */
                if(this.isPaused()){ this.resume() }
                if(error){
                    this.push(error) ? this.pushStat() : this.pause()
                } else {
                    Object.assign(stat, {filename})
                    this.push(stat) ? this.pushStat() : this.pause()
                }
            })
        }
    }
}

/**
 * @copyright 2018 Colten Jackson
 * @license Continuity ∞
 */