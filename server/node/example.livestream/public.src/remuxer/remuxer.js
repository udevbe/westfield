import {MP4} from '../iso-bmff/mp4-generator.js';
import {H264Remuxer} from './h264.js';
import {MSE} from '../presentation/mse.js';

export class Remuxer {

    constructor(mediaElement) {
        this.mse = new MSE([mediaElement]);
        this.eventSource = new EventEmitter();

        this.reset();

        this.eventSource.addEventListener('ready', this.init.bind(this));
    }

    reset() {
        this.trackConverter = {};
        this.initialized = false;
        this.initSegment = {};
        this.streams = {};
        this.enabled = false;
        this.mse.clear();
    }

    destroy() {
        this.mseEventSource.destroy();
        this.mse.destroy();
        this.mse = null;
        this.eventSource.destroy();
    }

    onTrack(track) {
        // store available track types
        this.trackConverter = new H264Remuxer(90000, 1, track.params);
        if (track.offset) {
            this.trackConverter.timeOffset = track.offset;
        }
        if (track.duration) {
            this.trackConverter.mp4track.duration = track.duration * (this.trackConverter.timescale || 90000);
            this.trackConverter.duration = track.duration;
        } else {
            this.trackConverter.duration = 1;
        }

        this.mse.setLive(!this.client.seekable);
    }

    setTimeOffset(timeOffset) {
        if (this.trackConverter) {
            this.trackConverter.timeOffset = timeOffset;
        }
    }

    init() {
        let initmse = [];
        let initPts = Infinity;
        let initDts = Infinity;

        if (!MSE.isSupported([this.trackConverter.mp4track.codec])) {
            throw new Error(`${this.trackConverter.mp4track.type} codec ${track.mp4track.codec} is not supported`);
        }
        this.trackConverter.init(initPts, initDts/*, false*/);
        // initPts = Math.min(track.initPTS, initPts);
        // initDts = Math.min(track.initDTS, initDts);

        //track.init(initPts, initDts);
        this.initSegment = MP4.initSegment([this.trackConverter.mp4track], this.trackConverter.duration * this.trackConverter.timescale, this.trackConverter.timescale);
        initmse.push(this.initMSE());

        this.initialized = true;
        Promise.all(initmse).then(() => {
            this.mse.play();
            this.enabled = true;
        });
    }

    initMSE() {
        if (MSE.isSupported([this.trackConverter.mp4track.codec])) {
            return this.mse.setCodec(this.trackConverter, `video/mp4; codecs="${this.trackConverter.mp4track.codec}"`).then(() => {
                this.mse.feed(this.trackConverter, this.initSegment);
            });
        } else {
            throw new Error('Codecs are not supported');
        }
    }

    flush(nalQueue) {
        this.onSamples(nalQueue);
        if (!this.initialized) {
            if (this.trackConverter) {
                if (!this.trackConverter.readyToDecode || !this.trackConverter.samples.length) return;
                this.eventSource.dispatchEvent('ready');
            }
        } else {
            let pay = this.trackConverter.getPayload();
            if (pay && pay.byteLength) {
                this.mse.feed('video', [MP4.moof(this.trackConverter.seq, this.trackConverter.scaled(this.trackConverter.firstDTS), this.trackConverter.mp4track), MP4.mdat(pay)]);
                this.trackConverter.flush();
            }
        }
    }

    onSamples(nalQueue) {
        let queue = nalQueue;
        while (queue.length) {
            let units = queue.shift();
            for (let chunk of units) {
                this.trackConverter.remux(chunk);
            }
        }
    }
}