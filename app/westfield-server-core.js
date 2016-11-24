//TODO figure out how to setup a websocket server (use express?)

const WebSocketServer = require('ws').Server;

//westfield server namespace
const wfs = wfs || {};

const wss = new WebSocketServer({port: 8080});

