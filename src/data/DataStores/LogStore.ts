const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

import DataStore from "../Datastore";
import LogEvent from "../../model/LogEvent";
import TanLock from "../../model/TanLock";
import LockStore from "./LockStore";

export default class LogStore {
    private static instance: LogStore;
    private logdb;
    private static logdbDefaults = {
        version: 1,
        log: []
    };

    public static getInstance(): LogStore {
        if (!LogStore.instance) {
            LogStore.instance = new LogStore();
        }
        return LogStore.instance;
    }

    public getLogs(): LogEvent[] {
        const logs = this.logdb.get("log").value();
        if (logs)
            return logs;
        return [];
    }

    public addLog(lock: TanLock, value: string, time: number = new Date().getTime(), updateLock: boolean = false): any {
        if (updateLock)
            LockStore.getInstance().updateLockState(lock, value);
        const log = new LogEvent();
        log.lock_id = lock.id;
        log.name = lock.name;
        log.value = value;
        log.time = time;
        this.logdb.get("log")
            .push(log)
            .write();
        return log;
    }

    private constructor(){
        const basePath = DataStore.getBasePath();

        const logAdapter = new FileSync(`${basePath}/log.json`);
        this.logdb = low(logAdapter);
        this.logdb.defaults(LogStore.logdbDefaults)
            .write();
    }
}