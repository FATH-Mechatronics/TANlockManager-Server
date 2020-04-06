import RestServer from "../../server/Restserver";
import IRoute from "../IRoute";
import User from "../../model/User";
import UserStore from "../../data/DataStores/UserStore";
import AuthUser from "../../model/AuthUser";
import Permission from "../../model/Permission";
import {isError} from "util";
import Role from "../../model/Role";
import LockStore from "../../data/DataStores/LockStore";
import CageStore from "../../data/DataStores/CageStore";
import CabinetStore from "../../data/DataStores/CabinetStore";

const userstore: UserStore = UserStore.getInstance();
export default class PermissionDataRoute implements IRoute {
    public publicURLs(): string[] {
        return [];
    }

    public init(server: RestServer): void {
        server.app
            .get("/data/user", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.READ_SYSTEM_USER)) {
                    const users: User[] = userstore.getUsers();
                    res.send(users.map(u => u.cleaned())).end();
                } else {
                    res.status(403).end();
                }
            })
            .post("/data/user", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.WRITE_SYSTEM_USER)) {
                    const newUser = new User(req.body);
                    // LOGGING
                    res.send(userstore.createUser(newUser)).end();
                } else {
                    res.status(403).end();
                }
            })
            .put("/data/user/:username", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.WRITE_SYSTEM_USER)) {
                    const newUser = req.body;
                    res.send(userstore.mergeUser(newUser));
                } else {
                    res.status(403).end();
                }
            })
            .delete("/data/user/:username", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.WRITE_SYSTEM_USER)) {
                    res.send(userstore.deleteUser(req.params.username));
                }
            })
            .get("/data/permission", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.READ_SYSTEM_PERMISSION)) {
                    const permissions = Permission.allPermissions(
                        LockStore.getInstance().getLocks(),
                        CageStore.getInstance().getCages(),
                        CabinetStore.getInstance().getCabinets()
                    );
                    res.send(permissions).end();
                } else {
                    res.status(403).end();
                }
            })
            .get("/data/role", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.READ_SYSTEM_ROLE)) {
                    const roles = userstore.getRoles();
                    res.send(roles).end();
                } else {
                    res.status(403).end();
                }
            })
            .post("/data/role", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.WRITE_SYSTEM_ROLE)) {
                    const role: Role = new Role(req.body);
                    if (userstore.findRoleByName(role.name) != null) {
                        res.send(406).end();
                        return;
                    }
                    res.send(userstore.createRole(role)).end();
                } else {
                    res.status(403).end();
                }
            })
            .put("/data/role/:id", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.WRITE_SYSTEM_ROLE)) {
                    const role: Role = new Role(req.body);
                    res.send(userstore.mergeRole(role))
                } else {
                    res.status(403).end();
                }
            })
            .delete("/data/role/:id", (req, res) => {
                const user = req.user;
                if (!user) {
                    res.sendStatus(401);
                    return;
                }
                if (user.hasPermission(Permission.WRITE_SYSTEM_ROLE)) {
                    const id: number = Number.parseInt(req.params.id);
                    res.send(userstore.deleteRole(id)).end();
                } else {
                    res.status(403).end();
                }
            });
    }
}
