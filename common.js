const grpc = require('grpc');

const DEFAULT_PORT = 5000;

function nativeMetadata(metadata) {
    const nativeMetadata = new grpc.Metadata();

    for (let key in metadata) {
        nativeMetadata.set(key, metadata[key]);
    }

    return nativeMetadata;
}

module.exports = {
    DEFAULT_PORT,
    nativeMetadata
};
