import {getTagged} from '../../deps/bp_logger.js';
import {H264Parser} from '../parsers/h264.js';
import {BaseRemuxer} from './base.js';

const Log = getTagged("remuxer:h264"); 
// TODO: asm.js
export class H264Remuxer extends BaseRemuxer {

    constructor(timescale, scaleFactor=1, params={}) {
        super(timescale, scaleFactor);

        this.nextDts = undefined;
        this.readyToDecode = false;
        this.initialized = false;

        this.firstDTS=0;
        this.firstPTS=0;
        this.lastDTS=undefined;
        this.lastSampleDuration = 0;
        this.lastDurations = [];
        // this.timescale = 90000;
        this.tsAlign = Math.round(this.timescale/60);

        this.mp4track={
            id:BaseRemuxer.getTrackID(),
            type: 'video',
            len:0,
            fragmented:true,
            sps:'',
            pps:'',
            width:0,
            height:0,
            timescale: timescale,
            duration: timescale,
            samples: []
        };
        this.samples = [];
        this.lastGopDTS = 0;
        this.gop=[];
        this.firstUnit = true;

        this.h264 = new H264Parser(this);

        if (params.sps) {
            this.setSPS(new Uint8Array(params.sps));
        }
        if (params.pps) {
            this.setPPS(new Uint8Array(params.pps));
        }

        if (this.mp4track.pps && this.mp4track.sps) {
            this.readyToDecode = true;
        }
    }

    _scaled(timestamp) {
        return timestamp >>> this.scaleFactor;
    }

    _unscaled(timestamp) {
        return timestamp << this.scaleFactor;
    }

    setSPS(sps) {
        this.h264.parseSPS(sps);
    }

    setPPS(pps) {
        this.h264.parsePPS(pps);
    }

    remux(nalu) {
        // console.log(nalu.toString());
        if (this.lastGopDTS < nalu.dts) {
            this.gop.sort(BaseRemuxer.dtsSortFunc);
            for (let unit of this.gop) {
                if (this.h264.parseNAL(unit)){
                    if (this.firstUnit) {
                        unit.ntype = 5;//NALU.IDR;
                        this.firstUnit = false;
                    }
                    if (super.remux.call(this, unit)) {
                        this.mp4track.len += unit.getSize();
                    }
                }
            }
            this.gop = [];
            this.lastGopDTS = nalu.dts
        }
        this.gop.push(nalu);
    }

    getPayload() {
        if (!this.getPayloadBase()) {
            return null;
        }

        let payload = new Uint8Array(this.mp4track.len);
        let offset = 0;
        let samples=this.mp4track.samples;
        let mp4Sample, lastDTS, pts, dts;


        // Log.debug(this.samples.map((e)=>{
        //     return Math.round((e.dts - this.initDTS));
        // }));

        // let minDuration = Number.MAX_SAFE_INTEGER;
        while (this.samples.length) {
            let sample = this.samples.shift();
            if (sample === null) {
                // discontinuity
                this.nextDts = undefined;
                break;
            }

            let unit = sample.unit;
            
            pts = /*Math.round(*/(sample.pts - this.initDTS)/*/this.tsAlign)*this.tsAlign*/;
            dts = /*Math.round(*/(sample.dts - this.initDTS)/*/this.tsAlign)*this.tsAlign*/;
            // ensure DTS is not bigger than PTS
            dts = Math.min(pts,dts);
            // if not first AVC sample of video track, normalize PTS/DTS with previous sample value
            // and ensure that sample duration is positive
            if (lastDTS !== undefined) {
                let sampleDuration = this.scaled(dts - lastDTS);
                // Log.debug(`Sample duration: ${sampleDuration}`);
                if (sampleDuration <= 0) {
                    Log.log(`invalid AVC sample duration at PTS/DTS: ${pts}/${dts}|lastDTS: ${lastDTS}:${sampleDuration}`);
                    this.mp4track.len -= unit.getSize();
                    continue;
                }
                // minDuration = Math.min(sampleDuration, minDuration);
                this.lastDurations.push(sampleDuration);
                if (this.lastDurations.length > 100) {
                    this.lastDurations.shift();
                }
                mp4Sample.duration = sampleDuration;
            } else {
                if (this.nextDts) {
                    let delta = dts - this.nextDts;
                    // if fragment are contiguous, or delta less than 600ms, ensure there is no overlap/hole between fragments
                    if (/*contiguous ||*/ Math.abs(Math.round(BaseRemuxer.toMS(delta))) < 600) {

                        if (delta) {
                            // set DTS to next DTS
                            // Log.debug(`Video/PTS/DTS adjusted: ${pts}->${Math.max(pts - delta, this.nextDts)}/${dts}->${this.nextDts},delta:${delta}`);
                            dts = this.nextDts;
                            // offset PTS as well, ensure that PTS is smaller or equal than new DTS
                            pts = Math.max(pts - delta, dts);
                        }
                    } else {
                        if (delta < 0) {
                            Log.log(`skip frame from the past at DTS=${dts} with expected DTS=${this.nextDts}`);
                            this.mp4track.len -= unit.getSize();
                            continue;
                        }
                    }
                }
                // remember first DTS of our avcSamples, ensure value is positive
                this.firstDTS = Math.max(0, dts);
            }

            mp4Sample = {
                size: unit.getSize(),
                duration: 0,
                cts: this.scaled(pts - dts),
                flags: {
                    isLeading: 0,
                    isDependedOn: 0,
                    hasRedundancy: 0,
                    degradPrio: 0
                }
            };
            let flags = mp4Sample.flags;
            if (sample.unit.isKeyframe() === true) {
                // the current sample is a key frame
                flags.dependsOn = 2;
                flags.isNonSync = 0;
            } else {
                flags.dependsOn = 1;
                flags.isNonSync = 1;
            }

            payload.set(unit.getData(), offset);
            offset += unit.getSize();

            samples.push(mp4Sample);
            lastDTS = dts;
        }

        if (!samples.length) return null;

        let avgDuration = this.lastDurations.reduce(function(a, b) { return (a|0) + (b|0); }, 0) / (this.lastDurations.length||1)|0;
        if (samples.length >= 2) {
            this.lastSampleDuration = avgDuration;
            mp4Sample.duration = avgDuration;
        } else {
            mp4Sample.duration = this.lastSampleDuration;
        }

        if(samples.length && (!this.nextDts /*|| navigator.userAgent.toLowerCase().indexOf('chrome') > -1*/)) {
            let flags = samples[0].flags;
            // chrome workaround, mark first sample as being a Random Access Point to avoid sourcebuffer append issue
            // https://code.google.com/p/chromium/issues/detail?id=229412
            flags.dependsOn = 2;
            flags.isNonSync = 0;
        }

        // next AVC sample DTS should be equal to last sample DTS + last sample duration
        this.nextDts = dts + this.unscaled(this.lastSampleDuration);
        // Log.debug(`next dts: ${this.nextDts}, last duration: ${this.lastSampleDuration}, last dts: ${dts}`);

        return new Uint8Array(payload.buffer, 0, this.mp4track.len);
    }
}