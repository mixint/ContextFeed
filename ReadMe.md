# ContextFeed

Opens an object stream of stat objects for a given directory. Uses WithFileTypes to sort entries into directories first... uses extrastat on read() for each entry and passes on the result. Simultaneously, an intofiy watch is set on the directory, so any changes that occur while sending data are added to the list of data to send.

This object stream is piped to a transform matching the requests's accept header: `text/event-stream` or `text/html` or `application/json`, with keepAlive values of `true`, `true`, `false`, respectively. In the future, rss and atom streams should be implemented with keepAlive false. 

That is, event-streams and html streams will continue watching for file changes. Once finished with its initial list, the keepAlive value is checked, and if true, heartbeats are sent every few seconds. (This should be configurable... I think I've seen some proxies start dropping connections after 2 seconds of no bytes. Chrome waits more like 30 or 60 seconds.) Event-Stream heartbeats are sent as `: <3` comments and HTML streams are fed `<!-- <3 -->` comments. 

HTML is going to be a pretty dramatic trasformation involving sending a style header from file (good warmup for figjamfeed) and somehow merging the data structure with an html form...

Run this socat tunnel to redirect traffic to a server running as someone other than root:
```bash
socat TCP-LISTEN:80,fork TCP:localhost:3000
```