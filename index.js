const grpc = require('grpc');
const client = require('./client.js');
const server = require('./server.js');

module.exports = {
    client,
    server,
    grpc
};
