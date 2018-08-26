const { promisify } = require('util');
const { decycle } = require('json-cycle');
const grpc = require('grpc');

const { nativeMetadata, DEFAULT_PORT } = require('./common.js');
const DEFAULT_HOST = '0.0.0.0';

module.exports = function server({encode, decode, debug = false}, nativeOptions) {
    const insecureCredentials = grpc.ServerCredentials.createInsecure();
    const server = new grpc.Server(nativeOptions);
    let globalEncode, globalDecode;

    const tryShutdown = promisify(server.tryShutdown.bind(server));
    const forceShutdown = server.forceShutdown.bind(server);

    globalEncode = encode;
    globalDecode = decode;

    const methods = {};
    const middlewares = [];

    function registerMethod(name, encode, decode) {
        if (!(encode || globalEncode)) throw new Error('An `encode` function must be provided, either globally or for each method.');
        if (!(decode || globalDecode)) throw new Error('A `decode` function must be provided, either globally or for each method.');

        server.register(name, (...args) => internalHandler(name, ...args), encode || globalEncode, decode || globalDecode, 'unary');
    }

    function formatError(error) {
        return {
            code: grpc.status.INTERNAL,
            message: error.message || 'Server Error'
        };
    }

    function errorMetadata(error, encode) {
        if (error === null || typeof error !== 'object') {
            error = new Error(error);
        }

        error = Object.getOwnPropertyNames(error).reduce((copy, key) => {
            copy[key] = error[key];
            return copy;
        }, {});

        if (!debug) {
            delete error.stack;
        }

        return {
            'error-bin': (encode || globalEncode)(decycle(error))
        };
    }

    function addEmptyMetadata(response) {
        return {
            response,
            metadata: {}
        };
    }

    function run(name, request, metadata, cancelled) {
        const methodHandler = methods[name].handler;

        function next(index) {
            const middleware = middlewares[index];

            if (middleware) {
                // API: middleware: ({request, metadata, cancelled}, next) -> Promise({response, metadata})
                // API: next: () -> Promise({response, metadata})
                const response = middleware({request, metadata, cancelled}, () => next(index + 1));

                if (typeof response.then !== 'function') {
                    if (debug) throw new Error(`Middleware #${index} did not return a Promise.`);
                    else throw new Error('Server Error');
                }

                return response;
            } else {
                // API: methodHandler: request -> Promise(response)
                const response = methodHandler(request);

                if (typeof response.then !== 'function') {
                    if (debug) throw new Error(`Handler for method '${name}' did not return a Promise.`);
                    else throw new Error('Server Error');
                }

                return response.then(addEmptyMetadata);
            }
        }

        return next(0);
    }

    function internalHandler(name, call, callback) {
        const { request, metadata, cancelled } = call;

        // No failing at the handlers!
        try {
            run(name, request, metadata.getMap(), cancelled)
                .then(({response, metadata}) => callback(null, response, nativeMetadata(metadata)))
                // Error returned from handler
                .catch(error => callback(formatError(error), null, nativeMetadata(errorMetadata(error, methods[name].encode))));
        } catch(error) {
            // Actual error in the handler
            callback(formatError(error), null, nativeMetadata(errorMetadata(error, methods[name].encode)));
        }
    }

    const instance = { start, method, use };

    function start({host = DEFAULT_HOST, port = DEFAULT_PORT }, credentials = insecureCredentials) {
        // XXX Check that the server is not started more than once. Right now it defaults to `grpc`s behaviour
        server.bind(`${host}:${port}`, credentials);
        server.start();

        return {
            tryShutdown,
            forceShutdown
        };
    }

    function method(name, handler, encode, decode) {
        if (!methods[name]) registerMethod(name, encode, decode);

        methods[name] = {
            handler,
            encode,
            decode
        };

        return instance;
    }

    function use(middleware) {
        middlewares.push(middleware);

        return instance;
    }

    return instance;
};
