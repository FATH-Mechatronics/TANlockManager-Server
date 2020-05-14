import * as fs from 'fs';
import * as path from 'path';
import DataStore from './Datastore';
import Cabinet from '../model/Cabinet';
import CabinetLogEntry from '../model/CabinetLogEntry';

//TODO Currently Unused?
export default class SystemLogger {
    public static TYPEUSER = "user";
    public static TYPETANLOCK = "tanlock";
    public static TYPECAGE = "cage";
    public static TYPECABINET = "cabinet";

    public static ACTION_LOGIN = "login";
    public static ACTION_MODIFY = "modify";
    public static ACTION_OPEN = "open";
    public static ACTION_PREPAREOPEN = "prepareopen";

    public static BASEDIR = "systemlog";

    public static getLog(cabinet: Cabinet): CabinetLogEntry[] {
        const logFile = SystemLogger.getLogFilePath(cabinet);
        if (fs.existsSync(logFile)) {
            const log = JSON.parse(fs.readFileSync(logFile).toString());
            return log;
        } else {
            return [];
        }
    }

    public static appendLog(cabinet: Cabinet, logEntry: CabinetLogEntry): CabinetLogEntry[] {
        const log = this.getLog(cabinet);
        // set the end of an TANlock event
        if (logEntry.type == SystemLogger.TYPETANLOCK) {
            const last = log.findIndex((l: CabinetLogEntry) => l.end == null && l.type == logEntry.type && l.lock_id == logEntry.lock_id);
            if (last >= 0) {
                log[last].end = logEntry.time;
            }
        }
        log.push(logEntry);
        DataStore.mkdirRecursive(path.join(DataStore.getBasePath(), SystemLogger.BASEDIR));
        fs.writeFileSync(SystemLogger.getLogFilePath(cabinet), JSON.stringify(log));
        return log;
    }

    private static getLogFilePath(cabinet: Cabinet): string {
        return path.join(DataStore.getBasePath(), SystemLogger.BASEDIR, SystemLogger.getLogName(cabinet));
    }
    // cab{cabinetName}_{cabinetId}.json
    private static getLogName(cabinet: Cabinet): string {
        return `cab${cabinet.name}_${cabinet.id}.json`;
    }
}
