# gerp

Expressive grpc server, with plugabble encoding.

Scope is limited to exactly my use case.

# Why

While gRPC itself explicitly claims that using protobuf is optional, it seems the commonly-used libraries remove this option completely (or at the very least do not document how to access it).

Protobuf is a great idea, but it comes at the price of requiring you to specify your protocol upfront. While this by itself is also desireable, it might not be possible for a large project that is consider switghing from HTTP to gRPC.

For those scenarios, one should be able to keep their existing encoding in place, and just rely on gRPC for transport.

# Use

```
const gerp = require('gerp');
const server = gerp();

// internal `grpc` is exposed if you need to access it
const grpc = gerp.grpc;

// name and handler must be provided to register a new method
// method-specific encoder and decoder can be provided as optional third and fourth parameters, respectively
// if not provided, the default encoder and decoder will be used instead
// handler: request -> Promise(respose)
server.method('beep', function(request) {
    return Promise.resolve('boop');
});

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

// encode: * -> Buffer
function encode(input) {
    return Buffer.from(JSON.stringify(input), 'utf8');
}

// decode: Buffer -> *
function decode(input) {
    return JSON.parse(input.toString('utf8'));
}

// start the grpc server, with the provided default encoder and decoder
// host defaults to '0.0.0.0' and can be overriden
// server credentials are also accepted as an optional second argument
server.start({port: 8080, encode, decode});

// and now you have a running gRPC server, using (binary) JSON for encoding/decoding its messages
```

# Install
With [npm](https://npmjs.org) do:

```
npm install gerp
```

# License

MIT
