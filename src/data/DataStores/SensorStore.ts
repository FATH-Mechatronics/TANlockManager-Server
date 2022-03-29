import DataStore from "../Datastore";
import TanLock from "../../model/TanLock";
/*eslint-disable */
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
/*eslint-enable */

export default class SensorStore {
    private db;
    private static instance: SensorStore;
    private static defaults = {
        version: 1,
        sensors: []
    };

    public getSensorsOfLock(lock: TanLock): { lock_id: number, val: any[] } | null {
        const found = this.db.get("sensors")
            .find({ lock_id: lock.id })
            .value();
        if (found == undefined)
            return null;
        return found;
    }

    public setSensors(lock: TanLock, val: any[]) {
        const found = this.getSensorsOfLock(lock);
        if (found === null) {
            this.db.get('sensors').push({ lock_id: lock.id, val }).write();
        } else {
            this.updateSensors(lock, val)
        }
    }

    private updateSensors(lock: TanLock, val: any[]) {
        this.db.get("sensors")
            .find({ lock_id: lock.id })
            .assign({ lock_id: lock.id, val })
            .write();
    }

    public static getInstance(): SensorStore {
        if (!SensorStore.instance) {
            SensorStore.instance = new SensorStore();
        }
        return SensorStore.instance;
    }

    private constructor() {
        const basePath = DataStore.getBasePath();

        const adapter = new FileSync(`${basePath}/sensors.json`);
        this.db = low(adapter);
        this.db.defaults(SensorStore.defaults)
            .write();
    }
}
