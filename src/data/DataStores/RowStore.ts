import DataStore from "../Datastore";
import Row from "../../model/Row";
import Cabinet from "../../model/Cabinet";

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

export default class RowStore {
    private db;
    private static instance: RowStore;
    private static defaults = {
        version: 1,
        rows: []
    };

    public getRows(): Row[] {
        return this.db.get("rows").value().map(r => new Row(r));
    }

    public getRowsOfCage(cage: number){
        return this.db.get("rows").filter({ cage_id: cage }).value().map(c => new Row(c));
    }

    public findRowById(id: number) {
        const row = this.db.get("rows")
            .find({ id })
            .value();
        if (row == undefined)
            return null;
        return new Row(row);
    }

    public addRow(row: Row): boolean | Row {
        const found = this.findRowById(row.id);
        if (found === null) {
            const search = this.db.get("rows").value();
            const rowIds = [-1];
            search.forEach(c => {
                rowIds.push(c.id);
            });
            const max = Math.max(...rowIds);
            row.id = max + 1;
            this.db.get("rows")
                .push(row)
                .write();
            return true;
        } else {
            return found;
        }
    }

    patchRow(id: number, options: any): Row | boolean | null {
        const foundRow = this.findRowById(id);
        if (id != options.id) {
            if (this.findRowById(options.id) != null)
                return false;
        }
        if (foundRow != null) {
            Object.keys(options).forEach((key) => {
                // @ts-ignore
                foundRow[key] = options[key];
            });
            return new Row(this.db.get("rows")
                .find({ id })
                .assign(foundRow)
                .write());
        }
        return null;
    }

    public deleteRow(id: number): Row {
        return new Row(this.db.get("rows")
            .remove({ id })
            .write());
    }
    public static getInstance(): RowStore {
        if (!RowStore.instance) {
            RowStore.instance = new RowStore();
        }
        return RowStore.instance;
    }

    private constructor() {
        const basePath = DataStore.getBasePath();

        const adapter = new FileSync(`${basePath}/rows.json`);
        this.db = low(adapter);
        this.db.defaults(RowStore.defaults)
            .write();
    }
}
