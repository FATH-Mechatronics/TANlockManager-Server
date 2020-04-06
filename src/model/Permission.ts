import TanLock from "./TanLock";
import Cabinet from "./Cabinet";
import Cage from "./Cage";

enum BasePermission {
    SYSTEM_AUTH,
    READ_SYSTEM_USER,
    WRITE_SYSTEM_USER,
    READ_SYSTEM_ROLE,
    WRITE_SYSTEM_ROLE,
    READ_SYSTEM_CONFIG,
    WRITE_SYSTEM_CONFIG,
    READ_SYSTEM_PERMISSION,
    READ_SYSTEM_LOG,

    READ_UNACCEPTED,
    WRITE_UNACCEPTED,

    READ_LOCK,  // LOCK_ID#
    WRITE_LOCK,
    PREPAREOPEN_LOCK,
    INPUT_LOCK,
    LOG_LOCK,
    LIVE_CAM_LOCK,
    SENSOR_LOCK,
    READ_TAN,
    WRITE_TAN,

    READ_LOG, // LOCK_ID#
    READ_LOG_USERS,
    READ_LOG_IMAGES,

    READ_CABINET, // CABIENT_ID#
    WRITE_CABINET,

    READ_CAGE, // CAGE_ID#
    WRITE_CAGE
}

export default class Permission {
    public static SYSTEM_AUTH: string = Permission.getBaseName(BasePermission.SYSTEM_AUTH);
    public static READ_SYSTEM_USER: string = Permission.getBaseName(BasePermission.READ_SYSTEM_USER);
    public static WRITE_SYSTEM_USER: string = Permission.getBaseName(BasePermission.WRITE_SYSTEM_USER);
    public static READ_SYSTEM_ROLE: string = Permission.getBaseName(BasePermission.READ_SYSTEM_ROLE);
    public static WRITE_SYSTEM_ROLE: string = Permission.getBaseName(BasePermission.WRITE_SYSTEM_ROLE);
    public static READ_SYSTEM_CONFIG: string = Permission.getBaseName(BasePermission.READ_SYSTEM_CONFIG);
    public static WRITE_SYSTEM_CONFIG: string = Permission.getBaseName(BasePermission.WRITE_SYSTEM_CONFIG);
    public static READ_SYSTEM_PERMISSION: string = Permission.getBaseName(BasePermission.READ_SYSTEM_PERMISSION);
    public static READ_SYSTEM_LOG: string = Permission.getBaseName(BasePermission.READ_SYSTEM_LOG);

    public static READ_UNACCEPTED: string = Permission.getBaseName(BasePermission.READ_UNACCEPTED);
    public static WRITE_UNACCEPTED: string = Permission.getBaseName(BasePermission.WRITE_UNACCEPTED);

    public static READ_LOCK: string = Permission.getBaseName(BasePermission.READ_LOCK);  // LOCK_ID#
    public static WRITE_LOCK: string = Permission.getBaseName(BasePermission.WRITE_LOCK);
    public static PREPAREOPEN_LOCK: string = Permission.getBaseName(BasePermission.PREPAREOPEN_LOCK);
    public static INPUT_LOCK: string = Permission.getBaseName(BasePermission.INPUT_LOCK);
    public static LOG_LOCK: string = Permission.getBaseName(BasePermission.LOG_LOCK); // TANlock Internal LOG
    public static LIVE_CAM_LOCK: string = Permission.getBaseName(BasePermission.LIVE_CAM_LOCK);
    public static SENSOR_LOCK: string = Permission.getBaseName(BasePermission.SENSOR_LOCK); // READ SENSORS
    public static READ_TAN: string = Permission.getBaseName(BasePermission.READ_TAN); // TAN MANAGEMENT
    public static WRITE_TAN: string = Permission.getBaseName(BasePermission.WRITE_TAN);

    public static READ_LOG: string = Permission.getBaseName(BasePermission.READ_LOG); // LOCK_ID#
    public static READ_LOG_USERS: string = Permission.getBaseName(BasePermission.READ_LOG_USERS);
    public static READ_LOG_IMAGES: string = Permission.getBaseName(BasePermission.READ_LOG_IMAGES);

    public static READ_CABINET: string = Permission.getBaseName(BasePermission.READ_CABINET); // CABIENT_ID#
    public static WRITE_CABINET: string = Permission.getBaseName(BasePermission.WRITE_CABINET);

    public static READ_CAGE: string = Permission.getBaseName(BasePermission.READ_CAGE); // CAGE_ID#
    public static WRITE_CAGE: string = Permission.getBaseName(BasePermission.WRITE_CAGE);

    permission: string;
    displayname: string;

    constructor(permission: string, displayname = permission) {
        this.permission = permission;
        this.displayname = displayname;
    }

    public static getUserPermissions(): Permission[] {
        return [new Permission(this.SYSTEM_AUTH)]
    }

    public static getRootPermissions(): Permission[] {
        const perm: Permission[] = [];
        for (const enumMember in BasePermission) {
            const isValueProperty = parseInt(enumMember, 10) >= 0
            if (isValueProperty) {
                perm.push(new Permission(BasePermission[enumMember]));
            }
        }
        return perm;
    }

    public static allPermissions(locks: TanLock[], cages: Cage[], cabinets: Cabinet[]): Permission[] {
        const perm: Permission[] = [];
        for (const enumMember in BasePermission) {
            const isValueProperty = parseInt(enumMember, 10) >= 0
            if (isValueProperty) {
                perm.push(new Permission(BasePermission[enumMember]));
            }
        }
        locks.forEach(l => {
            const base = `lock_${l.id}#`;
            const name = `lock_${l.name}#`;
            perm.push(
                new Permission(base + Permission.READ_LOCK, name + Permission.READ_LOCK),
                new Permission(base + Permission.WRITE_LOCK, name + Permission.WRITE_LOCK),
                new Permission(base + Permission.PREPAREOPEN_LOCK, name + Permission.PREPAREOPEN_LOCK),
                new Permission(base + Permission.INPUT_LOCK, name + Permission.INPUT_LOCK),
                new Permission(base + Permission.LOG_LOCK, name + Permission.LOG_LOCK),
                new Permission(base + Permission.LIVE_CAM_LOCK, name + Permission.LIVE_CAM_LOCK),

                new Permission(base + Permission.READ_LOG, name + Permission.READ_LOG),
                new Permission(base + Permission.READ_LOG_USERS, name + Permission.READ_LOG_USERS),
                new Permission(base + Permission.READ_LOG_IMAGES, name + Permission.READ_LOG_IMAGES)
            );
        });

        cages.forEach(c => {
            const base = `cage_${c.id}#`;
            const name = `cage_${c.name}#`;
            perm.push(
                new Permission(base + Permission.READ_CAGE, name + Permission.READ_CAGE),
                new Permission(base + Permission.WRITE_CAGE, name + Permission.WRITE_CAGE)
            );
        });

        cabinets.forEach(c => {
            const base = `cab_${c.id}#`;
            const name = `cab_${c.name}#`;
            perm.push(
                new Permission(base + Permission.READ_CABINET, name + Permission.READ_CABINET),
                new Permission(base + Permission.WRITE_CABINET, name + Permission.WRITE_CABINET)
            );
        });

        return perm;
    }

    private static getBaseName(perm: BasePermission): string {
        return BasePermission[perm];
    }
}