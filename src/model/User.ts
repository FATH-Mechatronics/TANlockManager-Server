import Role from "./Role";
import Permission from "./Permission";

export default class User {
    public user: string = "";
    public pass: string | undefined = "";
    public roles: Role[] = [Role.USER_ROLE];

    constructor(identity: any = null) {
        if (identity != null) {
            Object.keys(identity).forEach((key) => {
                if (Object.keys(this).find(k => k == key)) {
                    this[key] = identity[key];
                }
            });
        }
    }

    public merge(identity: User) {
        Object.keys(identity).forEach((key) => {
            this[key] = identity[key];
        });
    }

    public cleaned(): User {
        const clone = this.clone();
        clone.pass = undefined;
        return clone;
    }

    public flat(): any {
        return {user: this.user, pass: this.pass, roles: this.roles.map(r => r.id)};
    }

    public hasPermission(permission: string) {
        if (this.getPermissions().filter(p => permission === p.permission).length > 0) {
            return true;
        }
        if (permission.indexOf("#") >= 0) {
            const perm = permission.split("#")[1];
            return this.hasPermission(perm);
        }
        return false;
    }

    public getPermissions(): Permission[] {
        return Role.combine(this.roles);
    }

    public clone(): User {
        const cloned = JSON.parse(JSON.stringify(this));
        return new User(cloned);
    }
}