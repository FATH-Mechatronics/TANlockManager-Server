export default class TanLock {
    public id: number;
    public ip: string;
    public name: string;
    public apiKey: string;
    public https: boolean;
    public accepted: boolean;
    public state: string;
    public heartbeat: number;
    public door_1: boolean;
    public useDoor_1: boolean;
    public door_2: boolean;
    public useDoor_2: boolean;

    constructor(identity: any = null) {
        this.ip = "";
        this.name = "";
        this.apiKey = "";
        this.https = false;
        this.accepted = false;
        this.state = "unknown";
        this.heartbeat = 0;
        this.door_1 = false;
        this.useDoor_1 = false;
        this.door_2 = false;
        this.useDoor_2 = false;
        if (identity != null) {
            Object.keys(identity).forEach((key) => {
                this[key] = identity[key];
            });
        }
    }

    public merge(identity: TanLock) {
        Object.keys(identity).forEach((key) => {
            this[key] = identity[key];
        });
    }

    public getBaseUrl(rootFolder = ''): string {
        return `http${this.https ? 's' : ''}://${this.ip}${rootFolder.length > 0 ? rootFolder : ''}${this.apiKey.length > 0 ? '/' : ''}${this.apiKey}`;
    }
}