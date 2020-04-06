import Permission from "./Permission";

export default class Cabinet {
    public id: number;
    public name: string;
    public order: number;
    public cage: number;
    public frontLock: number;
    public backLock: number;

    constructor(identity: any = null) {

        this.id = -1;
        this.name = "";
        this.order = 0;
        this.cage = -1;
        this.frontLock = -1;
        this.backLock = -1;

        if (identity != null) {
            Object.keys(identity).forEach((key) => {
                if (key === "cage" || key === "id" || key === "order") {
                    identity[key] = Number.parseInt(identity[key]);
                } else if (key === "permission") {
                    identity[key] = new Permission(identity[key]);
                }
                this[key] = identity[key];
            });
        }
    }
}