import * as fs from 'fs';
import * as path from 'path';
import DataStore from './Datastore';
import TanLock from '../model/TanLock';
import SensorLogEntry from '../model/SensorLogEntry';
import SensorEntry from '../model/SensorEntry';

export default class SensorLogger {
    public static TYPESENSOR = "sensor";
    public static TYPEALARM = "alarm";
    public static BASEDIR = "sensorlog";
    public static getLog(lock: TanLock): SensorLogEntry[] {
        const logFile = SensorLogger.getLogFilePath(lock);
        if (fs.existsSync(logFile)) {
            const log = JSON.parse(fs.readFileSync(logFile).toString());
            return log;
        } else {
            return [];
        }
    }

    public static appendLog(lock: TanLock, logEntry: SensorLogEntry): SensorLogEntry[] {
        const log = this.getLog(lock);

        // set the end of an ALARM event
        if (logEntry.type == SensorLogger.TYPEALARM) {
            const last = log.findIndex((l: SensorLogEntry) => l.end == null && l.type == logEntry.type);
            if (last >= 0) {
                log[last].end = logEntry.time;
            }
        }
        log.push(logEntry);
        DataStore.mkdirRecursive(path.join(DataStore.getBasePath(), SensorLogger.BASEDIR));
        fs.writeFileSync(SensorLogger.getLogFilePath(lock), JSON.stringify(log));
        return log;
    }

    public static setCurrentSensors(lock:TanLock, sensors: SensorEntry[]){
        // let current = this.getCurrentSensors(lock);
        DataStore.mkdirRecursive(path.join(DataStore.getBasePath(), SensorLogger.BASEDIR));
        fs.writeFileSync(SensorLogger.getCurrentFilePath(lock), JSON.stringify(sensors));
    }

    public static getCurrentSensors(lock:TanLock):SensorEntry[]{
        const currentFile = SensorLogger.getCurrentFilePath(lock);
        if (fs.existsSync(currentFile)) {
            const sensors = JSON.parse(fs.readFileSync(currentFile).toString());
            return sensors;
        } else {
            return [];
        }
    }

    private static getLogFilePath(lock: TanLock): string {
        return path.join(DataStore.getBasePath(), SensorLogger.BASEDIR, SensorLogger.getLogName(lock));
    }
    // sens{TANlockIp}_log.json
    private static getLogName(lock: TanLock): string {
        return `sens${lock.ip}_log.json`;
    }

    private static getCurrentFilePath(lock: TanLock): string {
        return path.join(DataStore.getBasePath(), SensorLogger.BASEDIR, SensorLogger.getCurrentName(lock));
    }
    // sens_current.json
    private static getCurrentName(lock: TanLock): string {
        return `sens${lock.ip}_current.json`;
    }
}