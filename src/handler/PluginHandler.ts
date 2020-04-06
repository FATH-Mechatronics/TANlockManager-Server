import DataStore from "../data/Datastore";
import * as fs from "fs";
import * as path from "path";
import EventHandlerOptions from "../model/EventHandlerOptions";
import TanLock from "../model/TanLock";
import SensorEntry from "../model/SensorEntry";

const basePath = DataStore.getBasePath();

export default class PluginHandler {
    private static instance: PluginHandler | null = null;
    private plugins: any[] = [];

    private constructor() {
        const pluginPath = path.join(basePath, "plugins");
        try {
            fs.mkdirSync(pluginPath);
        } catch (error) {
        }
        let files = fs.readdirSync(pluginPath);
        files = files.filter(f => f.toLowerCase().endsWith("plugin.js"));
        for (const file of files) {
            console.log(file);
            const p = require(path.join(pluginPath, file));
            this.plugins.push(p);
        }
    }

    public init(config: any) {
        this.plugins.forEach(p => {
            if (p.init) {
                p.init(config);
            }
        });
    }

    public static getInstance(): PluginHandler {
        if (this.instance === null) {
            this.instance = new PluginHandler();
        }
        return this.instance;
    }

    public onEvent(eventType: string, eventBody: EventHandlerOptions) {
        this.plugins.forEach(p => {
            if (p.onEvent) {
                p.onEvent(eventType, eventBody);
            }
        });
    }

    public availSensors() {
        for (let i = 0; i < this.plugins.length; i++) {
            const p = this.plugins[i];
            if (p.getSensor && p.availSensors) {
                return p.availSensors();
            }
        }
        // TODO default TANlock
        return [];
    }

    public getSensors(lock: TanLock) {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < this.plugins.length; i++) {
                const p = this.plugins[i];
                if (p.getSensors) {
                    p.getSensors(lock)
                        .then(res => resolve(res));
                    return;
                }
            }
            const sensor: SensorEntry[] = [/*{
                sensor: "T",
                label: "T",
                scale: "°C",
                value: 42
            }*/]
            resolve(sensor);
        })
    }

    /*public getSensor(lock: TanLock, sensor: string) {
        return new Promise((resolve, reject) => {
            let promises = [];
            for (let i = 0; i < this.plugins.length; i++) {
                let p = this.plugins[i];
                if (p.getSensor) {
                    promises.push(p.getSensor(lock, sensor));
                }
            }
            Promise.all(promises)
                .then(results => {
                    for (let i = 0; i < results.length; i++) {
                        if (results[i] != null) {
                            resolve(results[i]);
                            return;
                        }
                    }
                    //TODO TANLOCK LOGIC
                    resolve(42);
                    //reject();
                })
                .catch(err => {
                    console.error("getSensor: " + err);
                })
        });
    }*/
    public getLiveCamUrl(lock: TanLock) {
        return new Promise((resolve, reject) => {
            let p;
            for (let i = 0; i < this.plugins.length; i++) {
                if (this.plugins[i].getLiveCamUrl) {
                    p = this.plugins[i];
                    break;
                }
            }
            if (p) {
                p.getLiveCamUrl(lock).then((data) => resolve(data))
                    .catch(err => reject(err));
            } else {
                reject("No LiveCamUrl Plugin");
            }
        });
    }

    public getImage(lock: TanLock) {
        return new Promise((resolve, reject) => {
            let p;
            for (let i = 0; i < this.plugins.length; i++) {
                if (this.plugins[i].getImage) {
                    p = this.plugins[i];
                    break;
                }
            }
            if (p) {
                p.getImage(lock)
                    .then((data) => {
                        resolve(data);
                    })
                    .catch(err => {
                        console.error("getImage: " + err);
                        reject(err);
                    });
            } else {
                reject("No CamPlugin");
            }
        });
    }

    public getImageInterval(lock: TanLock) {
        return new Promise((resolve, reject) => {
            let p;
            for (let i = 0; i < this.plugins.length; i++) {
                if (this.plugins[i].getImageInterval) {
                    p = this.plugins[i];
                    break;
                }
            }
            if (p) {
                p.getImageInterval(lock)
                    .then((data) => {
                        resolve(data);
                    })
                    .catch(err => {
                        console.error("getImageInterval: " + err);
                        reject(err);
                    });
            } else {
                reject("No CamPlugin");
            }
        });
    }

    getPlugins(): any[] {
        return this.plugins;
    }
}
