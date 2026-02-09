declare module "session-file-store" {
    import session from "express-session";

    interface FileStoreOptions {
        path?: string;
        ttl?: number;
        retries?: number;
        factor?: number;
        minTimeout?: number;
        maxTimeout?: number;
        reapInterval?: number;
        reapAsync?: boolean;
        reapSyncFallback?: boolean;
        logFn?: (...args: any[]) => void;
        fallbackSessionFn?: () => any;
        secret?: string;
        encoder?: (data: any) => string;
        decoder?: (data: string) => any;
        encoding?: string;
        fileExtension?: string;
    }

    function FileStore(session: typeof import("express-session")): new (options?: FileStoreOptions) => session.Store;

    export = FileStore;
}
