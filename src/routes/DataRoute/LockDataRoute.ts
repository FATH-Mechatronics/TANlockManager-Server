import IRoute from "../IRoute";
import RestServer from "../../server/RestServer";
import TanLock from "../../model/TanLock";
import DataStore from "../../data/Datastore";
import Permission from "../../model/Permission";
import LockStore from "../../data/DataStores/LockStore";
import CameraHandler from "../../handler/CameraHandler";
import * as fs from "fs";
import * as path from "path";
import LogStore from "../../data/DataStores/LogStore";
import SensorStore from "../../data/DataStores/SensorStore";
import TanStore from "../../data/DataStores/TanStore";
import Tan from "../../model/Tan";
import LockEventHandler from "../../handler/LockEventHandler";
import CabinetLogEntry from "../../model/CabinetLogEntry";
import ExtendedLoggerType from "../../model/ExtendedLoggerType";
import ExtendedLogger from "../../data/ExtendedLogger";

const lockstore: LockStore = LockStore.getInstance();
const logstore: LogStore = LogStore.getInstance();
const sensorstore: SensorStore = SensorStore.getInstance();
export default class LockDataRoute implements IRoute {
    public publicURLs(): string[] {
        return [];
    }

    public init(server: RestServer): void {
        server.app
            .get("/data/lock", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const locks: TanLock[] = lockstore.getLocks();
                res.send(locks.filter(l => user.hasPermission(`lock_${l.id}#${Permission.READ_LOG}`)));
            })
            .post("/data/lock", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }

                if (!user.hasPermission(Permission.WRITE_LOCK)) {
                    res.status(403).end();
                    return;
                }
                const lock: TanLock = new TanLock();
                lock.ip = req.body.ip;
                lock.name = req.body.name;
                lock.apiKey = req.body.apiKey;
                lock.https = req.body.https;
                lock.accepted = true;
                const addResult = lockstore.addTanLock(lock);
                if (addResult === true) {
                    res.status(201).json(lock);
                    server.emitWS("tanlockEvent", lock);
                } else {
                    res.status(409).json(addResult);
                }
            })
            .get("/data/lock/unknown", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const locks: TanLock[] = lockstore.getUnknownLocks();
                res.send(locks.filter(l => user.hasPermission(Permission.READ_UNACCEPTED)));
            })
            .get("/data/lock/all", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const locks: TanLock[] = lockstore.getAllLocks();
                res.send(locks.filter(l => user.hasPermission(`lock_${l.id}#${Permission.READ_LOG}`)));
            })
            .get("/data/lock/:id", (req, res) => {
                const id: number = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const lock = lockstore.findLockById(id);
                if (lock != null) {
                    if (!user.hasPermission(`lock_${lock.id}#${Permission.READ_LOG}`)) {
                        res.status(403).end();
                        return;
                    }
                    res.send(lock).end();
                } else {
                    res.status(404).end();
                }
            })
            .put("/data/lock/:id", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const old = lockstore.findLockById(id);
                if (old != null) {
                    if (!old.accepted && !user.hasPermission(Permission.WRITE_UNACCEPTED)) {
                        res.status(403).end();
                        return
                    } else if (old.accepted && !user.hasPermission(`lock_${id}#${Permission.WRITE_LOCK}`)) {
                        res.status(403).end();
                        return;
                    }
                } else {
                    res.status(404).end();
                    return;
                }
                const lock: TanLock | boolean | null = lockstore.patchLock(id, req.body);
                if (lock === false) {
                    res.status(409).send(lockstore.findLockByIp(req.body.ip));
                } else if (lock !== null) {
                    server.emitWS("tanlockEvent", lock);
                    res.send(lock).end();
                } else {
                    res.status(404).end();
                }
            })
            .delete("/data/lock/:id", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`lock_${id}#${Permission.WRITE_LOCK}`)) {
                    res.status(403).end();
                    return;
                }
                res.send(lockstore.deleteLock(id));
            })
            .get("/data/lock/:id/real", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                let lock = lockstore.findLockById(id);
                if (lock !== null) {
                    if (!user.hasPermission(`lock_${id}#${Permission.READ_LOCK}`)) {
                        res.status(403).end();
                        return;
                    }
                    LockEventHandler.getInstance().fetchLockInfo(lock)
                        .then((lock) => {
                            res.send(lock);
                        })
                        .catch((err) => {
                            res.status(500).send({error: err.message});
                        });
                } else {
                    res.status(404).end();
                }
            })
            .get("/data/lock/:id/log", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                let lock = lockstore.findLockById(id);
                if (lock != null) {
                    if (!user.hasPermission(`lock_${id}#${Permission.LOG_LOCK}`)) {
                        res.sendStatus(401);
                        return;
                    }
                    server.axios.get(lock.getBaseUrl() + "/log/read")
                        .then((response) => {
                            /*lock = datastore.updateLockState(lock, response.data.state);
                            server.emitWS("tanlockEvent", lock);*/
                            res.send(response.data);
                        })
                        .catch((reason) => {
                            // @ts-ignore
                            lock = lockstore.updateLockState(lock, "error");
                            server.emitWS("tanlockEvent", lock);
                            server.emitWS("logEvent", logstore.addLog(lock, `❌ fetching log: ${reason.message}`));
                            res.status(500).send({error: reason.message});
                        });
                } else {
                    res.status(404).end();
                }
            })
            .get("/data/lock/:id/user", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const lock = lockstore.findLockById(id);
                if (lock != null) {
                    if (!user.hasPermission(`lock_${id}#${Permission.LOG_LOCK}`)) {
                        res.sendStatus(401);
                        return;
                    }
                    server.axios.get(lock.getBaseUrl() + "/user/list")
                        .then(resp => {
                            res.send(resp.data.map(d => d.user_id));
                        })
                        .catch(reason => {
                            res.status(500).send({error: reason.message});
                        })
                } else {
                    res.status(404).end();
                }
            })
            .post("/data/lock/:id/open", (req, res) => {
                if (req.body.type === "prepareopen" || req.body.type === "input") {
                    const id = Number.parseInt(req.params.id);
                    const user = req.user;
                    if (!user) {
                        res.sendStatus(401);
                        return;
                    }
                    const lock = lockstore.findLockById(id);
                    if(lock === null) {
                        res.status(404).end();
                    }else {
                        if ((req.body.type === "prepareopen" && !user.hasPermission(`lock_${id}#${Permission.PREPAREOPEN_LOCK}`)) ||
                            (req.body.type === "input" && !user.hasPermission(`lock_${id}#${Permission.INPUT_LOCK}`))) {
                            console.log(user);
                            res.status(403).end();
                            return;
                        }
                        server.axios.get(lock.getBaseUrl() + "/" + req.body.type + "/" + req.body.pin)
                            .then((response) => {
                                res.send({ok: true, resp: response.data});

                                server.emitWS("logEvent", logstore.addLog(lock, `${req.body.type} 🔓 User: ${user.user}, Reason: ${req.body.reason}`));
                                //CABINET LOGGING
                                const cabinetLog: CabinetLogEntry = new CabinetLogEntry({
                                    lock_id: lock.id,
                                    lock_name: lock.name,
                                    time: new Date().getTime(),
                                    type: ExtendedLoggerType.TYPESYSTEM,
                                    event: req.body.type,
                                    value: `🔓 User: ${user.user}, Reason: ${req.body.reason}`
                                });

                                ExtendedLogger.appendLog(lock, cabinetLog);
                                server.emitWS("cabinetLog", cabinetLog);
                            })
                            .catch((reason) => {
                                let newLock = lockstore.updateLockState(lock, "error");
                                server.emitWS("tanlockEvent", newLock);
                                server.emitWS("logEvent", logstore.addLog(newLock, `❌ User: ${user.user}, opening lock: ${reason.message}`));
                                res.status(500).send({error: reason.message});
                                console.error(reason);
                            });
                        return;
                    }
                }
            })
            .get("/data/lock/:id/sensor", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const lock = lockstore.findLockById(id);

                if (lock != null) {
                    if (!user.hasPermission(`lock_${id}#${Permission.SENSOR_LOCK}`)) {
                        res.status(403).end();
                        return;
                    }
                    const sensors = sensorstore.getSensorsOfLock(lock);
                    if (sensors != null) {
                        res.send(sensors.val).end();
                    } else {
                        res.send({}).end();
                    }
                } else {
                    res.status(404).end();
                }
            })
            .get("/data/lock/:id/camera/url", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`lock_${id}#${Permission.LIVE_CAM_LOCK}`)) {
                    res.status(403).end();
                    return;
                }

                const tanlock = lockstore.findLockById(id);
                if (tanlock == null) {
                    res.status(404).end();
                    return;
                }
                if (!server.pluginHandler) {
                    res.status(404).end();
                    return;
                }
                server.pluginHandler.getLiveCamUrl(tanlock).then(dat => res.send(dat).end())
                    .catch(err => {
                        console.error("[Fetch Cam URL]", err);
                        res.status(404).end()
                    });
            })
            .get("/data/lock/:id/camera/image", (req, res) => {
                const id = Number.parseInt(req.params.id);
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (!user.hasPermission(`lock_${id}#${Permission.LIVE_CAM_LOCK}`)) {
                    res.status(403).end();
                    return;
                }
                const tanlock = lockstore.findLockById(id);
                if (tanlock != null) {
                    if (!server.pluginHandler) {
                        res.status(404).end();
                        return;
                    }
                    server.pluginHandler.getImage(tanlock)
                        .then((buffer: Buffer) => {
                            res.writeHead(200, {
                                'Content-Type': 'image/jpg',
                                'Content-Length': buffer.length
                            });
                            res.end(buffer);
                        })
                        .catch((err) => {
                            res.status(500).send(err).end();
                        });
                } else {
                    res.status(404).end();
                }
            })
            .get("/data/lock/:id/camera/:time-:state.jpg", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const id = Number.parseInt(req.params.id);
                if (!user.hasPermission(`lock_${id}#${Permission.READ_LOG_IMAGES}`)) {
                    res.status(404).end();
                    return;
                }
                const date = new Date();
                date.setTime(parseInt(req.params.time));
                const tanlock = lockstore.findLockById(id);
                if (tanlock == null) {
                    res.status(404).end();
                    return;
                }
                const state = req.params.state;

                console.log("Requested IMG: ", id, date, state);
                const imgDir = path.join(DataStore.getBasePath(), CameraHandler.getFolderPath(tanlock, date));
                const imgPath = path.join(imgDir, CameraHandler.getImageFileName(date, state));
                console.log(imgPath);
                fs.exists(imgPath, exists => {
                    if (exists) {
                        res.sendFile(imgPath);
                    } else {
                        res.status(404).end();
                    }
                });
            })
            .get('/data/lock/:id/tan', (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const id = Number.parseInt(req.params.id);
                if (!user.hasPermission(`lock_${id}#${Permission.READ_TAN}`)) {
                    res.status(403).end();
                    return;
                }
                res.send(TanStore.getInstance().getTans().filter(l => l.lock.id === id));
            })
            .post('/data/lock/:id/tan', (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const id = Number.parseInt(req.params.id);

                const tan = new Tan(req.body);

                const lock = lockstore.findLockById(id);
                if (lock != null) {
                    tan.lock = lock;
                }

                const pin = req.body.pin;
                if (!user.hasPermission(`lock_${id}#${Permission.WRITE_TAN}`)) {
                    res.status(403).end();
                    return;
                }
                if (!server.tanHandler) {
                    res.status(500).end();
                    return;
                }
                server.tanHandler.createTan(tan, pin)
                    .then(result => {
                        res.status(200).send('{"ok": true}').end();
                    })
                    .catch(err => {
                        console.log("cannot generate TAN", err);
                        res.status(500).send('{"ok": false}').end();
                    });
            })
            .delete('/data/lock/:id/tan/:user', (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                const id = Number.parseInt(req.params.id);
                if (!user.hasPermission(`lock_${id}#${Permission.WRITE_TAN}`)) {
                    res.status(403).end();
                    return;
                }
                const lock = lockstore.findLockById(id);
                if (lock == null) {
                    res.status(404).end();
                    return;
                }
                const tan = TanStore.getInstance().findTanByNameAndLock(req.params.user, lock);
                if (tan == null) {
                    res.status(404).end();
                    return;
                }
                tan.lock = lock;
                if (!server.tanHandler) {
                    res.status(500).end();
                    return;
                }
                server.tanHandler.removeTan(tan)
                    .then(result => {
                        res.status(200).send('{"ok": true}').end();
                    })
                    .catch(err => {
                        res.status(500).send('{"ok": false}').end();
                    });
            });
    }
}
