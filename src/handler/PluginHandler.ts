import DataStore from "../data/Datastore";
import * as fs from "fs";
import * as path from "path";
import EventHandlerOptions from "../model/EventHandlerOptions";
import TanLock from "../model/TanLock";
import SensorEntry from "../model/SensorEntry";

import IAuthPlugin from "./pluginInterfaces/IAuthPlugin";
import ICameraPlugin from "./pluginInterfaces/ICameraPlugin";
import IEventPlugin from "./pluginInterfaces/IEventPlugin";
import ISensorPlugin from "./pluginInterfaces/ISensorPlugin";
import PluginConfig from "../model/PluginConfig";
import LogProvider from "../logging/LogProvider";
import {Logger} from "log4js";

const logger: Logger = LogProvider("PluginHandler");
const basePath = DataStore.getBasePath();

class PluginHolder {
    authPlugins: IAuthPlugin[] = [];
    cameraPlugins: ICameraPlugin[] = [];
    eventPlugins: IEventPlugin[] = [];
    sensorPlugins: ISensorPlugin[] = [];

    getPluginByName(pluginName: string) {
        const splitted: string[] = pluginName.split("_", 2);
        switch (splitted[0]) {
            case "authPlugin":
                return this.authPlugins.find(p => p.name() === splitted[1]);
            case "cameraPlugin":
                return this.cameraPlugins.find(p => p.name() === splitted[1]);
            case "eventPlugin":
                return this.eventPlugins.find(p => p.name() === splitted[1]);
            case "sensorPlugin":
                return this.sensorPlugins.find(p => p.name() === splitted[1]);
        }
        return undefined;
    }
}

export default class PluginHandler {
    private static instance: PluginHandler | null = null;

    private pluginsHolder = new PluginHolder();

    private constructor() {
        const pluginPath = path.join(basePath, "plugins");
        try {
            fs.mkdirSync(pluginPath);
        } catch (error) {
            //ignore
        }
        let folders: string[] = fs.readdirSync(pluginPath);
        folders = folders.filter(f => fs.statSync(path.join(pluginPath, f)).isDirectory());
        for (const folder of folders) {
            logger.debug(folder);

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const pluginSpec = require(path.join(pluginPath, folder, "package.json"));
            logger.info(`Loading Plugin: ${pluginSpec.pluginType}|${pluginSpec.name}`)
            logger.debug(pluginSpec);
            switch (pluginSpec.pluginType) {
                case "authPlugin":
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const authPlugin: IAuthPlugin = require(path.join(pluginPath, folder));
                    this.pluginsHolder.authPlugins.push(authPlugin);
                    break;
                case "cameraPlugin":
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const cameraPlugin: ICameraPlugin = require(path.join(pluginPath, folder));
                    this.pluginsHolder.cameraPlugins.push(cameraPlugin);
                    break;
                case "eventPlugin":
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const eventPlugin: IEventPlugin = require(path.join(pluginPath, folder));
                    this.pluginsHolder.eventPlugins.push(eventPlugin);
                    break;
                case "sensorPlugin":
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const sensorPlugin: ISensorPlugin = require(path.join(pluginPath, folder));
                    this.pluginsHolder.sensorPlugins.push(sensorPlugin);
                    break;
            }
        }
    }

    public init(config: PluginConfig) {
        this.pluginsHolder.authPlugins.forEach(p => {
            if (p.init) {
                p.init(config);
            }
        });
        this.pluginsHolder.cameraPlugins.forEach(p => {
            if (p.init) {
                p.init(config);
            }
        });
        this.pluginsHolder.eventPlugins.forEach(p => {
            if (p.init) {
                p.init(config);
            }
        });
        this.pluginsHolder.sensorPlugins.forEach(p => {
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
        this.pluginsHolder.eventPlugins.forEach(p => {
            if (p.onEvent) {
                p.onEvent(eventType, eventBody);
            }
        });
    }

    public availSensors() {
        for (let i = 0; i < this.pluginsHolder.sensorPlugins.length; i++) {
            const p:any = this.pluginsHolder.sensorPlugins[i];
            if (p.getSensors && p.availSensors) {
                return p.availSensors();
            }
        }
        // TODO default TANlock
        return [];
    }

    public getSensors(lock: TanLock): Promise<(SensorEntry | SensorEntry[])[]> {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < this.pluginsHolder.sensorPlugins.length; i++) {
                const p = this.pluginsHolder.sensorPlugins[i];
                if (p.getSensors) {
                    p.getSensors(lock)
                        .then(res => resolve(res));
                    return;
                }
            }
            const sensor: (SensorEntry | SensorEntry[])[] = [];
            resolve(sensor);
        })
    }

    public getLiveCamUrl(lock: TanLock): Promise<string> {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < this.pluginsHolder.cameraPlugins.length; i++) {
                const p = this.pluginsHolder.cameraPlugins[i];
                if (p.getLiveCamUrl) {
                    p.getLiveCamUrl(lock).then((data) => resolve(data))
                        .catch(err => reject(err));
                    return;
                }
            }
            reject("No LiveCamUrl Plugin");
        });
    }

    public getImage(lock: TanLock) {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < this.pluginsHolder.cameraPlugins.length; i++) {
                const p = this.pluginsHolder.cameraPlugins[i];
                if (p.getImage) {
                    p.getImage(lock)
                        .then((data) => {
                            resolve(data);
                        })
                        .catch(err => {
                            logger.error("getImage: " + err);
                            reject(err);
                        });
                    return;
                }
            }
            reject("No CamPlugin");
        });
    }

    public getImageInterval(lock: TanLock) {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < this.pluginsHolder.cameraPlugins.length; i++) {
                const p = this.pluginsHolder.cameraPlugins[i];
                if (p.getImageInterval) {
                    p.getImageInterval(lock)
                        .then((data) => {
                            resolve(data);
                        })
                        .catch(err => {
                            logger.error("getImageInterval: " + err);
                            reject(err);
                        });
                    return;
                }
            }
            reject("No CamPlugin");
        });
    }

    public doAuthenticate(user: string, pass: string): Promise<boolean> {
        return new Promise(((resolve, reject) => {
            for (let i = 0; i < this.pluginsHolder.authPlugins.length; i++) {
                const p = this.pluginsHolder.authPlugins[i];
                if (p.authenticate) {
                    p.authenticate(user, pass)
                        .then(succes => {
                            resolve(succes);
                        })
                        .catch(err => {
                            logger.error("authenticate", err);
                            reject(err);
                        });
                    return;
                }
            }
            logger.debug("No AuthPlugin Available");
            reject(new Error("No Auth Plugin"));
        }))
    }

    public autoCreateUser(): boolean {
        for(let i = 0; i < this.pluginsHolder.authPlugins.length; i++){
            const p = this.pluginsHolder.authPlugins[i];
            if(p.autoCreateUser){
                return p.autoCreateUser();
            }
        }
        return false;
    }

    public defaultRoles(): number[] {
        for(let i = 0; i < this.pluginsHolder.authPlugins.length; i++){
            const p = this.pluginsHolder.authPlugins[i];
            if(p.defaultRoles){
                return p.defaultRoles();
            }
        }
        return [0, 1];
    }

    public fallbackToLocal(): boolean {
        for(let i = 0; i < this.pluginsHolder.authPlugins.length; i++){
            const p = this.pluginsHolder.authPlugins[i];
            if(p.fallbackToLocal){
                return p.fallbackToLocal();
            }
        }
        return true;
    }

    public getPluginHolder(): PluginHolder {
        return this.pluginsHolder;
    }
}
