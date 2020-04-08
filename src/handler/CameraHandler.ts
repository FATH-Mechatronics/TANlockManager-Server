import EventHandlerOptions from "../model/EventHandlerOptions";
import RestServer from "../server/RestServer";
import TanLockEvent from "../model/TanLockEvent";
import TanLock from "../model/TanLock";
import * as fs from "fs";
import * as path from "path";
import DataStore from "../data/Datastore";
import ExtendedLogger from "../data/ExtendedLogger";
import CabinetLogEntry from "../model/CabinetLogEntry";
import LockStore from "../data/DataStores/LockStore";
import ExtendedLoggerType from "../model/ExtendedLoggerType";

const lockstore = LockStore.getInstance();

interface CameraHandleItem {
    tanlock: TanLock,
    start: number,
    timeout: any,
    stop: boolean
}

export default class CameraHandler {
    private static instance: CameraHandler | null = null;

    public static BASEDIR: string = "camera";

    private server: RestServer;
    private runningCams: CameraHandleItem[] = [];

    static getInstance(): CameraHandler {
        if (this.instance == null)
            this.instance = new CameraHandler();
        return this.instance;
    }

    public init(config: any) {
        this.server = config.server
    }

    private constructor() {
    }

    public handleEvent(options: EventHandlerOptions) {
        if (options.event == TanLockEvent.UNLOCKING || options.event == TanLockEvent.OPENING) {
            this.startCamera(options);
        } else if (options.event == TanLockEvent.LOCKING) {
            this.stopCamera(options);
        }
    }

    private startCamera(options: EventHandlerOptions) {
        if(options.tanlock == null || options.cabinet == null){
            console.error("No Cam || Cabinet");
            return;
        }
        // @ts-ignore
        const index = this.runningCams.findIndex(c => c.tanlock.ip === options.tanlock.ip);
        if (index === -1) {
            console.log("Start Camera ", options.cabinet.name, options.tanlock.ip);
            const cam = {
                tanlock: options.tanlock,
                cabinet: options.cabinet,
                start: new Date().getTime(),
                timeout: null,
                stop: false
            };
            this.runningCams.push(cam);
            this.doPhoto(cam);
        } else {
            console.log("Cam already running", index, options.cabinet.name, options.tanlock.ip)
        }
    }

    private stopCamera(options: EventHandlerOptions) {
        if(options.tanlock == null || options.cabinet == null){
            console.error("No Cam || Cabinet");
            return;
        }
        // @ts-ignore
        const index = this.runningCams.findIndex(c => c.tanlock.id === options.tanlock.id);
        if (index >= 0) {
            console.log("Stop Camera ", index, options.cabinet.name, options.tanlock.ip);
            this.runningCams[index].stop = true;
            this.runningCams.splice(index, 1);
        } else {
            console.log("That Cam was Already Stopped", options.cabinet.name, options.tanlock.ip);
        }
    }

    private doPhoto(handleItem: CameraHandleItem) {
        const date = new Date();
        const lock = lockstore.findLockById(handleItem.tanlock.id);
        if (lock == null) {
            return true;
        }
        const state = lock.state;
        // Image Bytes
        if (!this.server.pluginHandler) {
            return;
        }
        this.server.pluginHandler.getImage(handleItem.tanlock)
            .then((buff: Buffer) => {
                if (!buff) {
                    console.error("No CameraImage Provided!!!");
                } else {
                    this.storePhoto(handleItem, date, state, buff);
                }
            })
            .catch(err => {
                console.error("Error Getting CameraImage!!!", err);
            })
    }

    private storePhoto(handleItem: CameraHandleItem, date: Date, state: string, buff: Buffer) {
        // MKDIR
        const imgDir = path.join(DataStore.getBasePath(), CameraHandler.getFolderPath(handleItem.tanlock, date));
        DataStore.mkdirRecursive(imgDir);

        const imgPath = path.join(imgDir, CameraHandler.getImageFileName(date, state));
        // WRITE FILE
        fs.open(imgPath, 'w', (err, fd) => {
            if (!err) {
                fs.write(fd, buff, (err) => {
                    if (!err) {
                        this.wsBroadcastNewImage(handleItem, date, state);
                        if (!handleItem.stop) {
                            if (!this.server.pluginHandler) {
                                return;
                            }
                            this.server.pluginHandler.getImageInterval(handleItem.tanlock).then((imageInterval: number) => {
                                handleItem.timeout = setTimeout(() => {
                                    this.doPhoto(handleItem)
                                }, imageInterval);
                            });
                        }
                    } else {
                        console.error(err);
                    }
                });
            } else {
                console.error(err);
            }
        });
    }

    wsBroadcastNewImage(handleItem: CameraHandleItem, date: Date, state: string) {
        // data/lock/:id/camera/:time-:state.jpg
        const imgUrl = `/data/lock/${handleItem.tanlock.id}/camera/${date.getTime()}-${state}.jpg`;
        const log: CabinetLogEntry = new CabinetLogEntry({
            lock_id: handleItem.tanlock.id,
            lock_name: handleItem.tanlock.name,
            type: ExtendedLoggerType.TYPENEWIMAGE,
            value: imgUrl,
            time: date.getTime()
        });
        this.server.emitWS("cabinetLog", log);
    }

    public getLogWithPhotos(tanlock: TanLock) {
        const log: CabinetLogEntry[] = ExtendedLogger.getLog(tanlock);
        const list: any[] = [];
        for (let i = 0; i < log.length; i++) {
            list.push({log: log[i], photos: this.getPhotosForLogEntry(log[i])});
        }
        return list;
    }

    private getPhotosForLogEntry(log: CabinetLogEntry) {
        const lock = lockstore.findLockById(log.lock_id);
        if (lock == null)
            return;
        if (log.type == ExtendedLoggerType.TYPETANLOCK) {
            const handleItem: CameraHandleItem = {
                tanlock: lock,
                start: log.time,
                timeout: -1,
                stop: false
            };
            const date = new Date();
            date.setTime(log.time);
            const end = new Date();
            if (log.end != null) {
                end.setTime(log.end);
            }
            if (date.getDate() != end.getDate() || date.getMonth() != end.getMonth() || date.getFullYear() != end.getFullYear()) {
                log.value = "Please Manually check In Range, probably not all Images Found!";
            }
            const folder = path.join(DataStore.getBasePath(), CameraHandler.getFolderPath(handleItem.tanlock, date));
            if (fs.existsSync(folder)) {
                let images = fs.readdirSync(folder);
                images = images.filter(i => {
                    if (i.endsWith(".jpg")) {
                        const ts = parseInt(i.split("_")[1]);
                        return ts >= date.getTime() && ts < end.getTime();
                    }
                    return false;
                }).map(i => {
                    const ts = parseInt(i.split("_")[1]);
                    const state = i.split("_")[2].split(".")[0];
                    return `/data/lock/${handleItem.tanlock.id}/camera/${ts}-${state}.jpg`;
                });
                // URL :/data/lock/:id/camera/:time-:state.jpg
                return images;
            }
        }
        return [];
    }

    // "lock_{lockName}_{lockIp}/y{year}/m{mont}/d{day}/"
    public static getFolderPath(tanlock: TanLock, date: Date) {
        return path.join(CameraHandler.BASEDIR, `lock_${tanlock.name}_${tanlock.ip}`, `y${date.getFullYear()}`,
            `m${CameraHandler.leadingZero(date.getMonth() + 1)}`, `d${CameraHandler.leadingZero(date.getDate())}`);
    }

    // ts_{timeReadable}_{timeStamp}_{state}.jpg
    public static getImageFileName(date: Date, state: string) {
        return `ts${CameraHandler.leadingZero(date.getHours())}:${CameraHandler.leadingZero(date.getMinutes())}_${date.getTime()}_${state}.jpg`
    }

    public static leadingZero(x: number, base: number = 10) {
        let res = "";
        for (let i = Math.log10(base); i > 0; i--) {
            if (Math.pow(10, i) > x) {
                res += "0";
            } else {
                break;
            }
        }
        return res + x;
    }
}
