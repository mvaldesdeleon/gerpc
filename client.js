const { promisify } = require('util');
const grpc = require('grpc');

const { nativeMetadata, DEFAULT_PORT } = require('./common.js');
const DEFAULT_HOST = '127.0.0.1';

module.exports = function client({host = DEFAULT_HOST, port = DEFAULT_PORT, encode, decode}, credentials, nativeOptions) {
    const insecureCredentials = grpc.credentials.createInsecure();
    const client = new grpc.Client(`${host}:${port}`, credentials || insecureCredentials, nativeOptions);
    let globalEncode, globalDecode;

    const close = client.close.bind(client);
    const waitForReady = promisify(client.waitForReady.bind(client));
    const makeUnaryRequest = promisify(client.makeUnaryRequest.bind(client));

    globalEncode = encode;
    globalDecode = decode;

    const instance = { ready, call, close };

    function ready(deadline = +Infinity) {
        return waitForReady(Date.now() + deadline).then(() => instance);
    }

    function call(method, request, metadata = {}, encode, decode) {
        // XXX Check that (encode || globalEncode) and (decode || globalDecode) are valid.
        return makeUnaryRequest(method, encode || globalEncode, decode || globalDecode, request, nativeMetadata(metadata));
    }

    return instance;
};
