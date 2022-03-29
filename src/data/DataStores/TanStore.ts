import DataStore from "../Datastore";
import LockStore from "./LockStore";
import TanLock from "../../model/TanLock";
import Tan from "../../model/Tan";
/*eslint-disable */
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
/*eslint-enable */

export default class TanStore {

    private tandb;
    private static instance: TanStore;

    private static tanDefaults = {
        tans: []
    };

    public static getInstance(): TanStore {
        if (!TanStore.instance) {
            console.log("GENERATE TAN STORE");
            TanStore.instance = new TanStore();
        }
        return TanStore.instance;
    }

    public getTans(): Tan[] {
        const tans: any[] = this.tandb.get("tans")
            .value();
        const clones: Tan[] = tans.map(c => {
            const a: Tan = new Tan(JSON.parse(JSON.stringify(c)));
            const lock = LockStore.getInstance().findLockById(c.lock);
            if (lock != null) {
                a.lock = lock;
            }
            return a;
        });
        return clones;
    }

    public findTanByNameAndLock(user: string, lock: TanLock): Tan|null {
        const found = this.tandb.get("users")
            .find({user, lock: lock.id})
            .value();
        if (found == undefined)
            return null;
        const foundClone = JSON.parse(JSON.stringify(found));
        foundClone.lock = LockStore.getInstance().findLockById(found.lock);
        return new Tan(foundClone);
    }

    public createTan(tan: Tan): boolean {
        if (this.findTanByNameAndLock(tan.user, tan.lock) == null) {
            this.tandb.get("tans").push(tan.slim()).write();
            return true;
        } else {
            return false;
        }
    }

    public deleteTan(tan: Tan) {
        return this.tandb.get("tans")
            .remove(tan.slim())
            .write();
    }

    public getNextTTL() {
        return this.getTans().reduce((min: Tan, tan: Tan) => {
            if (min === null) {
                min = tan;
            } else {
                if (min.ttl > tan.ttl) {
                    min = tan;
                }
            }
            return min;
        }, null);
    }

    private constructor() {
        const basePath = DataStore.getBasePath();
        const tanAdapter = new FileSync(`${basePath}/tans.json`);
        this.tandb = low(tanAdapter);
        this.tandb.defaults(TanStore.tanDefaults)
            .write();
    }
}
