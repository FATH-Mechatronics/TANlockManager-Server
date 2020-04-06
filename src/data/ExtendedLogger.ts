import * as fs from 'fs';
import * as path from 'path';
import DataStore from './Datastore';
import CabinetLogEntry from '../model/CabinetLogEntry';
import TanLock from '../model/TanLock';
import ExtendedLoggerType from "../model/ExtendedLoggerType";

export default class ExtendedLogger {
    public static BASEDIR = "extendedLog";
    private static __initDir = false;

    public static getLog(tanlock: TanLock): CabinetLogEntry[] {
        const logFile = ExtendedLogger.getLogFilePath(tanlock);
        if (fs.existsSync(logFile)) {
            const log = JSON.parse(fs.readFileSync(logFile).toString());
            return log;
        } else {
            return [];
        }
    }

    public static appendLog(tanlock: TanLock, logEntry: CabinetLogEntry): CabinetLogEntry[] {
        const log = this.getLog(tanlock);
        // set the end of an TANlock event
        if (logEntry.type == ExtendedLoggerType.TYPETANLOCK) {
            const last = log.findIndex((l: CabinetLogEntry) => l.end == null && l.type == logEntry.type && l.lock_id == logEntry.lock_id);
            if (last >= 0) {
                log[last].end = logEntry.time;
            }
        }
        log.push(logEntry);
        if (!ExtendedLogger.__initDir) {
            DataStore.mkdirRecursive(path.join(DataStore.getBasePath(), ExtendedLogger.BASEDIR));
            ExtendedLogger.__initDir = true;
        }
        fs.writeFileSync(ExtendedLogger.getLogFilePath(tanlock), JSON.stringify(log));
        return log;
    }

    private static getLogFilePath(tanlock: TanLock): string {
        return path.join(DataStore.getBasePath(), ExtendedLogger.BASEDIR, ExtendedLogger.getLogName(tanlock));
    }
    // cab{cabinetName}_{cabinetId}.json
    private static getLogName(tanlock: TanLock): string {
        return `lock${tanlock.name}_${tanlock.id}.json`;
    }
}
