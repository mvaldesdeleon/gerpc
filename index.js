const { promisify } = require('util');
const grpc = require('grpc');

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 5000;

module.exports = function gerp() {
    const server = new grpc.Server();
    const insecureCredentials = grpc.ServerCredentials.createInsecure();
    let globalEncode, globalDecode;

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

    function internalHandler(name, call, callback) {
        // we need to run the middlewares, plus the methods[name] handler
        // and deal with the callback stuff
        // here is also where we define the API for the handler and the middlewares
        // call: {cancelled, metadata, request, getPeer(), sendMetadata()}
        // metadata: {add(), clone(), get(), getMap(), remove(), set()}
        // callback: callback(error, value, trailer, flags)
        //
        const methodHandler = methods[name];

        try {
            methodHandler(call.request)
                .then(result => callback(null, result))
                .catch(error => callback(formatError(error)));
        } catch(error) {
            callback(formatError(error));
        }
    }

    function start({host = DEFAULT_HOST, port = DEFAULT_PORT, encode, decode}, credentials = insecureCredentials) {
        // XXX Check that the server is not started more than once. Right now it defaults to `grpc`s behaviour
        server.bind(`${host}:${port}`, credentials);
        server.start();

        globalEncode = encode;
        globalDecode = decode;

        return {
            tryShutdown: promisify(server.tryShutdown.bind(server)),
            forceShutdown: server.forceShutdown.bind(server)
        };
    }

    function method(name, handler, encode, decode) {
        if (!methods[name]) registerMethod(name, encode, decode);

        methods[name] = handler;

        return true; // XXX Chainable API?
    }

    function use(middleware) {
        middlewares.push(middleware);
    }

    return {
        method,
        use,
        start
    };
};

module.exports.grpc = grpc;
