import RestServer from "../server/RestServer";
import {AxiosStatic} from "axios";
import * as socketio from "socket.io";

export default class PluginConfig {
    axios: AxiosStatic;
    ws: socketio.Server;
    basepath: string;
    server: RestServer;

    constructor(axios: AxiosStatic, ws: socketio.Server, basepath: string, server: RestServer) {
        this.axios = axios;
        this.ws = ws;
        this.basepath = basepath;
        this.server = server;
    }
}
