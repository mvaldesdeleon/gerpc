# gerp

Expressive grpc server, with plugabble encoding.

Scope is limited to exactly my use case.

# Why

gRPC is great, but maybe you don't want to go all-in with protobuf.
In that case, you'll find yourself out of luck with the commonly-suggested libraries.

The official library is straight-forward enough, but we can provide a better API for it, more in tune to what developers would expect.

I wish `mali` exposed this level of configuration, then I would not need to write this.

# Use

```
const gerp = require('gerp');
const server = gerp();

// internal `grpc` is exposed if you need to access it
const grpc = gerp.grpc;

// handler: request -> Promise(respose)
server.method('beep', function(request) {
    return Promise.resolve('boop');
});

// middleware: ({request, metadata, cancelled}, next) -> Promise({response, metadata})
// next: () -> Promise({response, metadata})
server.use(async function({request, metadata, cancelled}, next) {
    // do something with request and metadata
    const result = await next();
    // do sonething with result.response and result.metadata
    return result;
});

// start the grpc server, with the provided default encoder and decoder
// host defaults to '0.0.0.0' and can be overriden
// server credentials are also accepted as an optional second argument
server.start({port: 8080, encode: JSON.stringify, decode: JSON.parse});
```

# Examples

TBD

# Install
With [npm](https://npmjs.org) do:

```
npm install gerp
```

# License

MIT
