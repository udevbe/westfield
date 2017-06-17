import {MP4} from '../iso-bmff/mp4-generator.js';
import {H264Remuxer} from './h264.js';
import {MSE} from '../presentation/mse.js';

export class Remuxer {

    constructor(videoElement) {
        this.mse = new MSE(videoElement);
        this.reset();
    }

    reset() {
        this.trackConverter = {};
        this.initialized = false;
        this.enabled = false;
        this.mse.clear();
    }

    destroy() {
        this.mse.destroy();
        this.mse = null;
    }

    onTrack(track) {
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
    }

    setTimeOffset(timeOffset) {
        if (this.trackConverter) {
            this.trackConverter.timeOffset = timeOffset;
        }
    }

    init() {
        let initPts = Infinity;
        let initDts = Infinity;

        if (!MSE.isSupported([this.trackConverter.mp4track.codec])) {
            throw new Error(`${this.trackConverter.mp4track.type} codec ${track.mp4track.codec} is not supported`);
        }
        this.trackConverter.init(initPts, initDts/*, false*/);

        const initSegment = MP4.initSegment([this.trackConverter.mp4track], this.trackConverter.duration * this.trackConverter.timescale, this.trackConverter.timescale);
        const initmse = this.initMSE(initSegment);

        this.initialized = true;
        initmse.then(() => {
            this.mse.play();
            this.enabled = true;
        });
    }

    initMSE(initSegment) {
        if (MSE.isSupported([this.trackConverter.mp4track.codec])) {
            return this.mse.setCodec(this.trackConverter, `video/mp4; codecs="${this.trackConverter.mp4track.codec}"`).then(() => {
                this.mse.feed(this.trackConverter, initSegment);
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
                this.init();
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