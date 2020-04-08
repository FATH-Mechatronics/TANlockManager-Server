import DataStore from "../Datastore";
import Cage from "../../model/Cage";
import Cabinet from "../../model/Cabinet";
import TanLock from "../../model/TanLock";

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

export default class CabinetStore {
    private db;
    private static instance: CabinetStore;
    private static defaults = {
        version: 1,
        cabinets: []
    };

    public getCabinets(): Cabinet[] {
        return this.db.get("cabinets").value().map(c => new Cabinet(c));
    }

    public getCabinetsOfRow(row: number): Cabinet[] {
        return this.db.get("cabinets").filter({ row_id: row }).value().map(c => new Cabinet(c));
    }

    public findCabinetById(id: number): Cabinet | null {
        const found = this.db.get('cabinets').find({ id }).value();
        if (found == undefined)
            return null;
        return new Cabinet(found);
    }

    public addCabinet(cabinet: Cabinet): boolean | Cabinet {
        const found = this.findCabinetById(cabinet.id);
        if (found === null) {
            const search = this.db.get("cabinets").value();
            const cabinetIds = [-1];
            search.forEach(c => {
                cabinetIds.push(c.id);
            });
            const max = Math.max(...cabinetIds);
            cabinet.id = max + 1;
            this.db.get('cabinets').push(cabinet).write();
            return true;
        } else {
            return found;
        }
    }

    public patchCabinet(id: number, options: any): Cabinet | boolean | null {
        const foundCabinet = this.findCabinetById(id);
        if (id != options.id) {
            if (this.findCabinetById(options.id) != null)
                return false;
        }
        if (foundCabinet != null) {
            Object.keys(options).forEach((key) => {
                // @ts-ignore
                foundCabinet[key] = options[key];
            });
            return new Cabinet(this.db.get("cabinets")
                .find({ id })
                .assign(foundCabinet)
                .write());
        }
        return null;
    }

    public deleteCabinet(id: number) {
        return new Cabinet(this.db.get("cabinets")
            .remove({ id })
            .write());
    }

    public findCabinetByLock(lock: TanLock) {
        return new Cabinet(this.db.get("cabinets")
            .find(c => c.frontLock === lock.ip || c.backLock === lock.ip)
            .value());
    }

    public static getInstance(): CabinetStore {
        if (!CabinetStore.instance) {
            CabinetStore.instance = new CabinetStore();
        }
        return CabinetStore.instance;
    }

    private constructor() {
        const basePath = DataStore.getBasePath();

        const adapter = new FileSync(`${basePath}/cabinets.json`);
        this.db = low(adapter);
        this.db.defaults(CabinetStore.defaults)
            .write();
    }
}
