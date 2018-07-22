# gerpc

Expressive grpc client/server, with plugabble encoding.

Scope is limited to exactly my use case.

# Why

While gRPC itself explicitly claims that using protobuf is optional, it seems the commonly-used libraries remove this option completely (or at the very least do not document how to access it).

Protobuf is a great idea, but it comes at the price of requiring you to specify your protocol upfront. While this by itself is also desireable, it might not be possible for a large project that is consider switghing from HTTP to gRPC.

For those scenarios, one should be able to keep their existing encoding in place, and just rely on gRPC for transport.

# Use

## Client

```js
const gerpc = require('gerpc');

// internal `grpc` is exposed if you need to access it
const grpc = gerpc.grpc;

// encode: * -> Buffer
function encode(input) {
    return Buffer.from(JSON.stringify(input), 'utf8');
}

// decode: Buffer -> *
function decode(input) {
    return JSON.parse(input.toString('utf8'));
}

// start the grpc client, with the provided default encoder and decoder
// client credentials are also accepted as an optional second argument
const client = gerpc.client({host: 'example.com', port: 8080, encode, decode});

// wait until connected
// optional timeout in ms can be provided as argument
// resolves to the client instance, for chaining
client.ready().then(async client => {
    // method name and request message must be provided
    // optional metadata can be provided as plain object as the third argument
    // call-specific encoder and decoder can be provided as optional third and fourth arguments, respectively
    // if not provided, the default encoder and decoder will be used instead
    const response = await client.call('beep', {robot: true});

    console.log(response);

    // disconnect from the server
    client.close();
});
```

## Server

```js
const gerpc = require('gerpc');

// internal `grpc` is exposed if you need to access it
const grpc = gerpc.grpc;

// encode: * -> Buffer
function encode(input) {
    return Buffer.from(JSON.stringify(input), 'utf8');
}

// decode: Buffer -> *
function decode(input) {
    return JSON.parse(input.toString('utf8'));
}

// create the grpc server, with the provided default encoder and decoder
// native options are also accepted as an optional second argument
const server = gerpc.server({encode, decode});

// name and handler must be provided to register a new method
// method-specific encoder and decoder can be provided as optional third and fourth arguments, respectively
// if not provided, the default encoder and decoder will be used instead
// handler: request -> Promise(respose)
server.method('beep', function(request) {
    return Promise.resolve('boop');
});
// returns server, for chaining

// middleware: ({request, metadata, cancelled}, next) -> Promise({response, metadata})
// next: () -> Promise({response, metadata})
server.use(async function({request, metadata, cancelled}, next) {
    // do something with request and metadata
    // these objects are shared across all handlers, so you should mutate them
    // CAVEAT: if the request is a primitive value, you will not be able to mutate it
    const result = await next();
    // do sonething with result.response and result.metadata
    return result;
});
// returns server, for chaining

// start the grpc server
// host defaults to '0.0.0.0' and can be overriden
// server credentials are also accepted as optional second argument
server.start({port: 8080});
// returns { tryShutdown, forceShutdown }
// tryShutdown: () -> Promise(undefined)
// forceShutdown: () -> undefined

// and now you have a running gRPC server, using (binary) JSON for encoding/decoding its messages
```

# Example

See `test.js`. Not a proper test (yet), but serves as working example, combining both use cases above.

# Install
With [npm](https://npmjs.org) do:

```
npm install gerpc
```

# License

MIT
