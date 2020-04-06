import Permission from "./Permission";

export default class Role {
    public static ROOT_ROLE = new Role({id: 0, name: "ROOT_ROLE", permissions: Permission.getRootPermissions()});
    public static USER_ROLE = new Role({id: 1, name: "USER_ROLE", permissions: Permission.getUserPermissions()});

    id: number | null;
    name: string;
    permissions: Permission[];

    constructor(identity: any = null) {
        this.id = null;
        this.name = "";
        this.permissions = [];
        if (identity != null) {
            Object.keys(identity).forEach((key) => {
                if (key === "permissions" && identity[key].length > 0 && (typeof identity[key][0]) == "string") {
                    this[key] = identity[key].map(p => new Permission(p));
                } else {
                    this[key] = identity[key];
                }
            });
        }
    }

    public static combine(roles: Role[]): Permission[] {
        const perm: Permission[] = [];
        roles.forEach(role => {
            role.permissions.forEach(permission => {
                if (perm.filter(p => p.permission === permission.permission).length === 0) {
                    perm.push(permission);
                }
            });
        });
        return perm;
    }

    public slim(): { id: number | any, name: string, permissions: string[] } {
        const perm: string[] = this.permissions.map(p => {
            return p.permission;
        });
        return {
            id: this.id,
            name: this.name,
            permissions: perm
        };
    }

    public clone(): Role {
        const clone = new Role(this.slim());
        clone.permissions = clone.permissions.map((p: Permission) => {
            const oldP = this.permissions.find(originP => originP.permission === p.permission);
            if (oldP) {
                return oldP;
            }
            return p;
        })
        return clone;
    }
}