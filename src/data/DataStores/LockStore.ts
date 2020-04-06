import DataStore from "../Datastore";
import TanLock from "../../model/TanLock";
import TanLockEvent from "../../model/TanLockEvent";

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

export default class LockStore {
    private db;
    private static instance: LockStore;
    private static defaults = {
        version: 1,
        tanlocks: []
    };

    public updateLockState(lock: TanLock, value: string, isEvent: boolean = false): TanLock {
        let state = "unknown"

        if (isEvent) {
            switch (value) {
                case TanLockEvent.OPENING:
                    state = "open";
                    break;
                case TanLockEvent.UNLOCKING:
                case TanLockEvent.CLOSING:
                    state = "unlocked";
                    break;
                case TanLockEvent.PINENTERING:
                    state = "pin";
                    break;
                case TanLockEvent.LOCKING:
                case TanLockEvent.PINTIMEOUT:
                case TanLockEvent.PINERROR:
                    state = "locked";
                    break;
            }
        } else {
            state = value;
        }
        if (state !== "unknown") {
            return new TanLock(this.db.get("tanlocks")
                .find({ 'ip': lock.ip })
                .set("state", state)
                .write());
        }
        return lock;
    }

    public updateLockHeartBeat(ip: string | string[]) {
        return new TanLock(this.db.get("tanlocks")
            .find({ 'ip': ip })
            .set("heartbeat", new Date().getTime())
            .write());
    }

    public getLocks(): TanLock[] {
        const locks = this.db.get("tanlocks")
            .filter({ 'accepted': true })
            .value();
        if (locks)
            return locks.map(l => new TanLock(l));
        return [];
    }

    public getUnknownLocks(): TanLock[] {
        const locks = this.db.get("tanlocks")
            .filter({ 'accepted': false })
            .value()
        if (locks)
            return locks.map(l => new TanLock(l));
        return [];
    }

    public getAllLocks(): TanLock[] {
        const locks = this.db.get("tanlocks")
            .value()
        if (locks)
            return locks.map(l => new TanLock(l));
        return [];
    }

    public findLockByIp(ip: string | string[]): TanLock | null{
        if (Array.isArray(ip))
            ip = ip[0];
        const found = this.db.get("tanlocks")
            .find({ ip })
            .value();
        if (found == undefined)
            return null;
        return new TanLock(found);
    }

    public findLockById(id: number): TanLock | null {
        const found = this.db.get("tanlocks")
            .find({ id })
            .value();
        if (found == undefined)
            return null;
        return new TanLock(found);
    }

    public addUnknownLock(ip: string | string[]): TanLock | null {
        if (Array.isArray(ip))
            ip = ip[0];
        if (this.findLockByIp(ip) === null) {
            const lock: TanLock = new TanLock();
            const search = this.db.get("tanlocks").value();
            const lockIds = [-1];
            search.forEach(l => {
                lockIds.push(l.id);
            });
            const max = Math.max(...lockIds);
            lock.id = max+1;
            lock.ip = ip;
            lock.name = `NEW ${ip}`
            lock.apiKey = DataStore.getInstance().getConfig("tANlockApiKey");
            lock.https = DataStore.getInstance().getConfig("tANlockSSL");
            lock.state = "unknown";
            lock.accepted = DataStore.getInstance().getConfig("tANlockAutoAccept");
            lock.heartbeat = new Date().getTime();
            console.log(`Added Unknown TANlock ${lock.name}`);
            this.db.get('tanlocks')
                .push(lock)
                .write();
            return lock;
        }
        return null;
    }

    public addTanLock(lock: TanLock): boolean | TanLock {
        const foundLock = this.findLockByIp(lock.ip);
        if (foundLock === null) {
            const search = this.db.get("tanlocks").value();
            const lockIds = [-1];
            search.forEach(l => {
                lockIds.push(l.id);
            });
            const max = Math.max(...lockIds);
            lock.id = max+1;
            this.db.get('tanlocks')
                .push(lock)
                .write();
            return true;
        } else {
            return foundLock;
        }
    }

    public patchLock(id: number, options: any): TanLock | boolean | null{
        const foundLock = this.findLockById(id);
        if (foundLock != null) {
            if (foundLock.ip != options.ip) {
                if (this.findLockByIp(options.ip) != null)
                    return false;
            }
            Object.keys(options).forEach((key) => {
                // @ts-ignore
                foundLock[key] = options[key];
            });
            return new TanLock(this.db.get("tanlocks")
                .find({ id })
                .assign(foundLock)
                .write());
        }
        return null;
    }

    public deleteLock(id: number): TanLock {
        return new TanLock(this.db.get("tanlocks")
            .remove({ id })
            .write());
    }


    public static getInstance(): LockStore {
        if (!LockStore.instance) {
            LockStore.instance = new LockStore();
        }
        return LockStore.instance;
    }

    private constructor() {
        const basePath = DataStore.getBasePath();

        const adapter = new FileSync(`${basePath}/locks.json`);
        this.db = low(adapter);
        this.db.defaults(LockStore.defaults)
            .write();
    }
}