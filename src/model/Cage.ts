import Cabinet from "./Cabinet";
import Permission from "./Permission";

export default class Cage {
    public name: string = "dummy";
    public id: number;
    public order: number;
    public gradient: string = "transparent";
    constructor(identity: any = null) {
        this.name = "New CAGE";
        this.id = -1;
        this.order = 0;
        this.gradient = "transparent";
        if (identity != null) {
            Object.keys(identity).forEach((key) => {
                if (key === "id" || key === "order") {
                    identity[key] = Number.parseInt(identity[key]);
                } else if (key === "permission") {
                    identity[key] = new Permission(identity[key]);
                }
                this[key] = identity[key];
            });
        }
    }
}