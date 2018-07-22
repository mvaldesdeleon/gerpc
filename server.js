const { promisify } = require('util');
const grpc = require('grpc');

const { nativeMetadata, DEFAULT_PORT } = require('./common.js');
const DEFAULT_HOST = '0.0.0.0';

module.exports = function server(options) {
    const insecureCredentials = grpc.ServerCredentials.createInsecure();
    const server = new grpc.Server(options);
    let globalEncode, globalDecode;

    const tryShutdown = promisify(server.tryShutdown.bind(server));
    const forceShutdown = server.forceShutdown.bind(server);

    const methods = {};
    const middlewares = [];

    function registerMethod(name, encode, decode) {
        // XXX Check that (encode || globalEncode) and (decode || globalDecode) are valid.
        server.register(name, (...args) => internalHandler(name, ...args), encode || globalEncode, decode || globalDecode, 'unary');
    }

    function formatError(error) {
        if (error === null || typeof error !== 'object') error = new Error(error);
        // message, code, details, metadata
        error.code = grpc.status.INTERNAL;

        return error;
    }

    function addEmptyMetadata(response) {
        return {
            response,
            metadata: {}
        };
    }

    function run(name, request, metadata, cancelled) {
        const methodHandler = methods[name];

        function next(index) {
            const middleware = middlewares[index];

            // API: middleware: ({request, metadata, cancelled}, next) -> Promise({response, metadata})
            // API: next: () -> Promise({response, metadata})
            if (middleware) return middleware({request, metadata, cancelled}, () => next(index + 1));
            // API: methodHandler: request -> Promise(response)
            else return methodHandler(request).then(addEmptyMetadata);
        }

        return next(0);
    }

    function internalHandler(name, call, callback) {
        const { request, metadata, cancelled } = call;

        // No failing at the handlers!
        try {
            run(name, request, metadata.getMap(), cancelled)
                .then(({response, metadata}) => callback(null, response, nativeMetadata(metadata)))
                .catch(error => callback(formatError(error)));
        } catch(error) {
            callback(formatError(error));
        }
    }

    const instance = { start, method, use };

    function start({host = DEFAULT_HOST, port = DEFAULT_PORT, encode, decode}, credentials = insecureCredentials) {
        // XXX Check that the server is not started more than once. Right now it defaults to `grpc`s behaviour
        server.bind(`${host}:${port}`, credentials);
        server.start();

        globalEncode = encode;
        globalDecode = decode;

        return {
            tryShutdown,
            forceShutdown
        };
    }

    function method(name, handler, encode, decode) {
        if (!methods[name]) registerMethod(name, encode, decode);

        methods[name] = handler;

        return instance;
    }

    function use(middleware) {
        middlewares.push(middleware);

        return instance;
    }

    return instance;
};
