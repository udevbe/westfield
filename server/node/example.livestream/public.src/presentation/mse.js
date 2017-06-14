import {EventEmitter} from '../../deps/bp_event.js';
//import {MP4Inspect} from '../iso-bmff/mp4-inspector.js';

export class MSEBuffer {
    constructor(parent, codec) {
        this.mediaSource = parent.mediaSource;
        this.players = parent.players;
        this.cleaning = false;
        this.parent = parent;
        this.queue = [];
        this.cleanResolvers = [];
        this.codec = codec;
        this.cleanRanges = [];

        Log.debug(`Use codec: ${codec}`);

        this.sourceBuffer = this.mediaSource.addSourceBuffer(codec);
        this.eventSource = new EventEmitter(this.sourceBuffer);

        this.eventSource.addEventListener('updatestart', (e)=> {
            // this.updating = true;
            // Log.debug('update start');
            if (this.cleaning) {
                Log.debug(`${this.codec} cleaning start`);
            }
        });

        this.eventSource.addEventListener('update', (e)=> {
            // this.updating = true;
            if (this.cleaning) {
                Log.debug(`${this.codec} cleaning update`);
            }
        });

        this.eventSource.addEventListener('updateend', (e)=> {
            // Log.debug('update end');
            // this.updating = false;
            if (this.cleaning) {
                Log.debug(`${this.codec} cleaning end`);

                try {
                    if (this.sourceBuffer.buffered.length && this.players[0].currentTime < this.sourceBuffer.buffered.start(0)) {
                        this.players[0].currentTime = this.sourceBuffer.buffered.start(0);
                    }
                } catch (e) {
                    // TODO: do something?
                }
                while (this.cleanResolvers.length) {
                    let resolver = this.cleanResolvers.shift();
                    resolver();
                }
                this.cleaning = false;

                if (this.cleanRanges.length) {
                    this.doCleanup();
                    return;
                }
            } else {
                // Log.debug(`buffered: ${this.sourceBuffer.buffered.end(0)}, current ${this.players[0].currentTime}`);
            }
            this.feedNext();
        });

        this.eventSource.addEventListener('error', (e)=> {
            Log.debug(`Source buffer error: ${this.mediaSource.readyState}`);
            if (this.mediaSource.sourceBuffers.length) {
                this.mediaSource.removeSourceBuffer(this.sourceBuffer);
            }
            this.parent.eventSource.dispatchEvent('error');
        });

        this.eventSource.addEventListener('abort', (e)=> {
            Log.debug(`Source buffer aborted: ${this.mediaSource.readyState}`);
            if (this.mediaSource.sourceBuffers.length) {
                this.mediaSource.removeSourceBuffer(this.sourceBuffer);
            }
            this.parent.eventSource.dispatchEvent('error');
        });

        if (!this.sourceBuffer.updating) {
            this.feedNext();
        }
        // TODO: cleanup every hour for live streams
    }

    destroy() {
        this.eventSource.destroy();
        this.clear();
        this.queue = [];
        this.mediaSource.removeSourceBuffer(this.sourceBuffer);
    }

    clear() {
        this.queue = [];
        let promises = [];
        for (let i=0; i< this.sourceBuffer.buffered.length; ++i) {
            // TODO: await remove
            this.cleaning = true;
            promises.push(new Promise((resolve, reject)=>{
                this.cleanResolvers.push(resolve);
                this.sourceBuffer.remove(this.sourceBuffer.buffered.start(i), this.sourceBuffer.buffered.end(i));
                resolve();
            }));
        }
        return Promise.all(promises);
    }

    setLive(is_live) {
        this.is_live = is_live;
    }

    feedNext() {
        // Log.debug("feed next ", this.sourceBuffer.updating);
        if (!this.sourceBuffer.updating && !this.cleaning && this.queue.length) {
            this.doAppend(this.queue.shift());
            // TODO: if is live and current position > 1hr => clean all and restart
        }
    }

    doCleanup() {
        if (!this.cleanRanges.length) {
            this.cleaning = false;
            this.feedNext();
            return;
        }
        let range = this.cleanRanges.shift();
        Log.debug(`${this.codec} remove range [${range[0]} - ${range[1]}). 
                    \nUpdating: ${this.sourceBuffer.updating}
                    `);
        this.cleaning = true;
        this.sourceBuffer.remove(range[0], range[1]);
    }

    initCleanup() {
        if (this.sourceBuffer.buffered.length && !this.sourceBuffer.updating && !this.cleaning) {
            Log.debug(`${this.codec} cleanup`);
            let removeBound = this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length-1) - 2;

            for (let i=0; i< this.sourceBuffer.buffered.length; ++i) {
                let removeStart = this.sourceBuffer.buffered.start(i);
                let removeEnd = this.sourceBuffer.buffered.end(i);
                if ((this.players[0].currentTime <= removeStart) || (removeBound <= removeStart)) continue;

                if ((removeBound <= removeEnd) && (removeBound >= removeStart)) {
                    Log.debug(`Clear [${removeStart}, ${removeBound}), leave [${removeBound}, ${removeEnd}]`);
                    removeEnd = removeBound;
                    if (removeEnd!=removeStart) {
                        this.cleanRanges.push([removeStart, removeEnd]);
                    }
                    continue; // Do not cleanup buffered range after current position
                }
                this.cleanRanges.push([removeStart, removeEnd]);
            }

            this.doCleanup();

            // let bufferStart = this.sourceBuffer.buffered.start(0);
            // let removeEnd = this.sourceBuffer.buffered.start(0) + (this.sourceBuffer.buffered.end(0) - this.sourceBuffer.buffered.start(0))/2;
            // if (this.players[0].currentTime < removeEnd) {
            //     this.players[0].currentTime = removeEnd;
            // }
            // let removeEnd = Math.max(this.players[0].currentTime - 3, this.sourceBuffer.buffered.end(0) - 3);
            //
            // if (removeEnd < bufferStart) {
            //     removeEnd = this.sourceBuffer.buffered.start(0) + (this.sourceBuffer.buffered.end(0) - this.sourceBuffer.buffered.start(0))/2;
            //     if (this.players[0].currentTime < removeEnd) {
            //         this.players[0].currentTime = removeEnd;
            //     }
            // }

            // if (removeEnd > bufferStart && (removeEnd - bufferStart > 0.5 )) {
            //     // try {
            //         Log.debug(`${this.codec} remove range [${bufferStart} - ${removeEnd}).
            //         \nBuffered end: ${this.sourceBuffer.buffered.end(0)}
            //         \nUpdating: ${this.sourceBuffer.updating}
            //         `);
            //         this.cleaning = true;
            //         this.sourceBuffer.remove(bufferStart, removeEnd);
            //     // } catch (e) {
            //     //     // TODO: implement
            //     //     Log.error(e);
            //     // }
            // } else {
            //     this.feedNext();
            // }
        } else {
            this.feedNext();
        }
    }

    doAppend(data) {
        // console.log(MP4Inspect.mp4toJSON(data));
        let err = this.players[0].error;
        if (err) {
            Log.error(`Error occured: ${MSE.ErrorNotes[err.code]}`);
            try {
                this.players.forEach((video)=>{video.stop();});
                this.mediaSource.endOfStream();
            } catch (e){

            }
            this.parent.eventSource.dispatchEvent('error');
        } else {
            try {
                this.sourceBuffer.appendBuffer(data);
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    Log.debug(`${this.codec} quota fail`);
                    this.queue.unshift(data);
                    this.initCleanup();
                    return;
                }

                // reconnect on fail
                Log.error(`Error occured while appending buffer. ${e.name}: ${e.message}`);
                this.parent.eventSource.dispatchEvent('error');
            }
        }

    }

    feed(data) {
        this.queue = this.queue.concat(data);
        // Log.debug(this.sourceBuffer.updating, this.updating, this.queue.length);
        if (this.sourceBuffer && !this.sourceBuffer.updating && !this.cleaning) {
            // Log.debug('enq feed');
            this.feedNext();
        }
    }
}

export class MSE {
    // static CODEC_AVC_BASELINE = "avc1.42E01E";
    // static CODEC_AVC_MAIN = "avc1.4D401E";
    // static CODEC_AVC_HIGH = "avc1.64001E";
    // static CODEC_VP8 = "vp8";
    // static CODEC_AAC = "mp4a.40.2";
    // static CODEC_VORBIS = "vorbis";
    // static CODEC_THEORA = "theora";

    static get ErrorNotes() {return  {
        [MediaError.MEDIA_ERR_ABORTED]: 'fetching process aborted by user',
        [MediaError.MEDIA_ERR_NETWORK]: 'error occurred when downloading',
        [MediaError.MEDIA_ERR_DECODE]: 'error occurred when decoding',
        [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'audio/video not supported'
    }};

    static isSupported(codecs) {
        return (window.MediaSource && window.MediaSource.isTypeSupported(`video/mp4; codecs="${codecs.join(',')}"`));
    }

    constructor (players) {
        this.players = players;
        const playing = this.players.map((video, idx) => {
            video.onplaying = function () {
                playing[idx] = true;
            };
            video.onpause = function () {
                playing[idx] = false;
            };
            return !video.paused;
        });
        this.playing = playing;
        this.mediaSource = new MediaSource();
        this.eventSource = new EventEmitter(this.mediaSource);
        this.reset();
    }

    destroy() {
        this.reset();
        this.eventSource.destroy();
        this.mediaSource = null;
        this.eventSource = null;
    }

    play() {
        this.players.forEach((video, idx)=>{
            if (video.paused && !this.playing[idx]) {
                Log.debug(`player ${idx}: play`);
                video.play();
            }
        });
    }

    setLive(is_live) {
        for (let idx in this.buffers) {
            this.buffers[idx].setLive(is_live);
        }
        this.is_live = is_live;
    }

    resetBuffers() {
        this.players.forEach((video, idx)=>{
            if (!video.paused && this.playing[idx]) {
                video.pause();
                video.currentTime = 0;
            }
        });

        let promises = [];
        for (let buffer of this.buffers.values()) {
            promises.push(buffer.clear());
        }
        return Promise.all(promises).then(()=>{
            this.mediaSource.endOfStream();
            this.mediaSource.duration = 0;
            this.mediaSource.clearLiveSeekableRange();
            this.play();
        });
    }

    clear() {
        this.reset();
        this.players.forEach((video)=>{video.src = URL.createObjectURL(this.mediaSource)});

        return this.setupEvents();
    }

    setupEvents() {
        this.eventSource.clear();
        this.resolved = false;
        this.mediaReady = new Promise((resolve, reject)=> {
            this._sourceOpen = ()=> {
                Log.debug(`Media source opened: ${this.mediaSource.readyState}`);
                if (!this.resolved) {
                    this.resolved = true;
                    resolve();
                }
            };
            this._sourceEnded = ()=>{
                Log.debug(`Media source ended: ${this.mediaSource.readyState}`);
            };
            this._sourceClose = ()=>{
                Log.debug(`Media source closed: ${this.mediaSource.readyState}`);
                if (this.resolved) {
                    this.eventSource.dispatchEvent('sourceclosed');
                }
            };
            this.eventSource.addEventListener('sourceopen', this._sourceOpen);
            this.eventSource.addEventListener('sourceended', this._sourceEnded);
            this.eventSource.addEventListener('sourceclose', this._sourceClose);
        });
        return this.mediaReady;
    }

    reset() {
        this.ready = false;
        for (let track in this.buffers) {
            this.buffers[track].destroy();
            delete this.buffers[track];
        }
        if (this.mediaSource.readyState == 'open') {
            this.mediaSource.duration = 0;
            this.mediaSource.endOfStream();
        }
        this.updating = false;
        this.resolved = false;
        this.buffers = {};
        // this.players.forEach((video)=>{video.src = URL.createObjectURL(this.mediaSource)});
        // TODO: remove event listeners for existing media source
        // this.setupEvents();
        // this.clear();
    }

    setCodec(track, mimeCodec) {
        return this.mediaReady.then(()=>{
            this.buffers[track] = new MSEBuffer(this, mimeCodec);
            this.buffers[track].setLive(this.is_live);
        });
    }

    feed(track, data) {
        if (this.buffers[track]) {
            this.buffers[track].feed(data);
        }
    }
}