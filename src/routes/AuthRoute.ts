import RestServer from "../server/Restserver";
import * as bcrypt from 'bcryptjs';
import IRoute from "./IRoute";
import User from "../model/User";
import UserStore from "../data/DataStores/UserStore";
import Permission from "../model/Permission";
import AuthUser from "../model/AuthUser";
import {Response} from "express";

const ACCESS_TOKEN = "ACCESS_TOKEN";
const REFRESH_TOKEN = "REFRESH_TOKEN";

const userstore: UserStore = UserStore.getInstance();

export default class AuthRoute implements IRoute {
    public publicURLs(): string[] {
        return ["/auth/login", "/auth/reauth", "/auth/logout"];
    }

    public init(server: RestServer): void {
        server.app
            .post("/auth/reauth", (req, res) => {
                const refresh = req.body.REFRESH_TOKEN;
                if (!refresh) {
                    res.sendStatus(401);
                    return;
                } else {
                    if (!server.jwtHandler) {
                        return;
                    }
                    server.jwtHandler.verifyAuth(req)
                        .then(({valid, decoded}) => {
                            if (valid) {
                                res.sendStatus(401);
                            } else {
                                if (decoded == null) {
                                    res.sendStatus(401);
                                    return;
                                }
                                const accessToken = decoded;
                                // @ts-ignore
                                server.jwtHandler.verify(refresh)
                                    .then((decoded: any) => {
                                        if (decoded.vfor === accessToken.jti) {
                                            // @ts-ignore
                                            if (server.jwtHandler.removeRefresh(decoded)) {
                                                const user = userstore.findUserByName(accessToken.user);
                                                if (user != null && user.hasPermission(Permission.SYSTEM_AUTH)) {
                                                    this.sendNewTokens(server, res, user);
                                                } else {
                                                    res.sendStatus(401);
                                                }
                                            } else {
                                                console.error("NOT WHITELISTED FOR REFRESH");
                                                res.sendStatus(401);
                                            }
                                        } else {
                                            console.error("NOT VALID FOR");
                                            res.sendStatus(401);
                                        }
                                    })
                                    .catch((foo) => {// { err, decoded }
                                        console.error("Error in REFRESH VERIFY", foo);
                                        res.sendStatus(401);
                                    });
                            }
                        })
                        .catch((err) => {
                            console.error("REAUTH", err);
                            res.sendStatus(401);
                        });
                }
            })
            .post("/auth/logout", (req, res) => {
                if (req.jwt) {
                    if (server.jwtHandler)
                        console.log("LOGOUT", server.jwtHandler.removeRefreshByAccess(req.jwt));
                }
                res.send("OK");
            })
            .post("/auth/login", (req, res) => {
                if (!req.body.user || !req.body.password) {
                    res.sendStatus(401);
                    return;
                }
                const user = userstore.findUserByName(req.body.user);
                if (user == null || !user.hasPermission(Permission.SYSTEM_AUTH)) {
                    res.sendStatus(401);
                    return;
                }
                const pass = req.body.password;
                bcrypt.compare(pass, user.pass, (err, resp) => {
                    if (!err) {
                        if (resp) {
                            // @ts-ignore
                            this.sendNewTokens(server, res, user);
                        } else {
                            res.sendStatus(401);
                        }
                    } else {
                        console.error(err);
                        res.sendStatus(500);
                    }
                });
            });
    }

    private sendNewTokens(server: RestServer, res: Response, payload: User) {
        if (server.jwtHandler) {
            server.jwtHandler.generateTokens(AuthUser.ofUser(payload))
                .then(({access, refresh}) => {
                    // res.cookie(ACCESS_TOKEN, access, { httpOnly: true, secure: true });
                    const body = {};
                    body[REFRESH_TOKEN] = refresh;
                    body[ACCESS_TOKEN] = access;
                    res.status(201).send(body);
                })
                .catch(err => {
                    console.error(err);
                    res.sendStatus(500);
                });
        } else {
            res.sendStatus(500);
        }
    }
};
