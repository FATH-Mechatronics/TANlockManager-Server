import {Server} from "https";
import {Application} from "express";
import * as socketio from "socket.io";
import express from "express";
import DataRoute from "../routes/DataRoute";
import EventRoute from "../routes/EventRoute";
import ConfigRoute from "../routes/ConfigRoute";
import CertHandling from "./CertHandling";
import PluginHandler from "../handler/PluginHandler";
import JWTHandler from "./JWTHandler";
import axios, {AxiosStatic} from "axios";
import CameraHandler from "../handler/CameraHandler";
import AuthRoute from "../routes/AuthRoute";
import IRoute from "../routes/IRoute";
import Permission from "../model/Permission";
import AuthUser from "../model/AuthUser";
import TanLock from "../model/TanLock";
import LogEvent from "../model/LogEvent";
import CabinetLogEntry from "../model/CabinetLogEntry";
import SensorFetchHandler from "../handler/SensorFetchHandler";
import BaseDirProvider from "../data/BaseDirProvider";
import TanHandler from "../handler/TanHandler";
import ExtendedLoggerType from "../model/ExtendedLoggerType";
import UiRoute from "../routes/UiRoute";
import PluginConfig from "../model/PluginConfig";
import LockEventHandler from "../handler/LockEventHandler";

// const express = require("express");
const http = require('httpolyglot');
const cookieParser = require('cookie-parser');

function isLocalhost(ipA) {
    switch (ipA) {
        case "localhost":
        case "127.0.0.1":
        case "::1":
            return true;
    }
    return false;
}

export default class RestServer {
    app: Application;
    server: Server | undefined;
    ios: socketio.Server | undefined;
    port: number;
    host: string;
    jwtHandler: JWTHandler | undefined;
    pluginHandler: PluginHandler | undefined;
    cameraHandler: CameraHandler | undefined;
    sensorFetchHandler: SensorFetchHandler | undefined;
    tanHandler: TanHandler | undefined;
    lockEventHandler: LockEventHandler | undefined;
    axios: AxiosStatic = axios;
    routes: IRoute[];

    public constructor(port: number = 4343, host: string = "0.0.0.0") {
        this.port = port;
        this.host = host;
        this.routes = [new EventRoute(), new ConfigRoute(), new DataRoute(), new AuthRoute(), new UiRoute()];
        this.app = express();
        this.app.use(express.json());
        this.app.use(cookieParser());
        this.app.use((req, res, next) => {
            const origin = req.headers.origin || "*";
            res.header("Access-Control-Allow-Origin", origin.toString());
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Credentials", "true");
            next();
        });
        this.app.use((req, res, next) => {
            const fwd = req.headers['x-forwarded-for'];
            const rem = req.connection.remoteAddress;
            let ip = fwd || rem;

            if (isLocalhost(fwd))
                ip = rem;

            if (req.method === "OPTIONS") {
                next();
            } else {
                if (this.jwtHandler) {
                    this.jwtHandler.verifyAuth(req)
                        .then(({valid, decoded}) => {
                            req.jwt = decoded;
                            req.user = new AuthUser(decoded);
                            if (valid || this.isPublicPath(req.url)) { // || isLocalhost(ip)
                                next();
                            } else {
                                console.log("Not Authed " + req.url + " " + ip);
                                res.sendStatus(401);
                            }
                        })
                        .catch(err => {
                            console.error(err);
                            res.sendStatus(401);
                        });
                } else {
                    res.status(500).end();
                }
            }
        });
        this.initRoutes();
    }

    private initRoutes() {
        const router: express.Router = express.Router();
        this.routes.forEach(e => e.init(this));

        this.app.use('/', router);
    }

    private isPublicPath(url: string): boolean {
        for (let i = 0; i < this.routes.length; i++) {
            const publicURLs = this.routes[i].publicURLs();
            for (let j = 0; j < publicURLs.length; j++) {
                const re = RegExp(`^${publicURLs[j]}$`);
                if (url.match(re)) {
                    return true;
                }
            }
        }
        return false;
    }

    public start() {
        return new Promise((accept, reject) => {
            console.log("Fetching CERTS");
            CertHandling.getCert()
                .then((certs: any) => {
                    const ca = certs.ca;
                    const cert = certs.cert;
                    console.log("GOT CERTS");
                    const certOptions = {
                        cert: cert.cert,
                        key: cert.key,
                        ca: ca.cert
                    };
                    this.server = http.createServer(certOptions, this.app);

                    this.ios = require('socket.io')(this.server);
                    this.configureWS();

                    const pluginConfig: PluginConfig =
                        new PluginConfig(axios, this.ios, BaseDirProvider.getBasePath(), this);
                    this.jwtHandler = JWTHandler.getInstance();
                    this.pluginHandler = PluginHandler.getInstance();
                    this.pluginHandler.init(pluginConfig);
                    this.cameraHandler = CameraHandler.getInstance();
                    this.cameraHandler.init(pluginConfig);
                    this.tanHandler = TanHandler.getInstance();
                    this.tanHandler.init(pluginConfig);
                    this.sensorFetchHandler = SensorFetchHandler.getInstance();
                    this.sensorFetchHandler.init(pluginConfig);
                    this.lockEventHandler = LockEventHandler.getInstance();
                    this.lockEventHandler.init(pluginConfig);
                    if (this.server != null) {
                        this.server.on('error', (e) => {
                            if (e.code === 'EADDRINUSE') {
                                reject(e);
                            }
                        });
                        this.server.listen(this.port, this.host, () => {
                            console.log("REST Listening on " + `https://localhost:${this.port}`);
                            accept();
                        });
                    } else {
                        reject("Cannot Start Server");
                    }
                })
                .catch(err => {
                    // console.error(err);
                    reject(err);
                });
        });
    }

    stop() {
        return new Promise((resolve, reject) => {
            console.log("RESTSRVCLASS PROMISE");
            if (this.ios != null) {
                this.ios.close(() => {
                    if (this.server != null) {
                        this.server.close((e) => {
                            console.log("RESTSERVERCLASS CLOSE");
                            console.log(e);
                            resolve();
                        });
                    } else {
                        resolve();
                    }

                });
            } else {
                if (this.server != null) {
                    this.server.close((e) => {
                        console.log("RESTSERVERCLASS CLOSE");
                        console.log(e);
                        resolve();
                    });
                } else {
                    resolve();
                }
            }
        });
    }

    wsclients: any[] = [];

    public emitWS(event, data) {
        let permission: string = "";
        if (data instanceof TanLock) {
            permission = `${data.id}#${Permission.READ_LOCK}`;
        } else if (data instanceof LogEvent) {
            permission = `${data.lock_id}#${Permission.READ_LOG}`;
        } else if (data instanceof CabinetLogEntry) {
            switch (data.type) {
                case ExtendedLoggerType.TYPENEWIMAGE:
                    permission = `lock_${data.lock_id}#${Permission.READ_LOG_IMAGES}`;
                    break;
                case ExtendedLoggerType.TYPETANLOCK:
                    permission = `lock_${data.lock_id}#${Permission.READ_LOG}`;
                    break;
                case ExtendedLoggerType.TYPESENSORUPDATE:
                    permission = `lock_${data.lock_id}#${Permission.SENSOR_LOCK}`;
                    break;
                default:
                    console.error("CabinetLog Missing PERM DEF FOR TYPE: " + data.type, data);
            }
        } else if (data.lock_id != null) {
            console.error("WS EVENT MISSING CLASS", data);
            permission = `lock_${data.lock_id}#${Permission.READ_LOG}`;
        } else if(data.tanlock.id != null) {
            console.error("WS EVENT MISSING CLASS", data);
            permission = `lock_${data.tanlock.id}#${Permission.READ_LOCK}`;
        }

        if (permission.length == 0) {
            console.error("WS EVENT MISSING PERM", data);
        }

        this.wsclients.forEach(c => {
            if (c.user) {
                c.user.hasPermission(permission);
                c.emit(event, data);
            }
        });
    }

    private configureWS() {
        require("socketio-auth")(this.ios, {
            authenticate: (socket, data, callback) => {
                console.log("AUTH REQUEST ON WS");
                if (this.jwtHandler) {
                    this.jwtHandler.verify(data.token)
                        .then((decoded: any) => {
                            socket.user = new AuthUser(decoded);
                            this.wsclients.push(socket);
                            callback(null, true);
                            console.log("AUTHED on WS");
                        })
                        .catch(err => {
                            callback(new Error("SocketAuth Token Invalid"));
                        });
                } else {
                    callback(new Error("SockAuth JWT not available"));
                }
            },
            disconnect: (socket) => {
                console.log("Client Disconnected");
                const index = this.wsclients.findIndex(i => i.user.jti == socket.user.jti);
                if (index >= 0) {
                    this.wsclients.splice(index);
                    console.log("REMOVED USER " + index);
                } else {
                    console.log("NO USER FOUND WITH TOKEN");
                }
            }
        });
    }
}
