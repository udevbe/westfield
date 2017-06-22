export class MSEBuffer {
    constructor(mediaSource, video, sourceBuffer) {
        this._mediaSource = mediaSource;
        this._video = video;
        this._queue = [];
        this._sourceBuffer = sourceBuffer;
        this._cleaningNeeded = false;

        this._sourceBuffer.onupdateend = () => {
            if (this._cleaningNeeded) {
                this._cleanBuffer()
            } else {
                this._feedNext();
            }
        };
    }

    _doAppend(data) {
        if (this._video.error) {
            throw new Error(this._video.error.message);
        }

        if (this._sourceBuffer.updating) {
            this._queue.unshift(data);
            return;
        } else {
            this._sourceBuffer.appendBuffer(data);
        }

        // if (this._sourceBuffer.buffered.length > 0.045) {
        //     this._video.currentTime = this._sourceBuffer.buffered.end(0);
        // }

        setTimeout(() => {
            this._cleaningNeeded = true;
        }, 10000);
    }

    _cleanBuffer() {
        const endTime = (this._video.currentTime - 0.045);
        if (this._sourceBuffer.buffered.length < 1) {
            this._feedNext();
        } else if (!this._sourceBuffer.updating && this._sourceBuffer.buffered.start(0) < endTime) {
            this._sourceBuffer.remove(this._sourceBuffer.buffered.start(0), endTime);
            this._cleaningNeeded = false;
        }
    }

    _feedNext() {
        if (this._queue.length) {
            this._doAppend(this._queue.shift());
        }
        //else flush
    }

    feed(data) {
        this._queue = this._queue.concat(data);
        this._feedNext();
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

    constructor(video, mediaSource) {
        this._video = video;
        this._mediaSource = mediaSource;
        this.initialized = false;
    }

    play() {
        this._video.play();
    }

    setCodec(mimeCodec) {
        const sourceBuffer = this._mediaSource.addSourceBuffer(mimeCodec);
        sourceBuffer.mode = "segments";
        this._buffer = new MSEBuffer(this._mediaSource, this._video, sourceBuffer);
    }

    feed(data) {
        if (this._buffer) {
            this._buffer.feed(data);
        }
    }
}