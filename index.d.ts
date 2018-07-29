declare module 'gerpc' {
    import * as Grpc from 'grpc';

    interface IMetadata {
        [key: string]: string;
    }

    interface IClientOptions {
        host?: string;
        port?: number | string;
        encode?: Grpc.serialize<any>;
        decode?: Grpc.deserialize<any>;
    }

    interface IClient {
        ready: (deadline: number) => Promise<IClient>;
        call: <A, B>(
            method: string,
            request: A,
            metadata?: IMetadata,
            encode?: Grpc.serialize<A>,
            decode?: Grpc.deserialize<B>
        ) => B;
        close: typeof Grpc.Client.prototype.close;
    }

    export function client(
        options: IClientOptions,
        credentials?: Grpc.ChannelCredentials,
        nativeOptions?: object
    ): IClient;

    interface IServerOptions {
        encode?: Grpc.serialize<any>;
        decode?: Grpc.serialize<any>;
    }

    interface IServerStartOptions {
        host?: string;
        port?: number | string;
    }

    interface IRunningServer {
        tryShutdown: () => Promise<void>;
        forceShutdown: typeof Grpc.Server.prototype.forceShutdown;
    }

    type IMethodHandler<A, B> = (a: A) => Promise<B>;

    interface IMiddlewareRequest {
        request: any;
        metadata: IMetadata;
        cancelled: boolean;
    }

    interface IMiddlewareResponse {
        response: any;
        metadata?: IMetadata;
    }

    type IMiddlewareNext = () => Promise<IMiddlewareResponse>;

    type IMiddleware = (
        request: IMiddlewareRequest,
        next: IMiddlewareNext
    ) => Promise<IMiddlewareResponse>;

    interface IServer {
        start: (
            options: IServerStartOptions,
            credentials?: Grpc.ServerCredentials
        ) => IRunningServer;
        method: <A, B>(
            name: string,
            handler: IMethodHandler<A, B>,
            encode?: Grpc.serialize<B>,
            decode?: Grpc.deserialize<A>
        ) => IServer;
        use: (middleware: IMiddleware) => IServer;
    }

    export function server(options: IServerOptions, nativeOptions?: object): IServer;

    export const grpc: typeof Grpc;
}
