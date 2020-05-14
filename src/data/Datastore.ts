import TanLock from "../model/TanLock";
import Cage from "../model/Cage";
import Cabinet from "../model/Cabinet";
import BaseDirProvider from "./BaseDirProvider";


const fs = require('fs');
const execSync = require('child_process').execSync;
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

export default class DataStore {
    private static _initedDir = false;
    public static mkdirRecursive(path) {
        switch (process.platform) {
            case "win32":
                try {
                    execSync(`mkdir "${path}"`);
                } catch (e) { }
                break;
            case "linux":
                try {
                    execSync(`mkdir -p "${path}"`);
                } catch (e) { }
                break;
        }
    }

    public static getBasePath() {
        /*
        let basePath = "config";
        switch (process.platform) {
            case "win32":
                basePath = path.join(process.env.AppData, "tanlockmanager");
                break;
            case "linux":
                basePath = path.join(process.env.HOME, ".config", "tanlockmanager");
                break;
        }

        if (!DataStore._initedDir) {
            this.mkdirRecursive(basePath);
            DataStore._initedDir = true;
        }
        return basePath
        */

        return BaseDirProvider.getBasePath();
    }
    private db;

    private static instance: DataStore;

    private static defaults = {
        version: 2,
        config: [
            { name: "selfSignedCert", value: false },
            { name: "managementSlave", value: false },
            { name: "managementMasterUrl", value: "" },
            { name: "managementHeartbeatTimeout", value: 120 },
            { name: "tANlockApiKey", value: "" },
            { name: "tANlockSSL", value: true },
            { name: "tANlockSelfSignedCert", value: true },
            { name: "tANlockAutoAccept", value: false },
            { name: "monitoringPollInterval", value: 120 },
            { name: "monitoringTemperatureLowValue", value: 10 },
            { name: "monitoringTemperatureHighValue", value: 35 },
            { name: "monitoringHumidityLowValue", value: 8 },
            { name: "monitoringHumidityHighValue", value: 90 },
            //Version 2
            { name: "openDefaultMethod", value: "prepareopen"},
            { name: "openDefaultPin", value: ""}
        ],
        // cages: [], Removed in V2
        // cabinets: [] Removed in V2
    };

    public static getInstance(): DataStore {

        if (!DataStore.instance) {
            DataStore.instance = new DataStore();
            DataStore.instance.patchDB();
        }
        return DataStore.instance;
    }

    private patchDB() {
        const current = this.db.get("version")
            .value();
        if (current < DataStore.defaults.version) {
            console.warn(`Database need Patch from ${current} to ${DataStore.defaults.version}`);
            if(current < 2){ // Patches for Version 2
                let openDefaultMethod = DataStore.defaults.config.find(c => c.name === "openDefaultMethod")
                if(openDefaultMethod) {
                    this.setConfig(openDefaultMethod.name, openDefaultMethod.value)
                }
                let openDefaultPin = DataStore.defaults.config.find(c => c.name === "openDefaultPin")
                if(openDefaultPin) {
                    this.setConfig(openDefaultPin.name, openDefaultPin.value)
                }
                this.db.unset("cages").write();
                this.db.unset("cabinets").write();
                this.db.set("version", 2).write();
                console.log("Patched DB to V2");
            }
            console.log(this.db.value());
        }
    }

    public setConfig(name: string, value: string|boolean|number): any {
        if (this.getConfig(name) !== null) {
            return this.db.get("config")
                .find({ name })
                .set("value", value)
                .write();
        } else {
            const conf = { name, value };
            return this.db.get("config")
                .push(conf)
                .write();
        }
    }

    public getConfigs(): any[] {
        const config:any[] = [];
        DataStore.defaults.config.forEach((c) => {
            let val = this.getConfig(c.name);
            if (val === null) {
                val = c.value;
            }
            config.push({
                name: c.name,
                value: val
            });
        });
        return config;
    }

    public getConfig(name: string): any {
        const conf = this.db.get("config")
            .find({ name })
            .value();
        if (conf == undefined) {
            return null;
        } else {
            return conf.value;
        }
    }

    /*public getSummary() {
        let locks: TanLock[] = LockStore.getInstance().getLocks();
        let now = new Date().getTime();
        let avail = locks.filter(l => now - l.heartbeat <= this.getConfig("managementHeartbeatTimeout") * 1_000)
        let open = locks.filter(l => l.state === "open" || l.state === "unlocked");
        let closed = locks.filter(l => l.state === "locked" || l.state === "pin");
        let newLocks = LockStore.getInstance().getUnknownLocks();
        return { count: locks.length, alive: avail.length, open: open.length, closed: closed.length, new: newLocks.length };
    }*/

    private constructor() {
        const basePath = DataStore.getBasePath();

        const adapter = new FileSync(`${basePath}/db.json`);
        this.db = low(adapter);
        this.db.defaults(DataStore.defaults)
            .write();
    }
}
