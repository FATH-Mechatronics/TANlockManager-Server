import DataStore from "../Datastore";
import User from "../../model/User";
import Role from "../../model/Role";
import LockStore from "./LockStore";
import Permission from "../../model/Permission";
import TanLock from "../../model/TanLock";
import CageStore from "./CageStore";
import Cage from "../../model/Cage";
import CabinetStore from "./CabinetStore";
import Cabinet from "../../model/Cabinet";

const low = require('lowdb');
const bcrypt = require('bcryptjs');
const FileSync = require('lowdb/adapters/FileSync');

const SALT_ROUNDS = 10;

export default class UserStore {

    private usersdb;
    private static instance: UserStore;

    private static userDefaults = {
        users: [{
            user: "root",
            pass: '$2a$10$vQVITo3HILLPw4oA2CNY1uv.bwNQkyIkzsC0EyAjqtmI/1Zrw2TeK',
            roles: [0]
        }],
        roles: [
            Role.ROOT_ROLE.slim(),
            Role.USER_ROLE.slim()
        ]
    };

    public static getInstance(): UserStore {
        if (!UserStore.instance) {
            UserStore.instance = new UserStore();
        }
        return UserStore.instance;
    }

    public getUsers() {
        const users: any[] = this.usersdb.get("users")
            .value();
        const usersClone = JSON.parse(JSON.stringify(users));
        return usersClone.map(u => {
            u.roles = this.getRoles(u.roles);
            return new User(u);
        });
    }

    public findUserByName(user: string): User | null {
        const found = this.usersdb.get("users")
            .find({user})
            .value();
        if (found == undefined)
            return null;
        const foundClone = JSON.parse(JSON.stringify(found));
        foundClone.roles = this.getRoles(found.roles);
        return new User(foundClone);
    }

    public createUser(user: User): boolean {
        if (this.findUserByName(user.user) == null) {
            user.pass = bcrypt.hashSync(user.pass, SALT_ROUNDS);
            this.usersdb.get("users").push(user).write();
            return true;
        } else {
            return false;
        }
    }

    public mergeUser(user: User): boolean {
        const oldUser = this.findUserByName(user.user);
        if (user.pass) {
            user.pass = bcrypt.hashSync(user.pass, SALT_ROUNDS);
        } else if (oldUser) {
            user.pass = oldUser.pass;
        }
        return this.usersdb.get("users")
            .find({user: user.user})
            .assign(user)
            .write();
    }

    public deleteUser(user: string) {
        return this.usersdb.get("users")
            .remove({user})
            .write();
    }

    public getRoles(roles: number[] | null = null): Role[] {
        const all: any[] = this.usersdb.get("roles")
            .value();
        if (roles == null) {
            return all.map(r => this.fillRole(r));
        }
        const filtered = all
            .filter(r => roles.indexOf(r.id) >= 0)
            .map(r => this.fillRole(r));
        return filtered;
    }

    public createRole(role: Role): Role {
        const search = this.usersdb.get("roles").value();
        const roleIds = [-1];
        search.forEach(l => {
            roleIds.push(l.id);
        });
        const max = Math.max(...roleIds);
        role.id = max + 1;
        const slimRole = role.slim();
        new Role(this.usersdb
            .get("roles")
            .push(slimRole)
            .write());
        return new Role(slimRole);
    }

    public deleteRole(id: number) {
        return new Role(
            this.usersdb
                .get("roles")
                .remove({id})
                .write());
    }

    public mergeRole(role: Role) {
        return new Role(this.usersdb
            .get("roles")
            .find({id: role.id})
            .assign(role.slim())
            .write());
    }

    public findRoleByName(name: string) {
        const found = this.usersdb.get("roles")
            .find({name})
            .value()
        if (found) {
            return this.fillRole(found);
        }
        return null;
    }

    private fillRole(role: any): Role {
        role.permissions = role.permissions.map(p => {
            if (typeof p == "object") {
                p = p.permission;
            }
            let split: string[] = p.split("#");
            if (split.length === 2) {
                const base = split[1];
                split = split[0].split("_");
                const type = split[0];
                const id = Number.parseInt(split[1]);
                switch (type) {
                    case "lock":
                        let lock: TanLock | any = LockStore.getInstance().findLockById(id);
                        if (lock == null) {
                            lock = {name: `Unknown_ID_${id}`};
                        }
                        return new Permission(p, `lock_${lock.name}#${base}`);
                    case "cage":
                        let cage: Cage | any = CageStore.getInstance().findCageById(id);
                        if (cage == null) {
                            cage = {name: `Unknown_ID_${id}`};
                        }
                        return new Permission(p, `cage_${cage.name}#${base}`);
                    case "cabinet":
                        let cabinet: Cabinet | any = CabinetStore.getInstance().findCabinetById(id);
                        if (cabinet == null) {
                            cabinet = {name: `Unknown_ID_${id}`};
                        }
                        return new Permission(p, `cabinet_${cabinet.name}#${base}`);
                }
            }
            return new Permission(p);
        });
        return new Role(role);
    }

    private constructor() {
        const basePath = DataStore.getBasePath();
        const userAdapter = new FileSync(`${basePath}/users.json`);
        this.usersdb = low(userAdapter);
        this.usersdb.defaults(UserStore.userDefaults)
            .write();
    }
}