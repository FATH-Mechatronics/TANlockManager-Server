import * as jwt from "jsonwebtoken";
import CertHandling from "./CertHandling";
import {v1 as uuid } from "uuid";
import AuthUser from "../model/AuthUser";
import {Logger} from "log4js";
import LogProvider from "../Logging/LogProvider";

const logger: Logger = LogProvider("JWT Handler")

export default class JWTHandler {
    private static instance: JWTHandler | null = null;
    private pki;

    private validRefreshs: any[] = [];

    private constructor() {
        CertHandling.getJWT().then((certs) => {
            this.pki = certs;
            logger.debug("JWTHandler Set PKI")
        });
    }

    public sign(payload: any, ttl = "5m") {
        const clone = JSON.parse(JSON.stringify(payload));
        if (clone.pass)
            clone.pass = undefined;
        return new Promise((resolve, reject) => {
            jwt.sign(clone, this.pki.cert.key, {
                algorithm: 'RS256',
                issuer: "TANlockManager",
                expiresIn: ttl
            }, function (err, token) {
                if (err) {
                    reject(err);
                } else {
                    resolve(token);
                }
            });
        });
    }

    public generateTokens(payload: AuthUser, accessTTL = "5m", refreshTTL = "30m") {
        return new Promise((resolve, reject) => {
            const clone: any = payload;
            clone.jti = uuid();
            this.sign(clone, accessTTL)
                .then(access => {
                    const refPayload = {
                        vfor: clone.jti,
                        jti: uuid()
                    };
                    this.validRefreshs.push(refPayload);
                    this.sign(refPayload, refreshTTL)
                        .then(refresh => {
                            resolve({access, refresh});
                        })
                        .catch(err => {
                            reject(err);
                        });
                })
                .catch(err => reject(err));
        })
    }

    public verify(token: string) {
        return new Promise((resolve, reject) => {
            jwt.verify(token, this.pki.cert.cert, (err, decoded) => {
                if (err) {
                    reject(({err, decoded}));
                } else {
                    resolve(decoded);
                }
            });
        });
    }

    public verifyAuth(req): Promise<{ valid: boolean, decoded: any }> {
        return new Promise((resolve, reject) => {
            let token;
            let auth = req.headers.authorization;
            if (auth) {
                auth = auth.split(" ");
                if (auth.length == 2) {
                    token = auth[1];
                }
            }
            if (token) {
                this.verify(token)
                    .then(decoded => resolve({valid: true, decoded}))
                    .catch(({err, decoded}) => {
                        if (err.name == 'TokenExpiredError') {
                            if (!decoded) {
                                try {
                                    const payload = token.split(".");
                                    if (payload.length != 3) {
                                        throw new Error("foo");
                                    }
                                    decoded = JSON.parse(Buffer.from(payload[1], "base64").toString())
                                } catch {
                                    reject("json incompatible");
                                    return;
                                }
                            }
                            resolve({valid: false, decoded});
                        } else {
                            logger.error(err);
                            reject(err);
                        }
                    });
            } else {
                resolve({valid: false, decoded: null});
            }
        });
    }

    public removeRefresh(refreshToken): boolean {
        const index = this.validRefreshs.findIndex(payload => refreshToken.jti == payload.jti)
        if (index >= 0) {
            this.validRefreshs.splice(index);
            return true;
        } else {
            return false;
        }
    }

    public removeRefreshByAccess(accessToken): boolean {
        const index = this.validRefreshs.findIndex(payload => accessToken.jti == payload.vfor)
        if (index >= 0) {
            this.validRefreshs.splice(index);
            return true;
        } else {
            return false;
        }
    }

    public static getInstance(): JWTHandler {
        if (this.instance === null) {
            this.instance = new JWTHandler();
        }
        return this.instance;
    }
}
