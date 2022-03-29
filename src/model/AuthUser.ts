import User from "./User";
import Role from "./Role";

export default class AuthUser {
    public user = "";
    public roles: string[] = []
    public permissions: string[] = [];

    constructor(identity: any = null) {
        if (identity != null) {
            Object.keys(identity).forEach((key) => {
                if (Object.keys(this).find(k => k == key)) {
                    this[key] = identity[key];
                }
            });
        }
    }

    public static ofUser(user: User):AuthUser {
        const auth: AuthUser = new AuthUser({ user: user.user, roles: user.roles.map(r => r.name) });
        auth.permissions = Role.combine(user.roles).map(p => p.permission);
        return auth;
    }

    public hasPermission(permission:string){
        if(this.permissions.filter(p=>permission===p).length > 0){
            return true;
        }
        if(permission.indexOf("#")>=0){
            const perm = permission.split("#")[1];
            return this.hasPermission(perm);
        }
        return false;
    }

    public clone(): AuthUser {
        return new AuthUser(this);
    }
}