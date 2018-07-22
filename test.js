const gerpc = require('./index.js');

function encode(input) {
    return Buffer.from(JSON.stringify(input), 'utf8');
}

function decode(input) {
    return JSON.parse(input.toString('utf8'));
}

const server = gerpc.server({encode, decode});

server.method('beep', function(request) {
    return Promise.resolve('boop');
});

server.use(async function({request, metadata, cancelled}, next) {
    const result = await next();
    return result;
});

server.start({encode, decode});

console.log('gRPC server is now running...');
console.log('Ctrl-C to exit');

const client = gerpc.client({encode, decode});

client.ready().then(async client => {
    console.log('Calling method `beep`');
    const response = await client.call('beep', {robot: true});

    console.log(`Received response: \`${response}\``);

    client.close();
});
