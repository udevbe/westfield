//import {MP4Inspect} from '../iso-bmff/mp4-inspector.js';

export class MSEBuffer {
    constructor(parent, codec) {
        this.mediaSource = parent.mediaSource;
        this.video = parent.video;
        this.cleaning = false;
        this.parent = parent;
        this.queue = [];
        this.cleanResolvers = [];
        this.codec = codec;
        this.cleanRanges = [];

        console.debug(`Use codec: ${codec}`);

        this.sourceBuffer = this.mediaSource.addSourceBuffer(codec);
        this.eventSource = new EventEmitter(this.sourceBuffer);

        this.eventSource.addEventListener('updateend', (e) => {
            if (this.cleaning) {
                console.debug(`${this.codec} cleaning end`);

                try {
                    if (this.sourceBuffer.buffered.length && this.video.currentTime < this.sourceBuffer.buffered.start(0)) {
                        this.video.currentTime = this.sourceBuffer.buffered.start(0);
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

        this.eventSource.addEventListener('error', (e) => {
            console.debug(`Source buffer error: ${this.mediaSource.readyState}`);
            if (this.mediaSource.sourceBuffers.length) {
                this.mediaSource.removeSourceBuffer(this.sourceBuffer);
            }
        });

        this.eventSource.addEventListener('abort', (e) => {
            console.debug(`Source buffer aborted: ${this.mediaSource.readyState}`);
            if (this.mediaSource.sourceBuffers.length) {
                this.mediaSource.removeSourceBuffer(this.sourceBuffer);
            }
        });

        if (!this.sourceBuffer.updating) {
            this.feedNext();
        }
        // TODO: cleanup every hour for live streams
    }

    destroy() {
        this.clear();
        this.queue = [];
        this.mediaSource.removeSourceBuffer(this.sourceBuffer);
    }

    clear() {
        this.queue = [];
        let promises = [];
        for (let i = 0; i < this.sourceBuffer.buffered.length; ++i) {
            // TODO: await remove
            this.cleaning = true;
            promises.push(new Promise((resolve, reject) => {
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
        // console.debug("feed next ", this.sourceBuffer.updating);
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
        console.debug(`${this.codec} remove range [${range[0]} - ${range[1]}). 
                    \nUpdating: ${this.sourceBuffer.updating}
                    `);
        this.cleaning = true;
        this.sourceBuffer.remove(range[0], range[1]);
    }

    initCleanup() {
        if (this.sourceBuffer.buffered.length && !this.sourceBuffer.updating && !this.cleaning) {
            console.debug(`${this.codec} cleanup`);
            let removeBound = this.sourceBuffer.buffered.end(this.sourceBuffer.buffered.length - 1) - 2;

            for (let i = 0; i < this.sourceBuffer.buffered.length; ++i) {
                let removeStart = this.sourceBuffer.buffered.start(i);
                let removeEnd = this.sourceBuffer.buffered.end(i);
                if ((this.video[0].currentTime <= removeStart) || (removeBound <= removeStart)) continue;

                if ((removeBound <= removeEnd) && (removeBound >= removeStart)) {
                    console.debug(`Clear [${removeStart}, ${removeBound}), leave [${removeBound}, ${removeEnd}]`);
                    removeEnd = removeBound;
                    if (removeEnd !== removeStart) {
                        this.cleanRanges.push([removeStart, removeEnd]);
                    }
                    continue; // Do not cleanup buffered range after current position
                }
                this.cleanRanges.push([removeStart, removeEnd]);
            }

            this.doCleanup();
        } else {
            this.feedNext();
        }
    }

    doAppend(data) {
        // console.log(MP4Inspect.mp4toJSON(data));
        let err = this.video.error;
        if (err) {
            console.error(`Error occured: ${MSE.ErrorNotes[err.code]}`);
            try {
                this.video.stop();
                this.mediaSource.endOfStream();
            } catch (e) {

            }
        } else {
            try {
                this.sourceBuffer.appendBuffer(data);
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.debug(`${this.codec} quota fail`);
                    this.queue.unshift(data);
                    this.initCleanup();
                    return;
                }

                // reconnect on fail
                console.error(`Error occured while appending buffer. ${e.name}: ${e.message}`);
            }
        }
    }

    feed(data) {
        this.queue = this.queue.concat(data);
        if (this.sourceBuffer && !this.sourceBuffer.updating && !this.cleaning) {
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

    static get ErrorNotes() {
        return {
            [MediaError.MEDIA_ERR_ABORTED]: 'fetching process aborted by user',
            [MediaError.MEDIA_ERR_NETWORK]: 'error occurred when downloading',
            [MediaError.MEDIA_ERR_DECODE]: 'error occurred when decoding',
            [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'audio/video not supported'
        }
    };

    static isSupported(codecs) {
        return (window.MediaSource && window.MediaSource.isTypeSupported(`video/mp4; codecs="${codecs.join(',')}"`));
    }

    constructor(video) {
        this.video = video;
        video.onplaying = () => {
            this.playing = true;
        };
        video.onpause = () => {
            this.playing = false;
        };
        this.playing = !this.payer.paused;
        this.mediaSource = new MediaSource();
        this.reset();
    }

    destroy() {
        this.reset();
        this.mediaSource = null;
    }

    play() {
        if (this.video.paused && !this.playing) {
            console.debug(`video: play`);
            this.video.play();
        }
    }

    setLive(is_live) {
        this.buffer.setLive(is_live);
        this.is_live = is_live;
    }

    resetBuffer() {
        if (!this.video.paused && this.playing) {
            this.video.pause();
            this.video.currentTime = 0;
        }

        this.buffer.clear().then(() => {
            this.mediaSource.endOfStream();
            this.mediaSource.duration = 0;
            this.mediaSource.clearLiveSeekableRange();
            this.play();
        });
    }

    clear() {
        this.reset();
        this.video.src = URL.createObjectURL(this.mediaSource)

        return this.setupEvents();
    }

    setupEvents() {
        this.resolved = false;
        this.mediaReady = new Promise((resolve, reject) => {
            this._sourceOpen = () => {
                console.debug(`Media source opened: ${this.mediaSource.readyState}`);
                if (!this.resolved) {
                    this.resolved = true;
                    resolve();
                }
            };
            this._sourceEnded = () => {
                console.debug(`Media source ended: ${this.mediaSource.readyState}`);
            };
            this._sourceClose = () => {
                console.debug(`Media source closed: ${this.mediaSource.readyState}`);
                if (this.resolved) {
                }
            };
        });
        return this.mediaReady;
    }

    reset() {
        this.ready = false;
        this.buffer.destroy();

        if (this.mediaSource.readyState === 'open') {
            this.mediaSource.duration = 0;
            this.mediaSource.endOfStream();
        }
        this.updating = false;
        this.resolved = false;
        this.buffer = {};
    }

    setCodec(mimeCodec) {
        return this.mediaReady.then(() => {
            this.buffer = new MSEBuffer(this, mimeCodec);
            this.buffer.setLive(this.is_live);
        });
    }

    feed(data) {
        if (this.buffer) {
            this.buffer.feed(data);
        }
    }
}