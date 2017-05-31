const path = require('path');

module.exports = {
    entry: './public.src/compositor-client.js',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'compositor-client.bundle.js'
    }
};