import TanLock from "./TanLock";

export default class LogEvent {
    lock_id: number;
    name: string;
    time: number;
    value: string;

    constructor(identity: LogEvent|null = null) {
        this.lock_id = -1;
        this.name = "";
        this.time = 0;
        this.value = "";
        if (identity != null) {
            Object.keys(identity).forEach((key) => {
                this[key] = identity[key];
            });
        }
    }

    public clone(): LogEvent {
        const c = JSON.parse(JSON.stringify(this));
        c.lock = new TanLock(c);
        return c;
    }
}