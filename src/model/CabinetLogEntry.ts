export default class CabinetLogEntry {
    lock_id: number;
    lock_name: string;
    time: number;
    end: number;
    type: string;
    event: string;
    value: any;

    constructor(identity: any = null) {
        if (identity != null) {
            Object.keys(identity).forEach((key) => {
                this[key] = identity[key];
            });
        }
    }
}