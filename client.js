const { promisify } = require('util');
const grpc = require('grpc');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5000;

module.exports = function client({host = DEFAULT_HOST, port = DEFAULT_PORT, encode, decode}, credentials, options) {
    const insecureCredentials = grpc.credentials.createInsecure();
    const client = new grpc.Client(`${host}:${port}`, credentials || insecureCredentials, options);
    let globalEncode, globalDecode;

    const close = client.close.bind(client);
    const waitForReady = promisify(client.waitForReady.bind(client));
    const makeUnaryRequest = promisify(client.makeUnaryRequest.bind(client));

    globalEncode = encode;
    globalDecode = decode;

    function ready(deadline) {
        return waitForReady(Date.now() + deadline); // XXX Chainable API?
    }

    function call(method, request, metadata, encode, decode) {
        // XXX Check that (encode || globalEncode) and (decode || globalDecode) are valid.
        return makeUnaryRequest(method, encode || globalEncode, decode || globalDecode, request, metadata);
    }

    return {
        ready,
        call,
        close
    };
};
