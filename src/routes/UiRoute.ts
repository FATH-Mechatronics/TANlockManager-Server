import IRoute from "./IRoute";
import RestServer from "../server/Restserver";
import * as express from 'express';
import * as path from 'path';

export default class UiRoute implements IRoute {
    public publicURLs(): string[] {
        return ["/ui", "/ui/.*"];
    }
    public init(server: RestServer): void {
        server.app
            .use("/ui", express.static(path.resolve(__dirname, "../ui")));
    }
}