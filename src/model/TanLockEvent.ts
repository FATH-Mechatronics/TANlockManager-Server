export default class TanLockEvent {
    // UNDEFINED
    public static GENERIC = "generic";
    // UNDEFINED
    public static HEARTBEAT = "heartbeat";
    // 2
    public static BOOT = "boot";
    // 3
    public static PINENTERING = "pinentering";
    // 4
    public static PINTIMEOUT = "pintimeout";
    // 5
    public static PINERROR = "pinerror";
    // 6
    public static UNLOCKING = "handle_unlocking";
    // 7
    public static LOCKING = "handle_locking";
    // 8
    public static OPENING = "handle_opening";
    // 9
    public static CLOSING = "handle_closing";
    // 10
    public static S1_OPEN = "dc1_open";
    // 11
    public static S1_CLOSE = "dc1_close";
    // 12
    public static S2_OPEN = "dc2_open";
    // 13
    public static S2_CLOSE = "dc2_close";
    // 14
    public static SUCCESS_LDAP = "successLDAP_AUTH";
    // 15
    public static SUCCESS_LOCAL = "successLOCAL_AUTH";
    // 16
    public static SUCCESS_MASTER = "successMASTER_AUTH";


    public static STD_EVENTS_ENUM = {
        HAL_LOCKED: (data) => {
            const lockState = data[0];
            return lockState ? TanLockEvent.LOCKING : TanLockEvent.UNLOCKING;
        },
        HAL_HANDLE: (data) => {
            const handleState = data[0];
            return handleState ? TanLockEvent.OPENING : TanLockEvent.CLOSING;
        },
        LAL_LOCKED: (data) => {
            const lockState = data[0];
            return lockState ? TanLockEvent.LOCKING : TanLockEvent.UNLOCKING;
        },
        LAL_HANDLE: (data) => {
            const handleState = data[0];
            return handleState ? TanLockEvent.OPENING : TanLockEvent.CLOSING;
        },
        EXT_CHANGED: (data) => {
            const id = data[0];
            const state = data[1];
            return `dc${id + 1}_${state ? "close" : "open"}`;
        },
        RELAIS_CHANGED: (data) => {
            const id = data[0];
            const state = data[1];
            return `r${id + 1}_${state ? "on" : "off"}`;
        },
        STARTUP: (data) => {
            return TanLockEvent.BOOT;
        },
        AUTH: (data) => {
            return TanLockEvent.SUCCESS_LOCAL;
        },
        MEDIUM_PRESENTED: () => {
            return TanLockEvent.GENERIC;
        },
        MEDIUM_INPUT: () => {
            return TanLockEvent.GENERIC;
        },
        LOCK_NOT_OPENED: () => {
            return `jammed`;
        },
        UPDATER: () => {
            return TanLockEvent.GENERIC;
        },
        UNKNOWN: () => {
            return TanLockEvent.GENERIC;
        }
    }
}
