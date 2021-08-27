import TanLock from "./TanLock";

export default class Tan {
    public user: string;
    pin: string; //Yes the Pin is needed for StdFw
    public note: string;
    public lock: TanLock;
    public ttl: number;

    constructor(identity: any = null) {
        this.user = "";
        this.pin = "";
        this.lock = new TanLock();
        this.ttl = 0;
        if (identity != null) {
            Object.keys(identity).forEach((key) => {
                this[key] = identity[key];
            });
        }
    }

    slim() {
        return { user: this.user, pin: this.pin, note: this.note, lock: this.lock.id, ttl: this.ttl };
    }
}
