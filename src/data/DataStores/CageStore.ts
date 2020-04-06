import DataStore from "../Datastore";
import Cage from "../../model/Cage";

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

export default class CageStore {
    private db;
    private static instance: CageStore;
    private static defaults = {
        version: 1,
        cages: []
    };

    public getCages(): Cage[] {
        return this.db.get("cages").value().map(c => new Cage(c));
    }

    public findCageById(id: number) {
        const cage = this.db.get("cages")
            .find({ id })
            .value();
        if (cage == undefined)
            return null;
        return new Cage(cage);
    }

    public addCage(cage: Cage): boolean | Cage {
        const found = this.findCageById(cage.id);
        if (found === null) {
            const search = this.db.get("cages").value();
            const cageIds = [-1];
            search.forEach(c => {
                cageIds.push(c.id);
            });
            const max = Math.max(...cageIds);
            cage.id = max + 1;
            this.db.get("cages")
                .push(cage)
                .write();
            return true;
        } else {
            return found;
        }
    }

    patchCage(id: number, options: any): Cage | boolean | null {
        const foundCage = this.findCageById(id);
        if (id != options.id) {
            if (this.findCageById(options.id) != null)
                return false;
        }
        if (foundCage != null) {
            Object.keys(options).forEach((key) => {
                // @ts-ignore
                foundCage[key] = options[key];
            });
            return new Cage(this.db.get("cages")
                .find({ id })
                .assign(foundCage)
                .write());
        }
        return null;
    }

    public deleteCage(id: number): Cage {
        return new Cage(this.db.get("cages")
            .remove({ id })
            .write());
    }
    public static getInstance(): CageStore {
        if (!CageStore.instance) {
            CageStore.instance = new CageStore();
        }
        return CageStore.instance;
    }

    private constructor() {
        const basePath = DataStore.getBasePath();

        const adapter = new FileSync(`${basePath}/cages.json`);
        this.db = low(adapter);
        this.db.defaults(CageStore.defaults)
            .write();
    }
}