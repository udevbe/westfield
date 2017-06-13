export class StreamType {
    static get VIDEO() {return 1;}
    static get AUDIO() {return 2;}

    static get map() {return {
        [StreamType.VIDEO]: 'video',
        [StreamType.AUDIO]: 'audio'
    }};
}

export class PayloadType {
    static get H264() {return 1;}
    static get AAC() {return 2;}

    static get map() {return {
        [PayloadType.H264]: 'video',
        [PayloadType.AAC]: 'audio'
    }};

    static get string_map() {return  {
        H264: PayloadType.H264,
        AAC: PayloadType.AAC,
        'MP4A-LATM': PayloadType.AAC,
        'MPEG4-GENERIC': PayloadType.AAC
    }}
}