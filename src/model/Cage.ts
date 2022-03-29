import Permission from "./Permission";

export default class Cage {
    public id: number;
    public name = "dummy";
    public color = "#FFFFFF";

    constructor(identity: any = null) {
        this.name = "New CAGE";
        this.id = -1;
        this.color = "#FFFFFF";
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
