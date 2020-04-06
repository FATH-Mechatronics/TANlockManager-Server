import TanLock from "./TanLock";

export default class Tan {
    public user: string;
    public note: string;
    public lock: TanLock;
    public ttl: number;

    constructor(identity: any = null) {
        this.user = "";
        this.lock = new TanLock();
        this.ttl = 0;
        if (identity != null) {
            Object.keys(identity).forEach((key) => {
                this[key] = identity[key];
            });
        }
    }

    slim() {
        return { user: this.user, note: this.note, lock: this.lock.id, ttl: this.ttl };
    }
}