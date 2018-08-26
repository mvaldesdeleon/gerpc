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
        if (!(encode || globalEncode)) throw new Error('An `encode` function must be provided, either globally or for each method.');
        if (!(decode || globalDecode)) throw new Error('A `decode` function must be provided, either globally or for each method.');

        return makeUnaryRequest(method, encode || globalEncode, decode || globalDecode, request, nativeMetadata(metadata))
            .catch(error => {
                const metadata = error.metadata.getMap();

                error.serverError = (decode || globalDecode)(metadata['error-bin']);
                delete error.metadata;

                return Promise.reject(error);
            });
    }

    return instance;
};
